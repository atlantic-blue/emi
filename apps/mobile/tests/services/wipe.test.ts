import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import type { ServerDelete, ServerDeleteOutcome } from '../../src/services/sync/deleteAccount';
import {
  deleteEverything,
  emptyTheDatabase,
  emptyTheKeychain,
  everyTable,
  nothingIsLeft,
  freePagesHeld,
  pagesHeld,
  rowsHeld,
  theServerCopyWentToo,
  wipedKeychainItems,
} from '../../src/services/vault/wipe';
import { nodeDatabase, openTestDatabase } from '../data/nodeDatabase';
import { memorySecureStore } from '../fixtures/secureStore';

/**
 * A database holding a setting and rows in a table nothing in Emi knows about yet.
 *
 * It is filled with enough rows to grow the file past its first few pages, because a delete on a
 * database small enough to fit in one page leaves nothing behind whatever it does, and a test on
 * one of those cannot tell a delete from a vacuum.
 */
function aPhoneWithASettingAndALaterTable(rows = 400) {
  const db = openTestDatabase();
  migrate(db);
  writeSetting(db, 'temperatureUnit', 'celsius');
  db.execute('CREATE TABLE a_later_migration (id TEXT NOT NULL PRIMARY KEY, kept BLOB) STRICT');

  for (let at = 0; at < rows; at += 1) {
    db.run('INSERT INTO a_later_migration (id, kept) VALUES (?, ?)', [
      String(at),
      new Uint8Array(200).fill(at % 255),
    ]);
  }

  return db;
}

/**
 * A word that appears nowhere else, so finding it in the file means finding what she wrote and
 * nothing else. The database is a real file here rather than one held in memory, because the
 * question is what the bytes on the disk still say after a delete.
 */
const aWordSheWrote = 'marmaladeSky';

/** A server that took the account, so a case about the phone is about the phone alone. */
const aServerThatTookIt: ServerDelete = () => Promise.resolve('gone');

/** A server that answers what it is told to, and says when it was asked. */
function aServerThatSays(outcome: ServerDeleteOutcome, asked: () => void = () => undefined) {
  return (): Promise<ServerDeleteOutcome> => {
    asked();

    return Promise.resolve(outcome);
  };
}

