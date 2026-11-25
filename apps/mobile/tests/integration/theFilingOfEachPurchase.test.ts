import { join } from 'node:path';

import { base64Of, bodyHashOf, presentedSignatureIn, signatureVerifies } from '@emi/crypto';
import { renderRouter, waitFor } from 'expo-router/testing-library';

import { authorizeRequest } from '../../../../services/vault/src/auth/authorizer';
import type { ReachesTheAppStore } from '../../../../services/vault/src/payments/appStore';
import {
  fileTransactionFor,
  maximumFilingBodyBytes,
  storeSubscriptionPath,
} from '../../../../services/vault/src/payments/fileTransaction';
import { dynamoStore } from '../../../../services/vault/src/store/dynamo';
import {
  fakeAppStore,
  paidUntil,
  theCredential,
} from '../../../../services/vault/tests/fixtures/appStore';
import {
  fakeTable,
  type FakeTable,
  tableName,
} from '../../../../services/vault/tests/fixtures/dynamoTable';
import {
  anAccount,
  authorizedEvent,
  requestEvent,
  authorizerEvent,
} from '../../../../services/vault/tests/fixtures/requests';
import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { readSetting, settingKeys, writeSetting } from '../../src/data/settingRepository';
import { type DeviceKey, deviceKey, deviceKeyItem } from '../../src/services/sync/deviceKey';
import type { SendRequest, VaultRequest } from '../../src/services/sync/send';
import { theSettingTableHolds } from '../../src/services/store/theAnswerThePhoneHolds';
import {
  theEntitlementWhenSheOpens,
  watchForATransactionElsewhere,
} from '../../src/services/store/theEntitlementWhenSheOpens';
import {
  filesEachPurchase,
  THE_KEY_THE_FILING_IS_HELD_UNDER,
  theFilingPath,
  theFilingsTheRowKeeps,
  theFilingWaitsMilliseconds,
  theSettingTableHoldsTheFiling,
  type WhatTheFilingHolds,
} from '../../src/services/store/theFilingOfEachPurchase';
import { theMonthlyPlan, theYearlyPlan } from '../../src/services/store/theProducts';
import { theStoreOnThisPhone } from '../../src/services/store/theStoreOnThisPhone';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { openTestDatabase } from '../data/nodeDatabase';
import {
  aTransactionArrivesFromElsewhere,
  aTransactionTheStoreHolds,
  theStoreHoldsTheseTransactions,
  theStoreStartsAgain,
  theTransactionsStartAgain,
} from '../fixtures/expoIap';
import { resetExpoSecureStore, setItemAsync } from '../fixtures/expoSecureStore';
import { fixedRandom, memorySecureStore } from '../fixtures/secureStore';

/**
 * Contract PAY-3 from the phone's end: every transaction the App Store names reaches the server
 * once, signed by her device key, and the row on the phone says what is still owed.
 *
 * The App Store and the socket are doubles. The route behind that socket is the real one, over the
 * real authorizer and a table that refuses what DynamoDB refuses, so a body or a signature the
 * service would turn away fails here rather than passing against a double that shrugged.
 */

jest.mock('expo-iap', () => jest.requireActual('../fixtures/expoIap'));
jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

const sheOpensItAt = new Date('2026-11-25T09:00:00.000Z');
const aYear = 365 * 24 * 60 * 60 * 1000;
const now = (): Date => sheOpensItAt;
const address = 'https://vault.emi.test';

/** What Apple says the subscription runs to, which is never what the phone says. */
const theDateAppleGives = '2027-11-24T09:00:00.000Z';

const theTransactionOfHerPurchase = 'the-transaction-of-her-purchase';
const theTransactionOfHerRenewal = 'the-transaction-of-her-renewal';

/** Every request that left the phone, and the status the service answered it with. */
interface WhatTheVaultTook {
  readonly requests: VaultRequest[];
  readonly answers: number[];
  readonly send: SendRequest;
}

interface HerPhone {
  readonly keychain: ReturnType<typeof memorySecureStore>;
  readonly key: DeviceKey;
}

