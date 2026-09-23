import { join } from 'node:path';

import { type ProfileRecord, profileKeys, recordKeys } from '@emi/crypto';
import { renderRouter, screen } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import {
  moveCycleLengthIntoProfile,
  statedCycleLengthKey,
} from '../../src/data/migrations/006-cycle-length-into-profile';
import { profileRow, readProfile, writeProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { settingKeys, writeSetting } from '../../src/data/settingRepository';
import { logDay } from '../../src/features/cycle/rebuild';
import { learningStatedLengthTestID } from '../../src/features/forecast/Learning';
import { statedCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { everythingIn } from '../../src/features/export/everything';
import { labelOf, readableHtml } from '../../src/features/export/readableDocument';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, herDatabase } from '../fixtures/herPhone';
import { herKeyIsInTheKeychain, herProfileVault, herVault } from '../fixtures/herVault';
import { aProfileRecord } from '../fixtures/profileRecord';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/**
 * The length she gave at her first run. It is not 28, the length the first run offers, so a number
 * that reads back as 31 can only have come from her own answer.
 */
const sheSaidHerCycleRuns = 31;

const herPeriodStarted = '2026-03-14';
const sheAnsweredAt = new Date('2026-03-14T21:05:00.000Z');
const sheOpenedItAt = new Date('2026-03-20T09:00:00.000Z');
const sheUpgradedAt = new Date('2026-03-20T09:00:01.000Z');

/**
 * Her phone as the build before this one left it: the day she bled sealed under her key, and the
 * length she stated sitting in the setting table as text. It is written straight in because no
 * `SettingKey` names that key any more, which is the whole of what this step changed.
 */
async function aPhoneThatStatedItInTheSettingTable(
  stated: string = String(sheSaidHerCycleRuns),
): Promise<Database> {
  const database = herDatabase();
  migrate(database);
  await herKeyIsInTheKeychain();

  const vault = herVault();
  const bled = aBleedingDay(herPeriodStarted);
  logDay(database, { day: bled.day, payload: vault.seal(bled), now: sheAnsweredAt }, vault.open);

  database.run('INSERT INTO setting (key, value) VALUES (?, ?)', [statedCycleLengthKey, stated]);
  writeSetting(database, 'firstRunCompletedAt', sheAnsweredAt.toISOString());
  // The tour runs before the questions, so a phone that answered them has been through it.
  // Without this the application sends her to card 1 and the home screen is never reached.
  writeSetting(database, 'tourSeenAt', sheAnsweredAt.toISOString());

  return database;
}

/** The setting table as the bytes on the disk, read with no repository between it and the test. */
function everySetting(database: Database): { key: string; value: string }[] {
  return database.all<{ key: string; value: string }>(
    'SELECT key, value FROM setting ORDER BY key',
  );
}

function moved(database: Database): ReturnType<typeof moveCycleLengthIntoProfile> {
  return moveCycleLengthIntoProfile(database, herProfileVault(), sheUpgradedAt);
}

describe('after the upgrade the cycle length is sealed and the setting table does not hold it', () => {
  beforeEach(() => {
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('a phone that stated her cycle length before this build', () => {
    it('seals the number into her profile', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();

      expect(moved(database)).toEqual({
        move: 'sealed-into-the-profile',
        cycleLengthDays: sheSaidHerCycleRuns,
      });
      expect(readProfile(database, herProfileVault())?.cycleLengthDays).toBe(sheSaidHerCycleRuns);
    });

    it('takes the key out of the setting table, leaving the markers beside it', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();
      moved(database);

      expect(everySetting(database).map((row) => row.key)).toEqual([
        'firstRunCompletedAt',
        'tourSeenAt',
      ]);
    });

    it('leaves the number itself nowhere in the setting table', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();
      moved(database);

      const written = JSON.stringify(everySetting(database));
      expect(written).not.toContain(String(sheSaidHerCycleRuns));
    });

    it('seals it, so the number is not readable in the profile payload either', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();
      moved(database);

      const payload = profileRow(database)?.payload;
      expect(payload).toBeDefined();
      expect(Buffer.from(payload as Uint8Array).toString('utf8')).not.toContain(
        String(sheSaidHerCycleRuns),
      );
    });

    it('reads back through the one function a screen asks', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();

      expect(statedCycleLengthDays(database, herProfileVault())).toBeUndefined();
      moved(database);
      expect(statedCycleLengthDays(database, herProfileVault())).toBe(sheSaidHerCycleRuns);
    });

    it('changes nothing on the launch after it', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();
      moved(database);
      const after = profileRow(database);

      expect(moved(database)).toEqual({ move: 'no-setting-to-move' });
      expect(profileRow(database)).toEqual(after);
    });

    it('keeps every other answer her profile already held', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();
      const alreadyAnswered: ProfileRecord = aProfileRecord({ cycleLengthDays: undefined });
      writeProfile(database, herProfileVault(), {
        profile: alreadyAnswered,
        now: sheAnsweredAt,
      });

      expect(moved(database).move).toBe('sealed-into-the-profile');
      expect(readProfile(database, herProfileVault())).toEqual({
        ...alreadyAnswered,
        cycleLengthDays: sheSaidHerCycleRuns,
      });
    });
  });

  describe('a phone that never stated one', () => {
    it('writes nothing at all', () => {
      const database = herDatabase();
      migrate(database);

      expect(moved(database)).toEqual({ move: 'no-setting-to-move' });
      expect(profileRow(database)).toBeUndefined();
      expect(everySetting(database)).toEqual([]);
    });

    it('leaves the ring counting by the length the first run offers', () => {
      const database = herDatabase();
      migrate(database);
      moved(database);

      expect(statedCycleLengthDays(database, herProfileVault())).toBeUndefined();
    });
  });

  describe('a phone whose profile already states a cycle length', () => {
    it('keeps the sealed answer and drops the plain key', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable('24');
      writeProfile(database, herProfileVault(), { profile: aProfileRecord(), now: sheAnsweredAt });

      expect(moved(database)).toEqual({
        move: 'already-in-the-profile',
        cycleLengthDays: aProfileRecord().cycleLengthDays,
      });
      expect(readProfile(database, herProfileVault())).toEqual(aProfileRecord());
      expect(everySetting(database).map((row) => row.key)).not.toContain(statedCycleLengthKey);
    });
  });

  describe('a stored value that is not a cycle length', () => {
    /**
     * Each one is outside what a profile may carry, so none of them can be sealed. An empty value
     * is not in the list because the table refuses one on its own.
     */
    for (const stated of ['20', '46', '28.5', 'twenty eight']) {
      it(`leaves ${stated} where it is rather than throwing it away`, async () => {
        const database = await aPhoneThatStatedItInTheSettingTable('31');
        database.run('UPDATE setting SET value = ? WHERE key = ?', [stated, statedCycleLengthKey]);

        expect(moved(database)).toEqual({ move: 'not-a-cycle-length' });
        expect(profileRow(database)).toBeUndefined();
        expect(everySetting(database).map((row) => row.key)).toContain(statedCycleLengthKey);
      });
    }
  });

  describe('the setting table itself', () => {
    /**
     * A fact about her body is a field of one of the two records that travel sealed, so the list
     * of those fields is the list of names a plain key may not carry. A key named for a unit is
     * not caught by it, because a record spells its own unit into the field name it stores.
     */
    const aFactAboutHerBody = [...profileKeys, ...recordKeys].filter((field) => field !== 'kind');

    it('names no field of a record that travels sealed', () => {
      const named = settingKeys.flatMap((key) =>
        aFactAboutHerBody
          .filter((field) => key.toLowerCase().includes(field.toLowerCase()))
          .map((field) => `the setting ${key} names ${field}, which is a fact about her body`),
      );

      expect(named).toEqual([]);
    });

    it('is asking about a list that holds the fields this step moved', () => {
      expect(aFactAboutHerBody).toContain(statedCycleLengthKey);
    });
  });

  describe('she opens the application after the upgrade', () => {
    it('draws her home screen counting by the length she stated', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();

      jest.useFakeTimers();
      jest.setSystemTime(sheOpenedItAt);
      await renderRouter(appDirectory, { initialUrl: '/' });

      expect(screen.getByTestId(learningStatedLengthTestID)).toHaveTextContent(
        new RegExp(`\\b${sheSaidHerCycleRuns} days\\b`),
      );
      expect(everySetting(database).map((row) => row.key)).not.toContain(statedCycleLengthKey);
      expect(readProfile(database, herProfileVault())?.cycleLengthDays).toBe(sheSaidHerCycleRuns);
    });
  });

  describe('the record she can take to a doctor', () => {
    it('still carries the length she stated, now out of her profile', async () => {
      const database = await aPhoneThatStatedItInTheSettingTable();
      moved(database);

      const page = readableHtml(everythingIn(database, herVault(), sheOpenedItAt));

      expect(page).toContain(labelOf(statedCycleLengthKey));
      expect(page).toContain(`>${sheSaidHerCycleRuns}<`);
    });
  });
});