describe('the local delete', () => {
  describe('which tables it empties', () => {
    it('reads them out of the database rather than from a list written here', () => {
      const db = aPhoneWithASettingAndALaterTable();

      expect(everyTable(db)).toEqual([
        'a_later_migration',
        'cycle',
        'day_log',
        'profile',
        'setting',
      ]);
    });

    it('empties a table a later migration added, which a written list would have missed', () => {
      const db = aPhoneWithASettingAndALaterTable();

      expect(emptyTheDatabase(db)).toContain('a_later_migration');
      expect(rowsHeld(db)).toBe(0);
    });

    it('leaves the tables standing, so the application still opens afterwards', () => {
      const db = aPhoneWithASettingAndALaterTable();
      emptyTheDatabase(db);

      expect(everyTable(db)).toContain('day_log');
      expect(() => writeSetting(db, 'temperatureUnit', 'fahrenheit')).not.toThrow();
    });

    it('leaves no free page holding what it deleted, and gives the pages back', () => {
      const db = aPhoneWithASettingAndALaterTable();
      const before = pagesHeld(db);
      emptyTheDatabase(db);

      expect(freePagesHeld(db)).toBe(0);
      expect(pagesHeld(db)).toBeLessThan(before);
    });
  });

  describe('what the file still says afterwards', () => {
    let directory = '';

    beforeEach(() => {
      directory = mkdtempSync(join(tmpdir(), 'emi-wipe-'));
    });

    afterEach(() => {
      rmSync(directory, { force: true, recursive: true });
    });

    /** Four hundred rows carry the file past the page they start on, so there is somewhere for a
     * deleted row to be left behind. */
    function aFileHoldingWhatSheWrote(journal: 'delete' | 'wal'): {
      readonly db: Database;
      readonly path: string;
      readonly close: () => void;
    } {
      const path = join(directory, 'emi.db');
      const sqlite = new DatabaseSync(path);
      const db = nodeDatabase(sqlite);

      sqlite.exec(`PRAGMA journal_mode = ${journal}`);
      db.execute('CREATE TABLE a_later_migration (id TEXT NOT NULL PRIMARY KEY, kept TEXT) STRICT');

      for (let at = 0; at < 400; at += 1) {
        db.run('INSERT INTO a_later_migration (id, kept) VALUES (?, ?)', [
          String(at),
          `${aWordSheWrote}-${at}`,
        ]);
      }

      // A phone that has been running for months has long since folded its log into the file, and
      // a log still holding her rows is a question about the seeding rather than about the delete.
      sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');

      return { db, path, close: () => sqlite.close() };
    }

    it('holds no word she wrote, read from the bytes rather than through a query', () => {
      const phone = aFileHoldingWhatSheWrote('delete');
      expect(readFileSync(phone.path).includes(Buffer.from(aWordSheWrote))).toBe(true);

      emptyTheDatabase(phone.db);

      expect(readFileSync(phone.path).includes(Buffer.from(aWordSheWrote))).toBe(false);
      phone.close();
    });

    it('holds none of it on a phone that keeps a write ahead log either', () => {
      const phone = aFileHoldingWhatSheWrote('wal');
      expect(readFileSync(phone.path).includes(Buffer.from(aWordSheWrote))).toBe(true);

      emptyTheDatabase(phone.db);

      // Read while the database is still open, because the application never closes its own, and
      // a log that has not been folded back leaves every word of hers in the file behind it.
      expect(readFileSync(phone.path).includes(Buffer.from(aWordSheWrote))).toBe(false);
      phone.close();
    });
  });

  describe('which keychain items it removes', () => {
    it('asks for every one of them, whether this phone held it or not', async () => {
      const store = memorySecureStore({ [wipedKeychainItems[0] as string]: 'held' });

      await deleteEverything(aPhoneWithASettingAndALaterTable(), store, aServerThatTookIt);

      expect(store.removals()).toEqual([...wipedKeychainItems]);
      expect(store.items()).toEqual({});
    });

    it('names four items, one for each the design keeps in the keychain', () => {
      expect(new Set(wipedKeychainItems).size).toBe(4);
    });
  });

  describe('a keychain that refuses an item', () => {
    /** A keychain that holds on to one item, which is what a platform error looks like from here. */
    function aKeychainThatKeeps(kept: string) {
      const store = memorySecureStore();

      return {
        store,
        remover: {
          remove: async (key: string) => {
            if (key === kept) {
              throw new Error('the platform would not remove this item');
            }
            await store.remove(key);
          },
        },
      };
    }

    it('still removes every other item rather than stopping at the first refusal', async () => {
      const theKeptOne = wipedKeychainItems[1] as string;
      const { remover } = aKeychainThatKeeps(theKeptOne);

      const outcome = await emptyTheKeychain(remover);

      expect(outcome.refused).toEqual([theKeptOne]);
      expect(outcome.removed).toEqual(wipedKeychainItems.filter((item) => item !== theKeptOne));
    });

    it('reports a delete that did not finish, so nothing can say it is gone', async () => {
      const theKeptOne = wipedKeychainItems[1] as string;
      const { remover } = aKeychainThatKeeps(theKeptOne);

      const outcome = await deleteEverything(
        aPhoneWithASettingAndALaterTable(),
        remover,
        aServerThatTookIt,
      );

      expect(outcome.rowsLeft).toBe(0);
      expect(outcome.keychainItemsRefused).toEqual([theKeptOne]);
      expect(nothingIsLeft(outcome)).toBe(false);
    });

    it('reports a finished delete when nothing refused', async () => {
      const outcome = await deleteEverything(
        aPhoneWithASettingAndALaterTable(),
        memorySecureStore(),
        aServerThatTookIt,
      );

      expect(nothingIsLeft(outcome)).toBe(true);
    });
  });

  describe('the account on the server', () => {
    it('is asked for before a single row or item of hers has gone', async () => {
      const db = aPhoneWithASettingAndALaterTable();
      const store = memorySecureStore({ [wipedKeychainItems[0] as string]: 'held' });
      let heldWhenAsked = { rows: -1, items: -1 };

      await deleteEverything(
        db,
        store,
        aServerThatSays('gone', () => {
          heldWhenAsked = {
            rows: rowsHeld(db),
            items: Object.keys(store.items()).length,
          };
        }),
      );

      expect(heldWhenAsked).toEqual({ rows: 401, items: 1 });
    });

    it('carries what the server said back with the rest of the outcome', async () => {
      const outcome = await deleteEverything(
        aPhoneWithASettingAndALaterTable(),
        memorySecureStore(),
        aServerThatSays('no-account'),
      );

      expect(outcome.serverAccount).toBe('no-account');
      expect(theServerCopyWentToo(outcome)).toBe(true);
    });

    it('takes her days anyway when it could not be reached, and says the copy is not accounted for', async () => {
      const store = memorySecureStore({ [wipedKeychainItems[0] as string]: 'held' });
      const outcome = await deleteEverything(
        aPhoneWithASettingAndALaterTable(),
        store,
        aServerThatSays('not-reached'),
      );

      expect(outcome.rowsLeft).toBe(0);
      expect(store.items()).toEqual({});
      expect(nothingIsLeft(outcome)).toBe(true);
      expect(theServerCopyWentToo(outcome)).toBe(false);
    });

    it('takes her days anyway when the call raises, rather than stopping on it', async () => {
      const db = aPhoneWithASettingAndALaterTable();
      const outcome = await deleteEverything(db, memorySecureStore(), () =>
        Promise.reject(new Error('there is no network here')),
      );

      expect(rowsHeld(db)).toBe(0);
      expect(outcome.serverAccount).toBe('not-reached');
      expect(nothingIsLeft(outcome)).toBe(true);
    });
  });

  describe('what it reports back', () => {
    it('counts the rows and the pages left by reading the database, never by assuming', async () => {
      const db = aPhoneWithASettingAndALaterTable();
      const before = pagesHeld(db);
      const outcome = await deleteEverything(db, memorySecureStore(), aServerThatTookIt);

      expect(outcome.rowsLeft).toBe(0);
      expect(outcome.freePagesLeft).toBe(0);
      expect(outcome.pagesLeft).toBeLessThan(before);
      expect(outcome.tables).toContain('day_log');
      expect(outcome.keychainItems).toEqual([...wipedKeychainItems]);
      expect(outcome.keychainItemsRefused).toEqual([]);
    });
  });
});
