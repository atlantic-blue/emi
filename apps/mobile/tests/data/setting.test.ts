import type { Database } from '../../src/data/database';
import {
  SettingError,
  readSetting,
  readSettings,
  writeSetting,
} from '../../src/data/settingRepository';
import { migrate, schemaVersion } from '../../src/data/schema';
import { openTestDatabase } from './nodeDatabase';

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

describe('the setting table', () => {
  describe('a setting she has never written', () => {
    it('reads as nothing at all, rather than as an empty string', () => {
      expect(readSetting(migrated(), 'cycleLengthDays')).toBeUndefined();
    });
  });

  describe('a setting written twice', () => {
    it('holds the second value and only one row', () => {
      const database = migrated();

      writeSetting(database, 'cycleLengthDays', '28');
      writeSetting(database, 'cycleLengthDays', '31');

      expect(readSetting(database, 'cycleLengthDays')).toBe('31');
      expect(database.all('SELECT key FROM setting')).toHaveLength(1);
    });
  });

  describe('every setting at once', () => {
    it('comes back keyed by its name', () => {
      const database = migrated();

      writeSetting(database, 'cycleLengthDays', '28');
      writeSetting(database, 'firstRunCompletedAt', '2026-05-14T12:00:00.000Z');

      expect(readSettings(database)).toEqual({
        cycleLengthDays: '28',
        firstRunCompletedAt: '2026-05-14T12:00:00.000Z',
      });
    });
  });

  describe('a value that is not a value', () => {
    it('refuses an empty string, naming the setting', () => {
      const database = migrated();

      expect(() => writeSetting(database, 'cycleLengthDays', '')).toThrow(SettingError);
      expect(() => writeSetting(database, 'cycleLengthDays', '')).toThrow(/cycleLengthDays/);
    });

    it('refuses an empty value written straight into the table', () => {
      const database = migrated();

      expect(() =>
        database.run('INSERT INTO setting (key, value) VALUES (?, ?)', ['cycleLengthDays', '']),
      ).toThrow(/CHECK constraint failed/);
    });

    it('turns a number written straight in into text nobody asked for, which is why the repository takes text', () => {
      const database = migrated();

      database.run('INSERT INTO setting (key, value) VALUES (?, ?)', ['cycleLengthDays', 28]);

      expect(readSetting(database, 'cycleLengthDays')).toBe('28.0');
    });
  });

  describe('the migration that creates it', () => {
    it('takes the schema to version 2 and changes nothing on a second run', () => {
      const database = openTestDatabase();

      expect(migrate(database).applied).toEqual(['day log', 'setting']);
      expect(schemaVersion(database)).toBe(2);
      expect(migrate(database).applied).toEqual([]);
      expect(schemaVersion(database)).toBe(2);
    });
  });
});