async function herPhone(seed = 7): Promise<HerPhone> {
  const keychain = memorySecureStore();

  return { keychain, key: await deviceKey(keychain, fixedRandom(seed)) };
}

/**
 * The socket, standing in for the one the platform gives, with the real filing route behind it.
 * The account is already on the table, because her device key registered it the day she installed.
 */
interface WhatTheVaultHolds {
  readonly table?: FakeTable;
  readonly apple?: ReachesTheAppStore;
  /** The clock the service reads. It is the phone's own, because a signature carries an instant. */
  readonly at?: () => Date;
}

async function theVaultBehindTheSender(
  key: DeviceKey,
  held: WhatTheVaultHolds = {},
): Promise<WhatTheVaultTook> {
  const table = held.table ?? fakeTable();
  const store = dynamoStore(table, tableName);
  const reaches =
    held.apple ?? fakeAppStore({ transactions: [paidUntil(theDateAppleGives)] }).reaches;
  const at = held.at ?? now;
  const requests: VaultRequest[] = [];
  const answers: number[] = [];

  await store.createAccount(anAccount(key, new Date(at().getTime() - aYear)));

  return {
    requests,
    answers,
    send: async (request) => {
      requests.push(request);

      const parts = {
        method: request.method,
        path: request.url.slice(address.length),
        body: request.body,
        instant: at(),
      };
      const allowed = await authorizeRequest(authorizerEvent(parts, request.headers), store, at());

      if (!allowed.isAuthorized) {
        answers.push(403);

        return { status: 403 };
      }

      const answered = await fileTransactionFor(
        authorizedEvent(requestEvent(parts, request.headers), allowed.context?.accountId ?? ''),
        {
          store,
          reaches,
          apiKey: () => Promise.resolve(theCredential),
          clock: at,
        },
      );

      answers.push(answered.statusCode);

      return { status: answered.statusCode };
    },
  };
}

/** A vault nothing reaches, which is a phone on a train. */
function aVaultWithNoNetwork(): WhatTheVaultTook {
  const requests: VaultRequest[] = [];

  return {
    requests,
    answers: [],
    send: (request) => {
      requests.push(request);

      return Promise.reject(new Error('there is no network here'));
    },
  };
}

/** A vault that answers one status and runs no route at all. */
function aVaultAnswering(status: number): WhatTheVaultTook {
  const requests: VaultRequest[] = [];
  const answers: number[] = [];

  return {
    requests,
    answers,
    send: (request) => {
      requests.push(request);
      answers.push(status);

      return Promise.resolve({ status });
    },
  };
}

function migrated(): Database {
  const database = openTestDatabase();

  migrate(database);

  return database;
}

/**
 * One launch, driven the way the application drives it: the store is read, the answer is held, and
 * every transaction it named goes to the filing.
 */
async function sheOpensEmi(
  database: Database,
  phone: { readonly keychain: Pick<ReturnType<typeof memorySecureStore>, 'read'> },
  vault: WhatTheVaultTook,
  itsAddress: string | null = address,
): Promise<void> {
  await theEntitlementWhenSheOpens(
    theStoreOnThisPhone,
    theSettingTableHolds(database),
    now,
    (these) =>
      filesEachPurchase(these, {
        holding: theSettingTableHoldsTheFiling(database),
        keychain: phone.keychain,
        send: vault.send,
        now,
        address: itsAddress,
      }),
  );
}

/** The watch, driven the same way, so a transaction from elsewhere reaches the filing. */
function sheLeavesEmiOpen(
  database: Database,
  phone: { readonly keychain: Pick<ReturnType<typeof memorySecureStore>, 'read'> },
  vault: WhatTheVaultTook,
): void {
  watchForATransactionElsewhere(theStoreOnThisPhone, theSettingTableHolds(database), now, (these) =>
    filesEachPurchase(these, {
      holding: theSettingTableHoldsTheFiling(database),
      keychain: phone.keychain,
      send: vault.send,
      now,
      address,
    }),
  );
}

