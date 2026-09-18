import { base64Of, openRecord, sealRecord } from '@emi/crypto';

import type { Database } from '../../src/data/database';
import { insertDayLog, readDayLog } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { expoKeychain } from '../../src/services/vault/keychain';
import {
  createVaultKey,
  phoneRandom,
  readVaultKey,
  vaultKey,
  VaultKeyError,
  vaultKeyItem,
} from '../../src/services/vault/vaultKey';
import { resetExpoSqlite } from '../data/expoSqlite';
import { itemsInTheKeychain, resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aDayRecord } from '../fixtures/dayRecord';
import { herDatabase } from '../fixtures/herPhone';
import { fixedRandom } from '../fixtures/secureStore';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));

const theDay = '2026-03-14';
const sheWroteAt = new Date('2026-03-14T21:05:00.000Z');
const whatSheWrote = aDayRecord({ day: theDay, note: 'the day she wrote before she reinstalled' });

/** Her phone, installed: an empty database and a keychain that holds whatever it held before. */
function theApplicationInstalled(): Database {
  const database = herDatabase();
  migrate(database);

  return database;
}

/** The platform deletes an application's database with the application. The keychain stays. */
function theApplicationDeleted(): void {
  resetExpoSqlite();
}

function sheLogsADay(database: Database, key: Uint8Array): Uint8Array {
  const payload = sealRecord(whatSheWrote, key, { random: fixedRandom(5) });
  insertDayLog(database, { day: theDay, payload, now: sheWroteAt });

  return payload;
}

function theDaySheSees(database: Database, key: Uint8Array): string {
  const row = readDayLog(database, theDay);
  if (!row) {
    throw new Error(`${theDay} was written and could not be read back`);
  }

  return openRecord(row.payload, key).note ?? '';
}

/** Every value in every table, as text, so a scan reads the database and not a list of columns. */
function everythingInTheDatabase(database: Database): string {
  const tables = database
    .all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .map((row) => row.name);

  const written = tables.flatMap((table) =>
    database
      .all<Record<string, unknown>>(`SELECT * FROM ${table}`)
      .flatMap((row) =>
        Object.values(row).map((value) =>
          value instanceof Uint8Array ? base64Of(value) : String(value),
        ),
      ),
  );

  return [...tables, ...written].join('\n');
}

describe('a second creation of the vault key is refused', () => {
  beforeEach(() => {
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  describe('her first run', () => {
    it('makes one key, puts it in the keychain, and seals the day she logs with it', async () => {
      const database = theApplicationInstalled();

      const key = await vaultKey(expoKeychain(), fixedRandom(4));
      sheLogsADay(database, key);

      expect(itemsInTheKeychain()).toEqual({ [vaultKeyItem]: base64Of(key) });
      expect(theDaySheSees(database, key)).toBe(whatSheWrote.note);
    });
  });

  describe('a second creation, on a phone that already holds one', () => {
    it('is refused, and the day she wrote still opens under the first key', async () => {
      const database = theApplicationInstalled();
      const keychain = expoKeychain();
      const key = await vaultKey(keychain, fixedRandom(4));
      sheLogsADay(database, key);

      const refused = await createVaultKey(keychain, fixedRandom(9)).catch(
        (error: unknown) => error,
      );

      expect(refused).toBeInstanceOf(VaultKeyError);
      expect((refused as VaultKeyError).refusal).toBe('vault-key-already-exists');
      expect(await readVaultKey(keychain)).toEqual(key);
      expect(theDaySheSees(database, key)).toBe(whatSheWrote.note);
    });

    it('leaves the keychain holding the one item it held before', async () => {
      theApplicationInstalled();
      const keychain = expoKeychain();
      const key = await vaultKey(keychain, fixedRandom(4));

      await createVaultKey(keychain, fixedRandom(9)).catch(() => undefined);

      expect(itemsInTheKeychain()).toEqual({ [vaultKeyItem]: base64Of(key) });
    });
  });

  describe('she deletes Emi and installs it again', () => {
    it('reads the same key back, so the day she wrote before still opens', async () => {
      const key = await vaultKey(expoKeychain(), fixedRandom(4));
      const payload = sheLogsADay(theApplicationInstalled(), key);

      theApplicationDeleted();

      const afterTheReinstall = await vaultKey(expoKeychain(), fixedRandom(9));
      const database = theApplicationInstalled();
      insertDayLog(database, { day: theDay, payload, now: sheWroteAt });

      expect(afterTheReinstall).toEqual(key);
      expect(theDaySheSees(database, afterTheReinstall)).toBe(whatSheWrote.note);
    });

    it('starts with an empty database, which is why the key is not kept in one', async () => {
      const database = theApplicationInstalled();
      const key = await vaultKey(expoKeychain(), fixedRandom(4));
      sheLogsADay(database, key);

      theApplicationDeleted();

      expect(readDayLog(theApplicationInstalled(), theDay)).toBeUndefined();
    });
  });

  describe('where the key is, and where it is not', () => {
    it('is in the keychain and in no table of the database', async () => {
      const database = theApplicationInstalled();

      const key = await vaultKey(expoKeychain(), fixedRandom(4));
      sheLogsADay(database, key);
      const stored = everythingInTheDatabase(database);

      expect(itemsInTheKeychain()[vaultKeyItem]).toBe(base64Of(key));
      expect(stored).toContain('day_log');
      expect(stored).not.toContain(base64Of(key));
      expect(stored).not.toContain(base64Of(key).slice(0, 16));
    });

    it('reaches no log line while the whole run happens', async () => {
      const said: unknown[] = [];
      const sinks = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const kept = sinks.map((sink) => [sink, console[sink]] as const);
      for (const sink of sinks) {
        console[sink] = (...parts: unknown[]) => said.push(...parts);
      }

      try {
        const database = theApplicationInstalled();
        const keychain = expoKeychain();
        const key = await vaultKey(keychain, fixedRandom(4));
        sheLogsADay(database, key);
        await createVaultKey(keychain, fixedRandom(9)).catch(() => undefined);
        theApplicationDeleted();
        await vaultKey(expoKeychain(), fixedRandom(9));
      } finally {
        for (const [sink, original] of kept) {
          console[sink] = original;
        }
      }

      expect(said).toEqual([]);
    });
  });

  describe('a runtime whose generator is not running', () => {
    it('refuses rather than sealing every day under a key of zeroes', async () => {
      theApplicationInstalled();

      const refused = await vaultKey(expoKeychain(), phoneRandom).catch((error: unknown) => error);

      expect(refused).toBeInstanceOf(VaultKeyError);
      expect((refused as VaultKeyError).refusal).toBe('random-source-returned-zeroes');
      expect(itemsInTheKeychain()).toEqual({});
    });
  });
});
