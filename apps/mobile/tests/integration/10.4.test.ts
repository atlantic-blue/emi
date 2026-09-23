import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Database } from '../../src/data/database';
import { profileRow, readProfile, writeProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { logDay } from '../../src/features/cycle/rebuild';
import { everythingIn } from '../../src/features/export/everything';
import type { ServerDelete } from '../../src/services/sync/deleteAccount';
import { deleteEverything, everyTable, rowsHeld } from '../../src/services/vault/wipe';
import { aBleedingDay } from '../fixtures/herPhone';
import { herProfileVault, herVault } from '../fixtures/herVault';
import { aProfileRecord } from '../fixtures/profileRecord';
import { memorySecureStore } from '../fixtures/secureStore';
import { openTestDatabase } from '../data/nodeDatabase';

const sheAnsweredAt = new Date('2026-09-23T09:14:00.000Z');
const sheChangedItAt = new Date('2026-10-01T18:02:11.500Z');
const sheAskedForTheDeleteAt = new Date('2026-10-04T21:30:00.000Z');

/** The server took the account, so a case about the phone is about the phone alone. */
const aServerThatTookIt: ServerDelete = () => Promise.resolve('gone');

/**
 * Her phone after the first run: the day she bled, the two answers the first run writes as
 * settings, and her profile sealed under the key the keychain holds.
 */
function herPhone(): Database {
  const db = openTestDatabase();
  migrate(db);

  const vault = herVault();
  const bled = aBleedingDay('2026-09-14');
  logDay(db, { day: bled.day, payload: vault.seal(bled), now: sheAnsweredAt }, vault.open);
  writeSetting(db, 'firstRunCompletedAt', sheAnsweredAt.toISOString());
  writeProfile(db, herProfileVault(), { profile: aProfileRecord(), now: sheAnsweredAt });

  return db;
}

function sealedBytes(db: Database): Buffer {
  const held = profileRow(db);
  if (!held) {
    throw new Error('this phone holds no profile, so there are no bytes to read');
  }
  return Buffer.from(held.payload);
}

describe('delete everything leaves no profile behind', () => {
  describe('her answers, before she asks for anything to go', () => {
    it('read back as she gave them, through the key her phone holds', () => {
      expect(readProfile(herPhone(), herProfileVault())).toEqual(aProfileRecord());
    });

    it('sit in the table as bytes, with none of her answers readable in them', () => {
      const bytes = sealedBytes(herPhone());

      expect(bytes.includes(Buffer.from('Maria'))).toBe(false);
      expect(bytes.includes(Buffer.from('1994'))).toBe(false);
      expect(bytes.includes(Buffer.from('cycleLengthDays'))).toBe(false);
      expect(bytes.includes(Buffer.from('profile'))).toBe(false);
    });

    it('are one row however many times she answers again', () => {
      const db = herPhone();

      writeProfile(db, herProfileVault(), {
        profile: aProfileRecord({ feeling: 'fine' }),
        now: sheChangedItAt,
      });

      expect(db.all('SELECT count(*) AS held FROM profile')).toEqual([{ held: 1 }]);
      expect(profileRow(db)?.revision).toBe(2);
      expect(readProfile(db, herProfileVault())?.feeling).toBe('fine');
    });

    it('reach the file she keeps, because the export walks the database as the delete does', () => {
      const everything = everythingIn(herPhone(), herVault(), sheChangedItAt);
      const held = everything.tables.profile?.[0]?.payload;

      expect(held).toEqual(expect.objectContaining({ kind: 'profile', name: 'Maria' }));
      expect(everything.schemaVersion).toBe(5);
    });
  });

  describe('the one action she presses', () => {
    it('empties the profile table, which it found by reading the database', async () => {
      const db = herPhone();

      const outcome = await deleteEverything(db, memorySecureStore(), aServerThatTookIt);

      expect(outcome.tables).toContain('profile');
      expect(db.all('SELECT count(*) AS held FROM profile')).toEqual([{ held: 0 }]);
    });

    it('leaves her nothing to read afterwards, and no row in any table', async () => {
      const db = herPhone();

      const outcome = await deleteEverything(db, memorySecureStore(), aServerThatTookIt);

      expect(profileRow(db)).toBeUndefined();
      expect(readProfile(db, herProfileVault())).toBeUndefined();
      expect(outcome.rowsLeft).toBe(0);
      expect(rowsHeld(db)).toBe(0);
    });

    it('leaves the table standing, so a phone she keeps using holds a profile again', async () => {
      const db = herPhone();
      await deleteEverything(db, memorySecureStore(), aServerThatTookIt);

      const again = writeProfile(db, herProfileVault(), {
        profile: aProfileRecord({ name: 'Mar' }),
        now: sheAskedForTheDeleteAt,
      });

      expect(everyTable(db)).toContain('profile');
      expect(again.revision).toBe(1);
      expect(readProfile(db, herProfileVault())?.name).toBe('Mar');
    });

    it('needed no change of its own, because it names no table anywhere in it', () => {
      const source = readFileSync(
        join(__dirname, '..', '..', 'src', 'services', 'vault', 'wipe.ts'),
        'utf8',
      );

      expect(source).not.toContain('profile');
      expect(source).not.toContain('day_log');
    });
  });
});