function whatThePhoneIsFiling(database: Database): WhatTheFilingHolds {
  return theSettingTableHoldsTheFiling(database).read();
}

function theBodyOf(request: VaultRequest | undefined): Record<string, unknown> {
  return JSON.parse(request?.body ?? '{}') as Record<string, unknown>;
}

function aPurchaseOfTheYear(
  transaction = theTransactionOfHerPurchase,
): ReturnType<typeof aTransactionTheStoreHolds> {
  return aTransactionTheStoreHolds(theYearlyPlan.identifier, {
    id: transaction,
    transactionId: transaction,
    originalTransactionIdentifierIOS: theTransactionOfHerPurchase,
    expirationDateIOS: sheOpensItAt.getTime() + aYear,
    isAutoRenewing: true,
  });
}

describe('the phone files each purchase with the server', () => {
  beforeEach(() => {
    theStoreStartsAgain();
    theTransactionsStartAgain();
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  describe('the request one purchase makes', () => {
    it('goes once to the payments path of the vault, as a post', async () => {
      const phone = await herPhone();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(migrated(), phone, vault);

      expect(vault.requests).toHaveLength(1);
      expect(vault.requests[0]?.url).toBe(`${address}${storeSubscriptionPath}`);
      expect(vault.requests[0]?.method).toBe('POST');
      expect(theFilingPath).toBe(storeSubscriptionPath);
    });

    it('carries the identifier of that transaction, and nothing else in the body', async () => {
      const phone = await herPhone();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(migrated(), phone, vault);

      expect(theBodyOf(vault.requests[0])).toEqual({
        transactionId: theTransactionOfHerPurchase,
      });
    });

    it('carries a signature the service verifies, over that method, that path and that body', async () => {
      const phone = await herPhone();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(migrated(), phone, vault);

      const presented = presentedSignatureIn(vault.requests[0]?.headers ?? {});

      expect(presented?.accountId).toBe(phone.key.accountId);
      expect(presented?.instant).toBe(sheOpensItAt.toISOString());
      expect(presented?.bodyHash).toBe(bodyHashOf(vault.requests[0]?.body ?? ''));
      expect(
        signatureVerifies(presented as never, 'POST', theFilingPath, phone.key.publicKey),
      ).toBe(true);
    });

    it('is taken by the route, which answers her own account and nothing of anybody else', async () => {
      const phone = await herPhone();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(migrated(), phone, vault);

      expect(vault.answers).toEqual([200]);
    });

    it('sends a body well inside the size the route takes', async () => {
      const phone = await herPhone();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(migrated(), phone, vault);

      const bytes = new TextEncoder().encode(vault.requests[0]?.body ?? '').length;

      expect(bytes).toBeLessThanOrEqual(maximumFilingBodyBytes);
    });
  });

  describe('what the phone holds between two launches', () => {
    it('is held under a key that names no fact about her body', () => {
      expect(settingKeys).toContain(THE_KEY_THE_FILING_IS_HELD_UNDER);
    });

    it('holds nothing at all on a phone that met no transaction', async () => {
      const phone = await herPhone();
      const database = migrated();

      theStoreHoldsTheseTransactions([]);
      await sheOpensEmi(database, phone, await theVaultBehindTheSender(phone.key));

      expect(whatThePhoneIsFiling(database)).toEqual({
        pending: null,
        filed: [],
        refusedBecause: null,
      });
    });

    it('clears the pending identifier where the route took the filing', async () => {
      const phone = await herPhone();
      const database = migrated();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, await theVaultBehindTheSender(phone.key));

      expect(whatThePhoneIsFiling(database)).toEqual({
        pending: null,
        filed: [theTransactionOfHerPurchase],
        refusedBecause: null,
      });
    });

    it('still holds it as pending where the network was down', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault = aVaultWithNoNetwork();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, vault);

      expect(vault.requests).toHaveLength(1);
      expect(whatThePhoneIsFiling(database).pending).toBe(theTransactionOfHerPurchase);
      expect(whatThePhoneIsFiling(database).filed).toEqual([]);
    });

    it('files it on the next launch, where the network came back', async () => {
      const phone = await herPhone();
      const database = migrated();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, aVaultWithNoNetwork());

      const vault = await theVaultBehindTheSender(phone.key);

      await sheOpensEmi(database, phone, vault);

      expect(theBodyOf(vault.requests[0])).toEqual({
        transactionId: theTransactionOfHerPurchase,
      });
      expect(whatThePhoneIsFiling(database).pending).toBeNull();
      expect(whatThePhoneIsFiling(database).filed).toEqual([theTransactionOfHerPurchase]);
    });

    it('files it on the next launch even where the store itself cannot be read', async () => {
      const phone = await herPhone();
      const database = migrated();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, aVaultWithNoNetwork());

      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([]);
      await sheOpensEmi(database, phone, vault);

      expect(theBodyOf(vault.requests[0])).toEqual({
        transactionId: theTransactionOfHerPurchase,
      });
      expect(whatThePhoneIsFiling(database).pending).toBeNull();
    });

    it('files nothing again on a second notice of one transaction', async () => {
      const phone = await herPhone();
      const database = migrated();
      const table = fakeTable();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, await theVaultBehindTheSender(phone.key, { table }));

      const vault = await theVaultBehindTheSender(phone.key, { table });

      await sheOpensEmi(database, phone, vault);

      expect(vault.requests).toEqual([]);
    });

    it('files a renewal, because a renewal is a transaction of its own', async () => {
      const phone = await herPhone();
      const database = migrated();
      const table = fakeTable();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, await theVaultBehindTheSender(phone.key, { table }));

      const vault = await theVaultBehindTheSender(phone.key, { table });

      theStoreHoldsTheseTransactions([
        aPurchaseOfTheYear(),
        aPurchaseOfTheYear(theTransactionOfHerRenewal),
      ]);
      await sheOpensEmi(database, phone, vault);

      expect(theBodyOf(vault.requests[0])).toEqual({
        transactionId: theTransactionOfHerRenewal,
      });
      expect(whatThePhoneIsFiling(database).filed).toEqual([
        theTransactionOfHerPurchase,
        theTransactionOfHerRenewal,
      ]);
    });

    it('keeps the last fifty identifiers, so one setting value cannot grow for ever', async () => {
      const phone = await herPhone();
      const database = migrated();
      const alreadyFiled = Array.from(
        { length: theFilingsTheRowKeeps },
        (_one, at) => `filed-${at}`,
      );

      writeSetting(
        database,
        THE_KEY_THE_FILING_IS_HELD_UNDER,
        JSON.stringify({ pending: null, filed: alreadyFiled, refusedBecause: null }),
      );
      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, await theVaultBehindTheSender(phone.key));

      const filed = whatThePhoneIsFiling(database).filed;

      expect(filed).toHaveLength(theFilingsTheRowKeeps);
      expect(filed).not.toContain('filed-0');
      expect(filed[filed.length - 1]).toBe(theTransactionOfHerPurchase);
    });

    it('reads a row this version cannot understand as nothing filed at all', async () => {
      const phone = await herPhone();
      const database = migrated();

      writeSetting(database, THE_KEY_THE_FILING_IS_HELD_UNDER, '{"pending":17}');
      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);

      const vault = await theVaultBehindTheSender(phone.key);

      await sheOpensEmi(database, phone, vault);

      expect(theBodyOf(vault.requests[0])).toEqual({
        transactionId: theTransactionOfHerPurchase,
      });
    });
  });

  describe('a transaction that happens with nobody pressing anything', () => {
    it('is filed when it arrives from another device', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([]);
      sheLeavesEmiOpen(database, phone, vault);
      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await aTransactionArrivesFromElsewhere();

      expect(theBodyOf(vault.requests[0])).toEqual({
        transactionId: theTransactionOfHerPurchase,
      });
      expect(whatThePhoneIsFiling(database).filed).toEqual([theTransactionOfHerPurchase]);
    });

    it('is tried again on the next transaction, where the network was down for it', async () => {
      const phone = await herPhone();
      const database = migrated();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, aVaultWithNoNetwork());

      const vault = await theVaultBehindTheSender(phone.key);

      sheLeavesEmiOpen(database, phone, vault);
      await aTransactionArrivesFromElsewhere();

      expect(whatThePhoneIsFiling(database).pending).toBeNull();
      expect(whatThePhoneIsFiling(database).filed).toEqual([theTransactionOfHerPurchase]);
    });
  });

  describe('a refusal the phone cannot do anything about', () => {
    it('clears the identifier and keeps the reason where another account holds that purchase', async () => {
      const whoBoughtIt = await herPhone();
      const table = fakeTable();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(
        migrated(),
        whoBoughtIt,
        await theVaultBehindTheSender(whoBoughtIt.key, { table }),
      );

      const aSecondPhone = await herPhone(9);
      const database = migrated();
      const vault = await theVaultBehindTheSender(aSecondPhone.key, { table });

      await sheOpensEmi(database, aSecondPhone, vault);

      expect(vault.answers).toEqual([409]);
      expect(whatThePhoneIsFiling(database)).toEqual({
        pending: null,
        filed: [theTransactionOfHerPurchase],
        refusedBecause: 'anotherAccountHoldsIt',
      });
    });

    it('clears the identifier and keeps the reason where the store holds no such subscription', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault = await theVaultBehindTheSender(phone.key, {
        apple: fakeAppStore({ heldIn: 'nowhere' }).reaches,
      });

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, vault);

      expect(vault.answers).toEqual([400]);
      expect(whatThePhoneIsFiling(database)).toEqual({
        pending: null,
        filed: [theTransactionOfHerPurchase],
        refusedBecause: 'theStoreHoldsNoSuchSubscription',
      });
    });

    it('keeps it pending where Apple was not reached, because that one is worth trying again', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault = await theVaultBehindTheSender(phone.key, {
        apple: fakeAppStore({ refuses: { status: 500, body: '{}' } }).reaches,
      });

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, vault);

      expect(vault.answers).toEqual([502]);
      expect(whatThePhoneIsFiling(database).pending).toBe(theTransactionOfHerPurchase);
      expect(whatThePhoneIsFiling(database).refusedBecause).toBeNull();
    });

    it('is forgotten once a later filing is taken, because her account holds a subscription now', async () => {
      const phone = await herPhone();
      const database = migrated();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, aVaultAnswering(400));

      expect(whatThePhoneIsFiling(database).refusedBecause).toBe('theStoreHoldsNoSuchSubscription');

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear(theTransactionOfHerRenewal)]);
      await sheOpensEmi(database, phone, await theVaultBehindTheSender(phone.key));

      expect(whatThePhoneIsFiling(database).refusedBecause).toBeNull();
    });
  });

  describe('what a filing never touches', () => {
    it('leaves what the phone thinks she holds exactly as the store said it', async () => {
      const phone = await herPhone();
      const database = migrated();

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, await theVaultBehindTheSender(phone.key));

      const held = theSettingTableHolds(database).read();

      expect(held?.state).toBe('paid');
      expect(held?.until).toBe(new Date(sheOpensItAt.getTime() + aYear).toISOString());
      expect(held?.until).not.toBe(theDateAppleGives);
    });

    it('writes no transaction identifier anywhere a log reader can see it', async () => {
      const phone = await herPhone();
      const written: unknown[] = [];
      const kinds = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const spies = kinds.map((kind) =>
        jest.spyOn(console, kind).mockImplementation((...said: unknown[]) => {
          written.push(...said);
        }),
      );

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(migrated(), phone, aVaultWithNoNetwork());

      for (const spy of spies) {
        spy.mockRestore();
      }

      expect(
        written.filter((said) => JSON.stringify(said).includes(theTransactionOfHerPurchase)),
      ).toEqual([]);
    });

    it('sends nothing at all from a build that carries no vault address', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, phone, vault, null);

      expect(vault.requests).toEqual([]);
      expect(whatThePhoneIsFiling(database).pending).toBeNull();
    });

    it('files nothing for a transaction of a product Emi does not sell', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds('another.application.yearly', {
          id: 'a-transaction-of-another-application',
          transactionId: 'a-transaction-of-another-application',
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
        }),
      ]);
      await sheOpensEmi(database, phone, vault);

      expect(vault.requests).toEqual([]);
    });

    it('sends nothing where this phone holds no key to sign with', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault = await theVaultBehindTheSender(phone.key);

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);
      await sheOpensEmi(database, { keychain: memorySecureStore() }, vault);

      expect(vault.requests).toEqual([]);
      expect(whatThePhoneIsFiling(database).pending).toBe(theTransactionOfHerPurchase);
    });
  });

  describe('a vault that never answers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(sheOpensItAt);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('leaves the identifier pending once the wait is over, rather than waiting for ever', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault: WhatTheVaultTook = {
        requests: [],
        answers: [],
        send: () => new Promise(() => undefined),
      };

      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);

      const filing = sheOpensEmi(database, phone, vault);

      await jest.advanceTimersByTimeAsync(theFilingWaitsMilliseconds + 1);
      await filing;

      expect(whatThePhoneIsFiling(database).pending).toBe(theTransactionOfHerPurchase);
    });

    it('waits eight seconds, which is under the ten the api gives the function', () => {
      expect(theFilingWaitsMilliseconds).toBe(8000);
    });
  });

  describe('she opens Emi', () => {
    const addressWas = process.env.EXPO_PUBLIC_EMI_VAULT_URL;

    beforeEach(() => {
      process.env.EXPO_PUBLIC_EMI_VAULT_URL = address;
    });

    afterEach(() => {
      if (addressWas === undefined) {
        delete process.env.EXPO_PUBLIC_EMI_VAULT_URL;
      } else {
        process.env.EXPO_PUBLIC_EMI_VAULT_URL = addressWas;
      }
    });

    it('files the purchase the store holds, with nothing of it on screen', async () => {
      const phone = await herPhone();
      const vault = await theVaultBehindTheSender(phone.key, { at: () => new Date() });
      const fetchWas = global.fetch;

      await setItemAsync(deviceKeyItem, base64Of(phone.key.privateKey));
      global.fetch = (async (url: string, init: RequestInit) =>
        await vault.send({
          url,
          method: init.method ?? 'GET',
          headers: init.headers as Record<string, string>,
          body: init.body as string,
        })) as unknown as typeof fetch;
      theStoreHoldsTheseTransactions([aPurchaseOfTheYear()]);

      try {
        renderRouter(appDirectory, { initialUrl: '/' });

        const herPhoneDatabase = expoDatabase(openDatabaseSync(databaseFileName));

        await waitFor(() => {
          expect(readSetting(herPhoneDatabase, THE_KEY_THE_FILING_IS_HELD_UNDER)).toBeDefined();
        });

        await waitFor(() => {
          expect(vault.answers).toEqual([200]);
        });

        expect(theBodyOf(vault.requests[0])).toEqual({
          transactionId: theTransactionOfHerPurchase,
        });
        expect(theSettingTableHoldsTheFiling(herPhoneDatabase).read()).toEqual({
          pending: null,
          filed: [theTransactionOfHerPurchase],
          refusedBecause: null,
        });
      } finally {
        global.fetch = fetchWas;
      }
    });
  });

  describe('the plan the monthly transaction carries', () => {
    it('is filed the same way, because every plan is one subscription to the server', async () => {
      const phone = await herPhone();
      const database = migrated();
      const vault = await theVaultBehindTheSender(phone.key, {
        apple: fakeAppStore({
          transactions: [paidUntil(theDateAppleGives, { productId: theMonthlyPlan.identifier })],
        }).reaches,
      });

      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theMonthlyPlan.identifier, {
          id: 'the-transaction-of-her-month',
          transactionId: 'the-transaction-of-her-month',
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
        }),
      ]);
      await sheOpensEmi(database, phone, vault);

      expect(vault.answers).toEqual([200]);
      expect(whatThePhoneIsFiling(database).filed).toEqual(['the-transaction-of-her-month']);
    });
  });
});
