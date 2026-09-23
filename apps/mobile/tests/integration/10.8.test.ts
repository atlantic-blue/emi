import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { recordBytes } from '@emi/crypto';
import { renderRouter, screen } from 'expo-router/testing-library';

import type { Database, SqlValue } from '../../src/data/database';
import { readDayLog } from '../../src/data/dayLogRepository';
import { runTheLaunchPasses } from '../../src/data/launchPasses';
import { encryptPlainPayloads } from '../../src/data/migrations/004-encrypt-payloads';
import {
  moveCycleLengthIntoProfile,
  statedCycleLengthKey,
} from '../../src/data/migrations/006-cycle-length-into-profile';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { expoSqliteWritesInto, resetExpoSqlite } from '../data/expoSqlite';
import { nodeDatabase } from '../data/nodeDatabase';
import { aDayRecord } from '../fixtures/dayRecord';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herDatabase } from '../fixtures/herPhone';
import { herKeyIsInTheKeychain, herProfileVault, herVault } from '../fixtures/herVault';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/**
 * The database is a real file here, and every reading is taken from its bytes. A query cannot
 * answer this question: the table stops naming a row the moment it is removed, and the row is
 * still in the file.
 */

/** A word that is in nothing else, so a byte that matches it is a byte she wrote. */
const aWordSheWrote = 'hollyhock-lantern';

/**
 * The length she stated, sitting in the setting table as text. The key and the value are stored
 * beside each other in the row, so the two together are a reading that no other row can produce.
 */
const sheSaidHerCycleRuns = 37;
const herStatedLengthInThePlain = `${statedCycleLengthKey}${sheSaidHerCycleRuns}`;

/**
 * Days enough to carry the file past the page her rows start on. On a database of one page there
 * is nowhere for an old row to be left, so a smaller phone than this cannot tell a launch that
 * cleared the file from one that did nothing.
 */
const daysSheWrote = 400;

const sheWroteThemAt = new Date('2026-03-14T21:05:00.000Z');
const sheOpenedItAt = new Date('2026-03-20T09:00:00.000Z');

interface HerPhone {
  readonly database: Database;
  readonly path: string;
  readonly close: () => void;
}

/** Her vaults, which is what the launch is given once her key is in hand. */
function herVaults() {
  return { day: herVault(), profile: herProfileVault() };
}

/**
 * Her phone as the build before this one left it: days written in the plain bytes the envelope
 * later replaced, and the length she stated in the setting table beside them.
 */
function aPhoneTheOldBuildLeft(directory: string, journal: 'delete' | 'wal' = 'delete'): HerPhone {
  const path = join(directory, 'emi.db');
  const sqlite = new DatabaseSync(path);
  const database = nodeDatabase(sqlite);

  sqlite.exec(`PRAGMA journal_mode = ${journal}`);
  migrate(database);
  theOldBuildWrote(database);
  // A phone that has been running for months has long since folded its log into the file, so the
  // days it left are in the file itself and not waiting in a log beside it.
  sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');

  return { database, path, close: () => sqlite.close() };
}

/** What that build left in the tables, which is every answer of hers in plain text. */
function theOldBuildWrote(database: Database): void {
  for (let at = 0; at < daysSheWrote; at += 1) {
    plainDay(database, at);
  }
  database.run('INSERT INTO setting (key, value) VALUES (?, ?)', [
    statedCycleLengthKey,
    String(sheSaidHerCycleRuns),
  ]);
}

/** One day of hers, written the way a build with no envelope wrote it. */
function plainDay(database: Database, at: number): void {
  const day = dayNumber(at);

  database.run(
    `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at, deleted_at,
       synced_revision)
     VALUES (?, ?, ?, 1, ?, ?, NULL, NULL)`,
    [
      `01950000-0000-7000-8000-${String(at).padStart(12, '0')}`,
      day,
      recordBytes(
        aDayRecord({
          day,
          note: `${aWordSheWrote}-${at}`,
          recordedAt: sheWroteThemAt.toISOString(),
        }),
      ),
      sheWroteThemAt.toISOString(),
      sheWroteThemAt.toISOString(),
    ],
  );
}

