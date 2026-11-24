import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { accountIdFor, transactionDigestFor } from '@emi/crypto';

import type { HttpResponse } from '../src/api';
import type { ReachesTheAppStore } from '../src/payments/appStore';
import {
  statusIsExpired,
  statusIsInBillingRetry,
  statusIsInGracePeriod,
  statusIsRevoked,
  theAppleStore,
  theBundleIdentifier,
  theHalfPriceProduct,
  theMonthlyProduct,
  theProductsOnSale,
  tokenAlgorithm,
  tokenAudience,
  tokenLifetimeSeconds,
  theYearlyProduct,
} from '../src/payments/appStore';
import {
  fileTransactionFor,
  maximumFilingBodyBytes,
  storeSubscriptionPath,
  thatIsNoTransaction,
  thatPurchaseBelongsToAnotherAccount,
  theStoreHoldsNoSuchSubscription,
  nothingWasFiled,
} from '../src/payments/fileTransaction';
import { appStoreApiKeyParameter } from '../src/payments/appStoreSecrets';
import { stripeSecretKeyParameter } from '../src/payments/stripeSecrets';
import { type Item, dynamoStore, purchasePartitionFor } from '../src/store/dynamo';
import {
  anotherCredential,
  aTransactionId,
  fakeAppStore,
  paidUntil,
  theCredential,
  theOriginalTransactionId,
  type WhatTheStoreAnswers,
} from './fixtures/appStore';
import { fakeTable, type FakeTable, tableName } from './fixtures/dynamoTable';
import { anAccount, authorizedEvent, keyPairFromSeed, signedRequest } from './fixtures/requests';

/**
 * Contract PAY-3, the receipt checked on the server, and contract PAY-9, the pointer that gives one
 * purchase to one vault.
 *
 * Apple is the one thing outside the vault here, and it is a double. Everything else is the real
 * route, the real store and the real table: the item a case reads is the item the route wrote.
 */

const pair = keyPairFromSeed(21);
const accountId = accountIdFor(pair.publicKey);
const herPhone = keyPairFromSeed(22);
const herAccountId = accountIdFor(herPhone.publicKey);
const now = new Date('2026-11-24T10:00:00.000Z');
const aYearOn = '2027-11-24T09:00:00.000Z';

const repositoryRoot = resolve(__dirname, '..', '..', '..');

interface OneFiling {
  readonly answer: HttpResponse;
  readonly table: FakeTable;
  /** Every item the table held at the moment Apple was asked, which has to be none of them. */
  readonly heldWhenAppleWasAsked: Item[];
  readonly asked: () => string[];
  readonly claims: () => Readonly<Record<string, unknown>>[];
  readonly headers: () => Readonly<Record<string, unknown>>[];
}

interface WhatACaseDrives {
  readonly answers?: WhatTheStoreAnswers;
  /** The body, where a case wants one of its own rather than the identifier alone. */
  readonly body?: string;
  /** The credential the parameter answers with, where a case wants another one. */
  readonly credential?: string;
  /** Whose device key signs, and whose account the write lands on. */
  readonly signedBy?: ReturnType<typeof keyPairFromSeed>;
  /** A table a second filing carries on from, so two accounts meet one purchase. */
  readonly onThisTable?: FakeTable;
  /** Whether the authorizer allowed the request. */
  readonly authorized?: boolean;
}

/** One filing, driven through the real route against a table that already holds her account. */
async function aFiling(drives: WhatACaseDrives = {}): Promise<OneFiling> {
  const table = drives.onThisTable ?? fakeTable();
  const store = dynamoStore(table, tableName);
  const signedBy = drives.signedBy ?? pair;
  const appStore = fakeAppStore(drives.answers);
  const heldWhenAppleWasAsked: Item[] = [];

  if (drives.onThisTable === undefined) {
    await store.createAccount(anAccount(pair, now));
    await store.createAccount(anAccount(herPhone, now));
  }

  const reaches: ReachesTheAppStore = (address, asked) => {
    heldWhenAppleWasAsked.push(...table.items().filter((item) => !('publicKey' in item)));

    return appStore.reaches(address, asked);
  };

  const body = drives.body ?? JSON.stringify({ transactionId: aTransactionId });
  const { event } = signedRequest(signedBy, {
    method: 'POST',
    path: storeSubscriptionPath,
    body,
    instant: now,
  });
  const answer = await fileTransactionFor(
    drives.authorized === false ? event : authorizedEvent(event, accountIdFor(signedBy.publicKey)),
    {
      store,
      reaches,
      apiKey: () => Promise.resolve(drives.credential ?? theCredential),
      clock: () => now,
    },
  );

  return {
    answer,
    table,
    heldWhenAppleWasAsked,
    asked: () => appStore.environmentsAsked(),
    claims: () => appStore.calls().map((call) => appStore.claimsOf(call)),
    headers: () => appStore.calls().map((call) => appStore.headerOf(call)),
  };
}

