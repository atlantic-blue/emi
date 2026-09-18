import { join } from 'node:path';

import { accountIdFor, base64Of, type DayRecord, sealRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { AuthorizerEvent, HttpRequestEvent } from '../../../../services/vault/src/api';
import { authorizeRequest } from '../../../../services/vault/src/auth/authorizer';
import { deleteAccountFor } from '../../../../services/vault/src/handlers/deleteAccount';
import { registerAccount } from '../../../../services/vault/src/handlers/register';
import { putRecordFor } from '../../../../services/vault/src/handlers/putRecord';
import { dynamoStore, partitionFor } from '../../../../services/vault/src/store/dynamo';
import {
  fakeTable,
  type FakeTable,
  tableName,
} from '../../../../services/vault/tests/fixtures/dynamoTable';
import {
  deleteActionTestID,
  deletedScreenTestID,
  deleteRefusedTestID,
  serverNotReachedTestID,
} from '../../src/features/settings/DeleteEverything';
import { settingsTestID } from '../../src/features/home/HomeScreen';
import { settingsDeleteTestID } from '../../src/features/settings/SettingsScreen';
import { settingsCopy } from '../../src/features/settings/copy';
import { deviceKey, type DeviceKey, deviceKeyItem } from '../../src/services/sync/deviceKey';
import { signRequestHeaders } from '../../src/services/sync/sign';
import { rowsHeld } from '../../src/services/vault/wipe';
import { resetExpoSqlite } from '../data/expoSqlite';
import { registrationBodyFor } from '../fixtures/registration';
import {
  itemsInTheKeychain,
  resetExpoSecureStore,
  setItemAsync,
  theKeychainRefusesToRemove,
} from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { fixedRandom, memorySecureStore } from '../fixtures/secureStore';
import { textIn } from '../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/**
 * The delete she presses, all the way through: her phone signs it with the key in its keychain, the
 * real authorizer lets it in, the real handler empties the partition, and the table is read back
 * item by item. Only the socket is a double, and it carries the bytes the phone wrote.
 *
 * The table is read rather than the answer, because a service reporting that it deleted something
 * is the one claim in this product that cannot check itself.
 */

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const herCycleLengthDays = 28;
const herPeriodDays = 4;
const herCycleCount = 6;
const herLastPeriodStarted = addDays(today, -13);

const address = 'https://vault.emi.test';
const herVaultKey = new Uint8Array(32).map((_, at) => (at * 11 + 3) % 256);

const recordIds: readonly string[] = [
  '019826c2-4d00-7a1b-8c3d-0f1e2a3b4c5d',
  '019826c2-4d00-7b2c-9d4e-1f2a3b4c5d6e',
  '019826c2-4d00-7c3d-8e5f-2a3b4c5d6e7f',
];

function herSixCycles(): DayRecord[] {
  return Array.from({ length: herCycleCount }, (_at, back) =>
    addDays(herLastPeriodStarted, -(herCycleCount - 1 - back) * herCycleLengthDays),
  ).flatMap((start) =>
    Array.from({ length: herPeriodDays }, (_unused, day) => aBleedingDay(addDays(start, day))),
  );
}

function eventFor(
  method: string,
  path: string,
  body: string,
  headers: Readonly<Record<string, string>>,
  accountId?: string,
): HttpRequestEvent {
  const [rawPath, rawQueryString] = path.split('?');

  return {
    rawPath: rawPath ?? path,
    rawQueryString: rawQueryString ?? '',
    headers,
    requestContext: {
      http: { method },
      ...(accountId === undefined ? {} : { authorizer: { lambda: { accountId } } }),
    },
    body,
    isBase64Encoded: false,
  };
}

function forTheAuthorizer(
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
): AuthorizerEvent {
  const event = eventFor(method, path, '', headers);

  return {
    rawPath: event.rawPath,
    rawQueryString: event.rawQueryString,
    headers: event.headers,
    requestContext: { http: event.requestContext.http },
  };
}

interface HerVaultAccount {
  readonly table: FakeTable;
  readonly key: DeviceKey;
}

/**
 * Her account on the server, with three of her days in it, made by the real register and put
 * handlers over a table that refuses what DynamoDB refuses.
 */
async function herAccountOnTheServer(): Promise<HerVaultAccount> {
  const table = fakeTable();
  const store = dynamoStore(table, tableName);
  const key = await deviceKey(memorySecureStore(), fixedRandom(5));
  const body = registrationBodyFor(key.publicKey);
  const registeredAt = new Date(whenSheOpensIt.getTime() - 60 * 60 * 1000);

  const registered = await registerAccount(
    eventFor(
      'POST',
      '/v1/accounts',
      body,
      signRequestHeaders(key, { method: 'POST', path: '/v1/accounts', body }, registeredAt),
    ),
    store,
    registeredAt,
  );

  expect(registered.statusCode).toBe(201);

  for (const [at, recordId] of recordIds.entries()) {
    const payload = sealRecord(
      { day: addDays(herLastPeriodStarted, at), recordedAt: whenSheOpensIt.toISOString() },
      herVaultKey,
      { random: (count) => new Uint8Array(count).map((_, byte) => (byte + at + 1) % 251) },
    );
    const recordBody = JSON.stringify({ revision: 1, payload: base64Of(payload) });
    const path = `/v1/records/${recordId}`;
    const at_ = new Date(registeredAt.getTime() + at * 1000);
    const headers = signRequestHeaders(key, { method: 'PUT', path, body: recordBody }, at_);
    const allowed = await authorizeRequest(forTheAuthorizer('PUT', path, headers), store, at_);

    expect(allowed.isAuthorized).toBe(true);

    const written = await putRecordFor(
      eventFor('PUT', path, recordBody, headers, allowed.context?.accountId),
      store,
      at_,
    );

    expect(written.statusCode).toBe(200);
  }

  // The same private key her phone will sign the delete with, in the keychain the application
  // reads, so the request the screen makes is signed by the account that exists on the server.
  await setItemAsync(deviceKeyItem, base64Of(key.privateKey));

  return { table, key };
}

/** Every request the phone sent, and the status the service answered each one with. */
interface Sent {
  readonly method: string;
  readonly url: string;
  readonly status: number;
}

/**
 * The socket, standing in for the one the platform gives. It runs the real authorizer and the real
 * handler over her table, so what crosses this boundary is a signed request and a status.
 */
function theVaultBehindFetch(account: HerVaultAccount, at: Date): Sent[] {
  const store = dynamoStore(account.table, tableName);
  const sent: Sent[] = [];

  global.fetch = (async (
    url: string,
    init: { method: string; headers: Record<string, string> },
  ) => {
    const path = url.slice(address.length);
    const allowed = await authorizeRequest(
      forTheAuthorizer(init.method, path, init.headers),
      store,
      at,
    );

    if (!allowed.isAuthorized) {
      sent.push({ method: init.method, url, status: 403 });

      return { status: 403 };
    }

    const answered = await deleteAccountFor(
      eventFor(init.method, path, '', init.headers, allowed.context?.accountId),
      store,
    );

    sent.push({ method: init.method, url, status: answered.statusCode });

    return { status: answered.statusCode };
  }) as unknown as typeof fetch;

  return sent;
}

/** Every item the table holds under her partition, as the table holds it. */
function itemsOnTheServer(account: HerVaultAccount): ReturnType<FakeTable['items']> {
  const partition = partitionFor(account.key.accountId);

  return account.table
    .items()
    .filter((item) => item.pk !== undefined && 'S' in item.pk && item.pk.S === partition);
}

/**
 * What her partition holds, by kind of item, so a case reads the shape of it rather than a count
 * that moves the day the seeding signs one more request.
 */
function whatTheServerHolds(account: HerVaultAccount): string[] {
  return itemsOnTheServer(account)
    .map((item) => (item.sk !== undefined && 'S' in item.sk ? item.sk.S : ''))
    .map((sortKey) => (sortKey.startsWith('SIG#') ? 'a remembered signature' : sortKey))
    .sort();
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheWalksToTheDeleteScreen(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await shePresses(settingsTestID);
  await shePresses(settingsDeleteTestID);
}

describe('after deleting, the table holds no item for that account', () => {
  let account: HerVaultAccount;
  let sent: Sent[];
  const addressWas = process.env.EXPO_PUBLIC_EMI_VAULT_URL;
  const fetchWas = global.fetch;

  beforeEach(async () => {
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    process.env.EXPO_PUBLIC_EMI_VAULT_URL = address;
    await herPhoneHolds(whenSheOpensIt, herSixCycles(), herCycleLengthDays);
    account = await herAccountOnTheServer();
    sent = theVaultBehindFetch(account, whenSheOpensIt);
  });

  afterEach(() => {
    global.fetch = fetchWas;
    if (addressWas === undefined) {
      delete process.env.EXPO_PUBLIC_EMI_VAULT_URL;
    } else {
      process.env.EXPO_PUBLIC_EMI_VAULT_URL = addressWas;
    }
    jest.restoreAllMocks();
  });

  describe('her account before she presses anything', () => {
    it('holds an account item and the three days her phone sent up', () => {
      expect(whatTheServerHolds(account)).toEqual([
        'META',
        ...recordIds.map((recordId) => `REC#${recordId}`),
        ...Array.from({ length: 4 }, () => 'a remembered signature'),
      ]);
      expect(accountIdFor(account.key.publicKey)).toBe(account.key.accountId);
    });

    it('is named on the screen that lists what goes, so she reads it before she presses', async () => {
      await sheWalksToTheDeleteScreen();

      expect(settingsCopy.delete.goes.join(' ')).toContain('server');
    });
  });

  describe('she presses delete once', () => {
    beforeEach(async () => {
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);
    });

    it('leaves no item under her account, read from the table rather than from the answer', () => {
      expect(itemsOnTheServer(account)).toEqual([]);
    });

    it('leaves no attribute of hers anywhere in the table at all', () => {
      expect(account.table.items()).toEqual([]);
    });

    it('sent one request, a delete of the account, and the service answered it', () => {
      expect(sent).toEqual([{ method: 'DELETE', url: `${address}/v1/account`, status: 200 }]);
    });

    it('emptied her phone in the same press, so both halves went together', () => {
      expect(rowsHeld(herDatabase())).toBe(0);
      expect(itemsInTheKeychain()).toEqual({});
    });

    it('leaves her reading that it is gone, with nothing about the server left to say', () => {
      expect(screen.getByTestId(deletedScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(serverNotReachedTestID)).toBeNull();
    });
  });

  describe('a read of her account after the delete', () => {
    it('is refused as an unknown account, with a signature that was good a moment before', async () => {
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      const store = dynamoStore(account.table, tableName);
      const later = new Date(whenSheOpensIt.getTime() + 1000);
      const headers = signRequestHeaders(
        account.key,
        { method: 'GET', path: '/v1/records' },
        later,
      );

      expect(
        await authorizeRequest(forTheAuthorizer('GET', '/v1/records', headers), store, later),
      ).toEqual({ isAuthorized: false });
    });
  });

  describe('a server she cannot reach', () => {
    beforeEach(() => {
      global.fetch = (() =>
        Promise.reject(new Error('there is no network here'))) as unknown as typeof fetch;
    });

    it('takes her days and her keys anyway, so the phone she holds is empty', async () => {
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      expect(rowsHeld(herDatabase())).toBe(0);
      expect(itemsInTheKeychain()).toEqual({});
    });

    it('tells her the copy up there was not reached, and that nothing can open it now', async () => {
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      expect(screen.getByTestId(deletedScreenTestID)).toBeTruthy();
      expect(textIn(screen.getByTestId(serverNotReachedTestID)).join(' ')).toBe(
        settingsCopy.deleted.withoutTheServer,
      );
    });

    it('leaves the account standing on the server, which is the honest half of that message', async () => {
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      expect(whatTheServerHolds(account)).toContain('META');
      for (const recordId of recordIds) {
        expect(whatTheServerHolds(account)).toContain(`REC#${recordId}`);
      }
    });
  });

  describe('a build with no vault address', () => {
    beforeEach(() => {
      delete process.env.EXPO_PUBLIC_EMI_VAULT_URL;
    });

    it('sends nothing, because a build with no address never made an account', async () => {
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      expect(sent).toEqual([]);
      expect(rowsHeld(herDatabase())).toBe(0);
    });

    it('says it is gone with nothing added about a server it never talked to', async () => {
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      expect(screen.getByTestId(deletedScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(serverNotReachedTestID)).toBeNull();
    });
  });

  describe('a phone that will not let go of a keychain item', () => {
    it('says the delete did not finish, even though the server took its half', async () => {
      theKeychainRefusesToRemove(deviceKeyItem);
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      expect(itemsOnTheServer(account)).toEqual([]);
      expect(screen.getByTestId(deleteRefusedTestID)).toBeTruthy();
      expect(screen.queryByTestId(deletedScreenTestID)).toBeNull();
      theKeychainRefusesToRemove(null);
    });
  });
});