/** Days running back from the first of a month, so each one is a date the table accepts. */
function dayNumber(at: number): string {
  const month = 1 + Math.floor(at / 28);
  const day = 1 + (at % 28);

  return `20${String(20 + Math.floor(month / 12)).padStart(2, '0')}-${String((month % 12) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** What the file says, read as bytes, with nothing between the test and the disk. */
function theFileHolds(path: string, reading: string): boolean {
  return readFileSync(path).includes(Buffer.from(reading));
}

/** The same database, with every statement it is given written down as it goes. */
function watched(database: Database): { readonly watching: Database; readonly said: string[] } {
  const said: string[] = [];

  return {
    said,
    watching: {
      execute: (sql: string): void => {
        said.push(sql);
        database.execute(sql);
      },
      run: (sql: string, parameters?: readonly SqlValue[]): void => {
        said.push(sql);
        database.run(sql, parameters);
      },
      all: <Row>(sql: string, parameters?: readonly SqlValue[]): Row[] => {
        said.push(sql);

        return database.all<Row>(sql, parameters);
      },
    },
  };
}

function rebuilds(said: readonly string[]): number {
  return said.filter((sql) => sql.includes('VACUUM')).length;
}

describe('after the upgrade her old plain answers are not in the database file', () => {
  let directory = '';

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'emi-launch-'));
  });

  afterEach(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  describe('a phone the build before this one left', () => {
    it('holds no word of the day she wrote once the launch has run', () => {
      const phone = aPhoneTheOldBuildLeft(directory);
      expect(theFileHolds(phone.path, aWordSheWrote)).toBe(true);

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(theFileHolds(phone.path, aWordSheWrote)).toBe(false);
      phone.close();
    });

    it('holds no plain copy of the length she stated', () => {
      const phone = aPhoneTheOldBuildLeft(directory);
      expect(theFileHolds(phone.path, herStatedLengthInThePlain)).toBe(true);

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(theFileHolds(phone.path, herStatedLengthInThePlain)).toBe(false);
      phone.close();
    });

    it('still opens every day she wrote, under her own key', () => {
      const phone = aPhoneTheOldBuildLeft(directory);

      const outcome = runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(outcome.days.sealed).toBe(daysSheWrote);
      const row = readDayLog(phone.database, dayNumber(0));
      expect(herVault().open(row?.payload ?? new Uint8Array()).note).toBe(`${aWordSheWrote}-0`);
      phone.close();
    });

    it('states the length she gave in her sealed profile afterwards', () => {
      const phone = aPhoneTheOldBuildLeft(directory);

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(readProfile(phone.database, herProfileVault())?.cycleLengthDays).toBe(
        sheSaidHerCycleRuns,
      );
      expect(phone.database.all('SELECT key FROM setting')).toEqual([]);
      phone.close();
    });
  });

  describe('the row a pass removes', () => {
    it('leaves the file as the pass removes it, before anything is rebuilt', () => {
      const phone = aPhoneTheOldBuildLeft(directory);

      moveCycleLengthIntoProfile(phone.database, herProfileVault(), sheOpenedItAt);

      expect(theFileHolds(phone.path, herStatedLengthInThePlain)).toBe(false);
      phone.close();
    });

    it('is written over after the day pass too, so a later delete leaves nothing behind', () => {
      const phone = aPhoneTheOldBuildLeft(directory);
      encryptPlainPayloads(phone.database, herVault(), sheOpenedItAt);

      phone.database.run('DELETE FROM setting WHERE key = ?', [statedCycleLengthKey]);

      expect(theFileHolds(phone.path, herStatedLengthInThePlain)).toBe(false);
      phone.close();
    });
  });

  describe('a launch with nothing to move', () => {
    it('does not rebuild the file, because a rebuild writes her whole history again', () => {
      const phone = aPhoneTheOldBuildLeft(directory);
      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);
      const second = watched(phone.database);

      const outcome = runTheLaunchPasses(second.watching, herVaults(), sheOpenedItAt);

      expect(outcome.fileRebuilt).toBe(false);
      expect(rebuilds(second.said)).toBe(0);
      phone.close();
    });

    it('rebuilds it once, not once for each pass, on the launch that moved something', () => {
      const phone = aPhoneTheOldBuildLeft(directory);
      const first = watched(phone.database);

      const outcome = runTheLaunchPasses(first.watching, herVaults(), sheOpenedItAt);

      expect(outcome.fileRebuilt).toBe(true);
      expect(rebuilds(first.said)).toBe(1);
      phone.close();
    });

    it('leaves the days it did not have to touch where they are', () => {
      const phone = aPhoneTheOldBuildLeft(directory);
      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);
      const sealed = readDayLog(phone.database, dayNumber(0));

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(readDayLog(phone.database, dayNumber(0))?.revision).toBe(sealed?.revision);
      phone.close();
    });
  });

  describe('a phone whose database keeps a write ahead log', () => {
    it('takes the old bytes out of the file rather than leaving them for a later launch', () => {
      const phone = aPhoneTheOldBuildLeft(directory, 'wal');
      expect(theFileHolds(phone.path, aWordSheWrote)).toBe(true);

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      // Read while the database is still open, which is how a phone reaches it: the application
      // never closes its database, and closing is the only other moment the log is folded back in.
      expect(theFileHolds(phone.path, aWordSheWrote)).toBe(false);
      expect(theFileHolds(phone.path, herStatedLengthInThePlain)).toBe(false);
      phone.close();
    });

    it('leaves nothing of hers in the log beside it', () => {
      const phone = aPhoneTheOldBuildLeft(directory, 'wal');

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(statSync(`${phone.path}-wal`).size).toBe(0);
      phone.close();
    });
  });

  describe('she opens the application for the first time on this build', () => {
    beforeEach(() => {
      resetExpoSqlite();
      resetExpoSecureStore();
      expoSqliteWritesInto(directory);
    });

    afterEach(() => {
      jest.useRealTimers();
      resetExpoSqlite();
    });

    it('reaches her home screen, and the file behind it holds neither plain answer', async () => {
      const path = await thePhoneTheApplicationOpens(directory);
      expect(theFileHolds(path, aWordSheWrote)).toBe(true);
      expect(theFileHolds(path, herStatedLengthInThePlain)).toBe(true);

      jest.useFakeTimers();
      jest.setSystemTime(sheOpenedItAt);
      await renderRouter(appDirectory, { initialUrl: '/' });

      expect(screen.getByTestId(homeScreenTestID)).toBeOnTheScreen();
      expect(theFileHolds(path, aWordSheWrote)).toBe(false);
      expect(theFileHolds(path, herStatedLengthInThePlain)).toBe(false);
    });
  });
});

/**
 * The same phone again, opened by name through the module the application opens it through, so the
 * launch under test is the one her own screens run and not one a test called.
 */
async function thePhoneTheApplicationOpens(directory: string): Promise<string> {
  const database = herDatabase();
  migrate(database);
  await herKeyIsInTheKeychain();
  theOldBuildWrote(database);
  writeSetting(database, 'firstRunCompletedAt', sheWroteThemAt.toISOString());
  // The tour runs before the questions, so a phone that answered them has been through it, and
  // without this she is sent to the first card and never reaches her home screen.
  writeSetting(database, 'tourSeenAt', sheWroteThemAt.toISOString());

  return join(directory, 'emi.db');
}