const textOf = (value: Item[string] | undefined): string =>
  value !== undefined && 'S' in value ? value.S : '';

const numberOf = (value: Item[string] | undefined): number =>
  value !== undefined && 'N' in value ? Number(value.N) : Number.NaN;

/** The account item of one account, as the table holds it after the route ran. */
function accountItem(table: FakeTable, whose = accountId): Item {
  return table.items().find((item) => textOf(item.pk) === `ACC#${whose}`) ?? {};
}

/** The pointer item of one purchase, as the table holds it. */
function pointerItem(table: FakeTable, transactionId = theOriginalTransactionId): Item {
  const partition = purchasePartitionFor(transactionDigestFor(theAppleStore, transactionId));

  return table.items().find((item) => textOf(item.pk) === partition) ?? {};
}

const errorIn = (body: string): string => (JSON.parse(body) as { error?: string }).error ?? '';

const readBack = (answer: HttpResponse): Record<string, unknown> =>
  JSON.parse(answer.body) as Record<string, unknown>;

describe('a purchase in the App Store is filed by the phone and checked with Apple', () => {
  describe('Apple is asked before anything is written', () => {
    it('writes the date only after the answer, so the table is empty while the call is made', async () => {
      const filed = await aFiling();

      expect(filed.heldWhenAppleWasAsked).toEqual([]);
      expect(filed.answer.statusCode).toBe(200);
      expect(textOf(accountItem(filed.table).subscribedUntil)).toBe(aYearOn);
    });

    it('writes nothing at all when Apple does not answer', async () => {
      const filed = await aFiling({ answers: { refuses: { status: 500, body: '{}' } } });

      expect(filed.answer.statusCode).toBe(502);
      expect(errorIn(filed.answer.body)).toBe(nothingWasFiled);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
      expect(pointerItem(filed.table)).toEqual({});
    });

    it('writes nothing when the parameter holds no credential it can sign with', async () => {
      const filed = await aFiling({ credential: '' });

      expect(filed.answer.statusCode).toBe(502);
      expect(filed.asked()).toEqual([]);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
    });

    it('writes nothing when the credential is not the key Apple holds', async () => {
      const filed = await aFiling({ credential: anotherCredential });

      expect(filed.answer.statusCode).toBe(502);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
    });

    it('signs each call for this application, with the algorithm and the audience Apple takes', async () => {
      const filed = await aFiling();
      const claims = filed.claims()[0] ?? {};

      expect(filed.headers()[0]).toMatchObject({ alg: tokenAlgorithm, typ: 'JWT' });
      expect(claims).toMatchObject({ aud: tokenAudience, bid: theBundleIdentifier });
      expect(Number(claims.exp) - Number(claims.iat)).toBe(tokenLifetimeSeconds);
    });

    it('names the application the phone ships as, so Apple answers about Emi and nothing else', () => {
      const application = JSON.parse(
        readFileSync(join(repositoryRoot, 'apps/mobile/app.json'), 'utf8'),
      ) as { expo: { ios: { bundleIdentifier: string } } };

      expect(theBundleIdentifier).toBe(application.expo.ios.bundleIdentifier);
    });

    it('reads its credential from a parameter beside the Stripe names, and from no environment variable', () => {
      expect(appStoreApiKeyParameter).toMatch(/^\/emi\/payments\//);
      expect(appStoreApiKeyParameter).not.toBe(stripeSecretKeyParameter);
      expect(
        readFileSync(join(__dirname, '..', 'src/payments/appStoreSecrets.ts'), 'utf8'),
      ).not.toContain('process.env');
    });
  });

  describe('the date on her account', () => {
    it('is the instant Apple gave, and never the one the phone sent', async () => {
      const filed = await aFiling({
        body: JSON.stringify({
          transactionId: aTransactionId,
          subscribedUntil: '2099-01-01T00:00:00.000Z',
          expiresDate: 4070908800000,
          state: 'active',
        }),
      });

      expect(filed.answer.statusCode).toBe(200);
      expect(textOf(accountItem(filed.table).subscribedUntil)).toBe(aYearOn);
      expect(JSON.stringify(filed.table.items())).not.toContain('2099');
    });

    it('carries the store, the plan, the state and the instant the server asked', async () => {
      const item = accountItem((await aFiling()).table);

      expect(textOf(item.subscriptionStore)).toBe(theAppleStore);
      expect(textOf(item.subscriptionPlan)).toBe(theYearlyProduct);
      expect(textOf(item.subscriptionState)).toBe('active');
      expect(textOf(item.subscriptionTransaction)).toBe(theOriginalTransactionId);
      expect(textOf(item.subscriptionCheckedAt)).toBe(now.toISOString());
    });

    it('is ordered by the instant Apple signed, so a retried answer moves no date back', async () => {
      const filed = await aFiling();
      const again = await aFiling({
        onThisTable: filed.table,
        answers: {
          transactions: [
            paidUntil('2027-05-24T09:00:00.000Z', {
              signedDate: Date.parse('2026-11-01T09:00:00.000Z'),
            }),
          ],
        },
      });

      expect(again.answer.statusCode).toBe(200);
      expect(readBack(again.answer).written).toBe(false);
      expect(textOf(accountItem(again.table).subscribedUntil)).toBe(aYearOn);
    });

    it('moves forward on an answer Apple signed later', async () => {
      const filed = await aFiling();
      const again = await aFiling({
        onThisTable: filed.table,
        answers: {
          transactions: [
            paidUntil('2028-11-24T09:00:00.000Z', {
              signedDate: Date.parse('2027-11-24T09:00:00.000Z'),
            }),
          ],
        },
      });

      expect(readBack(again.answer).written).toBe(true);
      expect(textOf(accountItem(again.table).subscribedUntil)).toBe('2028-11-24T09:00:00.000Z');
    });

    it('reads a refund as refunded, at the instant Apple revoked it', async () => {
      const filed = await aFiling({
        answers: {
          transactions: [
            paidUntil(aYearOn, {
              status: statusIsRevoked,
              revocationDate: Date.parse('2026-11-20T11:00:00.000Z'),
            }),
          ],
        },
      });
      const item = accountItem(filed.table);

      expect(textOf(item.subscriptionState)).toBe('refunded');
      expect(textOf(item.subscribedUntil)).toBe('2026-11-20T11:00:00.000Z');
    });

    it('reads an expired subscription as lapsed, which is a date that has passed', async () => {
      const filed = await aFiling({
        answers: {
          transactions: [paidUntil('2026-10-24T09:00:00.000Z', { status: statusIsExpired })],
        },
      });

      expect(textOf(accountItem(filed.table).subscriptionState)).toBe('lapsed');
    });

    it('keeps a woman inside a billing retry writing, because a lapse is humane', async () => {
      const retrying = await aFiling({
        answers: { transactions: [paidUntil(aYearOn, { status: statusIsInBillingRetry })] },
      });
      const inGrace = await aFiling({
        answers: { transactions: [paidUntil(aYearOn, { status: statusIsInGracePeriod })] },
      });

      expect(textOf(accountItem(retrying.table).subscriptionState)).toBe('active');
      expect(textOf(accountItem(inGrace.table).subscriptionState)).toBe('active');
    });

    it('keeps the furthest date where she holds two plans at once', async () => {
      const filed = await aFiling({
        answers: {
          transactions: [
            paidUntil('2026-12-24T09:00:00.000Z', { productId: theMonthlyProduct }),
            paidUntil(aYearOn, { productId: theYearlyProduct }),
          ],
        },
      });
      const item = accountItem(filed.table);

      expect(textOf(item.subscribedUntil)).toBe(aYearOn);
      expect(textOf(item.subscriptionPlan)).toBe(theYearlyProduct);
    });

    it('holds no price, no country and nothing else Apple answered with', async () => {
      const item = accountItem((await aFiling()).table);

      expect(Object.keys(item).sort()).toEqual([
        'createdAt',
        'pk',
        'publicKey',
        'recordCount',
        'recoverySalt',
        'sk',
        'subscribedUntil',
        'subscriptionCheckedAt',
        'subscriptionEventAt',
        'subscriptionPlan',
        'subscriptionState',
        'subscriptionStore',
        'subscriptionTransaction',
        'wrappedVaultKey',
      ]);
      expect(numberOf(item.subscriptionEventAt)).toBe(
        Date.parse('2026-11-24T09:00:00.000Z') / 1000,
      );
    });
  });

  describe('the environment the transaction belongs to', () => {
    it('asks production first, and nothing else when production holds the transaction', async () => {
      const filed = await aFiling();

      expect(filed.asked()).toEqual(['Production']);
    });

    it('asks the sandbox only after production says it holds no such transaction', async () => {
      const filed = await aFiling({ answers: { heldIn: 'Sandbox' } });

      expect(filed.asked()).toEqual(['Production', 'Sandbox']);
      expect(filed.answer.statusCode).toBe(200);
      expect(textOf(accountItem(filed.table).subscribedUntil)).toBe(aYearOn);
    });

    it('refuses a production answer to a read of the sandbox, and writes nothing', async () => {
      const filed = await aFiling({
        answers: { heldIn: 'Sandbox', answersFor: 'Production' },
      });

      expect(filed.answer.statusCode).toBe(502);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
    });

    it('refuses a sandbox answer to a read of production, and writes nothing', async () => {
      const filed = await aFiling({ answers: { answersFor: 'Sandbox' } });

      expect(filed.answer.statusCode).toBe(502);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
    });

    it('refuses a transaction whose payload names the other environment', async () => {
      const filed = await aFiling({
        answers: { transactions: [paidUntil(aYearOn, { environment: 'Sandbox' })] },
      });

      expect(filed.answer.statusCode).toBe(400);
      expect(errorIn(filed.answer.body)).toBe(theStoreHoldsNoSuchSubscription);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
    });

    it('refuses a transaction no environment holds, having asked both of them', async () => {
      const filed = await aFiling({ answers: { heldIn: 'nowhere' } });

      expect(filed.asked()).toEqual(['Production', 'Sandbox']);
      expect(filed.answer.statusCode).toBe(400);
      expect(errorIn(filed.answer.body)).toBe(theStoreHoldsNoSuchSubscription);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
      expect(pointerItem(filed.table)).toEqual({});
    });

    it('refuses an answer that names no subscription this service can read', async () => {
      const filed = await aFiling({ answers: { transactions: [] } });

      expect(filed.answer.statusCode).toBe(400);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
    });

    it('refuses an answer about another application', async () => {
      const filed = await aFiling({ answers: { aboutTheApplication: 'blue.atlantic.other' } });

      expect(filed.answer.statusCode).toBe(400);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
    });
  });

  describe('one purchase pays for one vault', () => {
    it('claims the purchase under a digest, in an item holding her account and nothing else', async () => {
      const item = pointerItem((await aFiling()).table);

      expect(Object.keys(item).sort()).toEqual(['accountId', 'pk', 'sk']);
      expect(textOf(item.accountId)).toBe(accountId);
      expect(textOf(item.pk)).not.toContain(theOriginalTransactionId);
    });

    it('refuses a second account that files the same purchase', async () => {
      const first = await aFiling();
      const second = await aFiling({ onThisTable: first.table, signedBy: herPhone });

      expect(second.answer.statusCode).toBe(409);
      expect(errorIn(second.answer.body)).toBe(thatPurchaseBelongsToAnotherAccount);
    });

    it('leaves the second account with no date and the first account with hers', async () => {
      const first = await aFiling();
      const second = await aFiling({ onThisTable: first.table, signedBy: herPhone });

      expect(accountItem(second.table, herAccountId).subscribedUntil).toBeUndefined();
      expect(textOf(accountItem(second.table).subscribedUntil)).toBe(aYearOn);
      expect(textOf(pointerItem(second.table).accountId)).toBe(accountId);
    });

    it('lets the same account file its own purchase again, which is every launch', async () => {
      const first = await aFiling();
      const again = await aFiling({
        onThisTable: first.table,
        answers: {
          transactions: [
            paidUntil('2028-11-24T09:00:00.000Z', {
              signedDate: Date.parse('2027-11-24T09:00:00.000Z'),
            }),
          ],
        },
      });

      expect(again.answer.statusCode).toBe(200);
      expect(textOf(accountItem(again.table).subscribedUntil)).toBe('2028-11-24T09:00:00.000Z');
    });
  });

  describe('a product Emi does not sell', () => {
    it('is refused, and writes neither a date nor a pointer', async () => {
      const filed = await aFiling({
        answers: {
          transactions: [paidUntil(aYearOn, { productId: 'blue.atlantic.emi.lifetime' })],
        },
      });

      expect(filed.answer.statusCode).toBe(400);
      expect(errorIn(filed.answer.body)).toBe(theStoreHoldsNoSuchSubscription);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
      expect(pointerItem(filed.table)).toEqual({});
    });

    it('is refused even where she holds a product Emi does sell beside it', async () => {
      const filed = await aFiling({
        answers: {
          transactions: [
            paidUntil('2029-11-24T09:00:00.000Z', { productId: 'blue.atlantic.emi.lifetime' }),
            paidUntil(aYearOn, { productId: theHalfPriceProduct }),
          ],
        },
      });

      expect(textOf(accountItem(filed.table).subscriptionPlan)).toBe(theHalfPriceProduct);
      expect(textOf(accountItem(filed.table).subscribedUntil)).toBe(aYearOn);
    });

    it('knows the three products contract PAY-1 names, and no fourth', () => {
      const contracts = readFileSync(join(repositoryRoot, 'docs/contracts.md'), 'utf8');
      const named = [
        ...contracts
          .slice(contracts.indexOf('### PAY-1'), contracts.indexOf('### PAY-2'))
          .matchAll(/`(blue\.atlantic\.emi[a-z.]*)`/g),
      ].map((found) => found[1]);

      expect([...new Set(named)].sort()).toEqual([...theProductsOnSale].sort());
    });
  });

  describe('what the phone sends', () => {
    it('refuses a body carrying no transaction identifier', async () => {
      const filed = await aFiling({ body: JSON.stringify({ receipt: 'the-whole-receipt' }) });

      expect(filed.answer.statusCode).toBe(400);
      expect(errorIn(filed.answer.body)).toBe(thatIsNoTransaction);
      expect(filed.asked()).toEqual([]);
    });

    it('refuses an identifier that carries anything but the characters one is written in', async () => {
      const filed = await aFiling({
        body: JSON.stringify({ transactionId: '2000000845620001/../../etc' }),
      });

      expect(filed.answer.statusCode).toBe(400);
      expect(filed.asked()).toEqual([]);
    });

    it('refuses a body larger than the cap before it reads one field of it', async () => {
      const filed = await aFiling({
        body: JSON.stringify({ transactionId: aTransactionId, padding: 'x'.repeat(2048) }),
      });

      expect(filed.answer.statusCode).toBe(413);
      expect(filed.asked()).toEqual([]);
    });

    it('refuses a body that was changed after it was signed', async () => {
      const table = fakeTable();
      const store = dynamoStore(table, tableName);

      await store.createAccount(anAccount(pair, now));

      const { event } = signedRequest(pair, {
        method: 'POST',
        path: storeSubscriptionPath,
        body: JSON.stringify({ transactionId: aTransactionId }),
        instant: now,
      });
      const appStore = fakeAppStore();
      const answer = await fileTransactionFor(
        {
          ...authorizedEvent(event, accountId),
          body: JSON.stringify({ transactionId: theOriginalTransactionId }),
        },
        {
          store,
          reaches: appStore.reaches,
          apiKey: () => Promise.resolve(theCredential),
          clock: () => now,
        },
      );

      expect(answer.statusCode).toBe(403);
      expect(appStore.calls()).toEqual([]);
      expect(accountItem(table).subscribedUntil).toBeUndefined();
    });

    it('refuses a request the authorizer did not allow', async () => {
      const filed = await aFiling({ authorized: false });

      expect(filed.answer.statusCode).toBe(403);
      expect(filed.asked()).toEqual([]);
      expect(accountItem(filed.table).subscribedUntil).toBeUndefined();
    });

    it('tells her nothing about which check refused, and names no account', async () => {
      const filed = await aFiling({ authorized: false });

      expect(filed.answer.body).not.toContain(accountId);
      expect(filed.answer.body).not.toContain(aTransactionId);
    });

    it('answers the instant she is paid until, and nothing about the plan or the store', async () => {
      const read = readBack((await aFiling()).answer);

      expect(read).toEqual({ subscribedUntil: aYearOn, state: 'active', written: true });
      expect(JSON.stringify(read)).not.toContain(theYearlyProduct);
      expect(JSON.stringify(read)).not.toContain(theAppleStore);
    });

    it('is maximum one kilobyte of body, which is a transaction identifier and no receipt', () => {
      expect(maximumFilingBodyBytes).toBe(1024);
    });
  });
});
