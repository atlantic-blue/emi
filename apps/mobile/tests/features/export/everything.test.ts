import { base64Of } from '@emi/crypto';

import { columnsOf, everythingIn, tableNames } from '../../../src/features/export/everything';
import {
  exportFileStem,
  machineReadableFile,
  readableFile,
} from '../../../src/features/export/files';
import { logDay } from '../../../src/features/cycle/rebuild';
import { migratedDatabase } from '../../fixtures/cycleCache';
import { herVault } from '../../fixtures/herVault';

/**
 * The walk itself, over a database a test can add a table to. The point of the walk is that a
 * column nobody has written yet still reaches the file, and the only way to show that is to add
 * one the export has never heard of.
 */

const whenSheLogged = new Date('2026-05-14T20:00:00.000Z');
const whenSheExported = new Date('2026-05-15T09:30:00.000Z');

function herPhone() {
  const database = migratedDatabase();
  const vault = herVault();
  const day = {
    day: '2026-05-01',
    flow: 'medium' as const,
    recordedAt: '2026-05-01T08:00:00.000Z',
  };

  logDay(database, { day: day.day, payload: vault.seal(day), now: whenSheLogged }, vault.open);

  return database;
}

describe('the walk that builds an export', () => {
  describe('what it finds', () => {
    it('finds every table the database declares, and none of the ones SQLite keeps', () => {
      const database = herPhone();

      expect(tableNames(database)).toEqual(['cycle', 'day_log', 'profile', 'setting']);
      expect(tableNames(database).some((name) => name.startsWith('sqlite_'))).toBe(false);
    });

    it('carries a table this version has never heard of', () => {
      const database = herPhone();

      database.execute('CREATE TABLE later_on (id TEXT NOT NULL PRIMARY KEY, mood TEXT) STRICT');
      database.run('INSERT INTO later_on (id, mood) VALUES (?, ?)', ['one', 'hopeful']);

      const everything = everythingIn(database, herVault(), whenSheExported);

      expect(everything.tables.later_on).toEqual([{ id: 'one', mood: 'hopeful' }]);
    });

    it('carries a column added to a table it does know', () => {
      const database = herPhone();

      database.execute('ALTER TABLE setting ADD COLUMN written_at TEXT');
      database.run('INSERT INTO setting (key, value, written_at) VALUES (?, ?, ?)', [
        'temperatureUnit',
        'celsius',
        '2026-05-14T20:00:00.000Z',
      ]);

      const everything = everythingIn(database, herVault(), whenSheExported);

      expect(columnsOf(database, 'setting').map((column) => column.name)).toContain('written_at');
      expect(everything.tables.setting?.[0]?.written_at).toBe('2026-05-14T20:00:00.000Z');
    });

    it('opens a sealed column and carries the day that was inside it', () => {
      const everything = everythingIn(herPhone(), herVault(), whenSheExported);

      expect(everything.tables.day_log?.[0]?.payload).toEqual({
        day: '2026-05-01',
        flow: 'medium',
        recordedAt: '2026-05-01T08:00:00.000Z',
      });
    });

    it('carries bytes it cannot open as base 64, rather than dropping the column', () => {
      const database = herPhone();

      database.execute('CREATE TABLE elsewhere (id TEXT NOT NULL PRIMARY KEY, bytes BLOB) STRICT');
      database.run('INSERT INTO elsewhere (id, bytes) VALUES (?, ?)', [
        'one',
        new Uint8Array([1, 2, 3, 4]),
      ]);

      const everything = everythingIn(database, herVault(), whenSheExported);

      expect(everything.tables.elsewhere?.[0]?.bytes).toBe(base64Of(new Uint8Array([1, 2, 3, 4])));
    });
  });

  describe('what it says about itself', () => {
    it('names the format, the moment and the migration the phone had reached', () => {
      const everything = everythingIn(herPhone(), herVault(), whenSheExported);

      expect(everything.format).toBe('emi.export.v1');
      expect(everything.writtenAt).toBe(whenSheExported.toISOString());
      expect(everything.schemaVersion).toBe(5);
    });

    it('names both files by the day they were taken', () => {
      const everything = everythingIn(herPhone(), herVault(), whenSheExported);

      expect(exportFileStem(whenSheExported)).toBe('emi-2026-05-15');
      expect(machineReadableFile(everything, whenSheExported).name).toBe('emi-2026-05-15.json');
      expect(readableFile(everything, whenSheExported).name).toBe('emi-2026-05-15.html');
    });

    it('writes json a person can read, and the same bytes for the same phone', () => {
      const database = herPhone();
      const first = machineReadableFile(
        everythingIn(database, herVault(), whenSheExported),
        whenSheExported,
      );
      const again = machineReadableFile(
        everythingIn(database, herVault(), whenSheExported),
        whenSheExported,
      );

      expect(first.text).toBe(again.text);
      expect(first.text.split('\n').length).toBeGreaterThan(20);
      expect(JSON.parse(first.text)).toEqual(everythingIn(database, herVault(), whenSheExported));
    });
  });
});
