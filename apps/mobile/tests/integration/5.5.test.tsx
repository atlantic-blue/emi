import { join } from 'node:path';

import { type DayRecord, readEnvelope } from '@emi/crypto';
import { addDays, findMood, findSymptom, temperature, weight } from '@emi/cycle';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import type { Database } from '../../src/data/database';
import { deleteDay, logDay } from '../../src/features/cycle/rebuild';
import {
  exportActionTestID,
  exportFileTestID,
  exportHeldTestID,
  exportScreenTestID,
  exportShareTestID,
} from '../../src/features/export/ExportScreen';
import { exportCopy, fullDate, heldSentence } from '../../src/features/export/copy';
import { exportFormat } from '../../src/features/export/everything';
import { exportFileStem } from '../../src/features/export/files';
import { exportTestID } from '../../src/features/home/HomeScreen';
import { chooseUnits } from '../../src/features/log/units';
import type { DayVault } from '../../src/services/vault/dayVault';
import { claimsIn } from '../../../../tools/pipeline/forbiddenClaims';
import { resetExpoSqlite } from '../data/expoSqlite';
import { fileOnThePhone, resetExpoFileSystem } from '../fixtures/expoFileSystem';
import { resetExpoLocalAuthentication } from '../fixtures/expoLocalAuthentication';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { resetExpoSharing, whatWasShared } from '../fixtures/expoSharing';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';
import { herVault } from '../fixtures/herVault';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));
jest.mock('expo-local-authentication', () =>
  jest.requireActual('../fixtures/expoLocalAuthentication'),
);
jest.mock('expo-file-system', () => jest.requireActual('../fixtures/expoFileSystem'));
jest.mock('expo-sharing', () => jest.requireActual('../fixtures/expoSharing'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const today = dayOf(whenSheOpensIt);
const herCycleLengthDays = 28;
const herPeriodDays = 4;

/** Six cycles behind her needs seven periods: a cycle is the span from one start to the next. */
const herPeriodStarts: readonly string[] = [6, 5, 4, 3, 2, 1, 0].map((back) =>
  addDays(addDays(today, -13), -back * herCycleLengthDays),
);

const theDayShePutEverythingIn = addDays(today, -5);
const theDaySheDeleted = addDays(today, -3);

const theSymptom = 'cramps';
const theMood = 'irritable';

/** One day carrying every field a record can hold, so the walk below has every field to find. */
const everythingSheCanLog: DayRecord = {
  day: theDayShePutEverythingIn,
  flow: 'light',
  bleedingIsUnexpected: true,
  symptoms: [theSymptom],
  moods: [theMood],
  energy: 4,
  temperatureCelsius: 36.7,
  weightKilograms: 63.2,
  note: 'Slept badly, and the cramps started in the afternoon.',
  recordedAt: `${theDayShePutEverythingIn}T20:00:00.000Z`,
};

function herYear(): DayRecord[] {
  const bleeding = herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodDays }, (_unused, day) => aBleedingDay(addDays(start, day))),
  );

  return [...bleeding, everythingSheCanLog];
}

/**
 * Her phone as she left it: six cycles, one day with every field filled, one day she deleted, and
 * the two scales she reads measurements in.
 */
async function herPhone(): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, herYear(), herCycleLengthDays);

  const database = herDatabase();
  const vault = herVault();

  chooseUnits(database, { temperature: 'fahrenheit', weight: 'pounds' });

  const gone: DayRecord = {
    day: theDaySheDeleted,
    flow: 'spotting',
    recordedAt: `${theDaySheDeleted}T09:00:00.000Z`,
  };

  logDay(database, { day: gone.day, payload: vault.seal(gone), now: whenSheOpensIt }, vault.open);
  deleteDay(database, { day: gone.day, now: whenSheOpensIt }, vault.open);
}

async function sheExports(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await fireEvent.press(screen.getByTestId(exportTestID));

  expect(screen.getByTestId(exportScreenTestID)).toBeTruthy();

  await fireEvent.press(screen.getByTestId(exportActionTestID));
  await waitFor(() => expect(screen.getByTestId(exportHeldTestID)).toBeTruthy());
}

const stem = exportFileStem(whenSheOpensIt);

function theDataFile(): string {
  return fileOnThePhone(`${stem}.json`);
}

function theDocument(): string {
  return fileOnThePhone(`${stem}.html`);
}

interface Walked {
  readonly fields: Set<string>;
  readonly values: Map<string, unknown>;
  /** The columns each table is keyed by, so a row is compared to itself and not to a position. */
  readonly keys: Map<string, readonly string[]>;
}

/**
 * Every field the database holds, found by asking SQLite what its tables and columns are rather
 * than by naming them here. A column a later migration adds is found by the same walk, which is
 * the whole point: a list written out in a test is a list that falls behind the schema.
 *
 * A column holding bytes is opened with her own key, so the fields inside a sealed day are walked
 * too, under the name of the column that carries them.
 */
function everythingStored(database: Database, vault: DayVault): Walked {
  const fields = new Set<string>();
  const values = new Map<string, unknown>();
  const keys = new Map<string, readonly string[]>();

  const tables = database
    .all<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
    )
    .map((row) => row.name);

  expect(tables.length).toBeGreaterThan(0);

  for (const table of tables) {
    const declared = database.all<{ name: string; pk: number }>(`PRAGMA table_info("${table}")`);
    const columns = declared.map((column) => column.name);
    const rows = database.all<Record<string, unknown>>(`SELECT * FROM "${table}"`);

    keys.set(
      table,
      declared
        .filter((column) => column.pk > 0)
        .sort((one, two) => one.pk - two.pk)
        .map((column) => column.name),
    );

    for (const row of rows) {
      for (const column of columns) {
        const at = `${table}[${rowKey(row, keys.get(table))}].${column}`;
        const held = row[column];

        fields.add(`${table}.${column}`);

        if (held instanceof Uint8Array) {
          const record = vault.open(held) as unknown as Record<string, unknown>;

          for (const [field, value] of Object.entries(record)) {
            fields.add(`${table}.${column}.${field}`);
            values.set(`${at}.${field}`, value);
          }

          continue;
        }

        values.set(at, held);
      }
    }
  }

  return { fields, values, keys };
}

/** The same walk over the file, so the two sides are compared by shape and not by a written list. */
function everythingExported(text: string, keys: Map<string, readonly string[]>): Walked {
  const fields = new Set<string>();
  const values = new Map<string, unknown>();
  const file = JSON.parse(text) as { tables: Record<string, Record<string, unknown>[]> };

  for (const [table, rows] of Object.entries(file.tables)) {
    for (const row of rows) {
      for (const [column, held] of Object.entries(row)) {
        const at = `${table}[${rowKey(row, keys.get(table))}].${column}`;

        fields.add(`${table}.${column}`);

        if (held !== null && typeof held === 'object' && !Array.isArray(held)) {
          for (const [field, value] of Object.entries(held as Record<string, unknown>)) {
            fields.add(`${table}.${column}.${field}`);
            values.set(`${at}.${field}`, value);
          }

          continue;
        }

        values.set(at, held);
      }
    }
  }

  return { fields, values, keys };
}

/**
 * A row named by what identifies it, taken from the primary key the schema declares. Comparing by
 * position instead would hold the export to the order SQLite happened to return rows in.
 */
function rowKey(row: Record<string, unknown>, columns: readonly string[] | undefined): string {
  if (columns === undefined || columns.length === 0) {
    throw new Error('a table with no primary key cannot be walked row by row');
  }

  return columns.map((column) => String(row[column])).join('/');
}

function missingFrom(stored: Walked, exported: Walked): string[] {
  return [...stored.fields].filter((field) => !exported.fields.has(field)).sort();
}

describe('every stored field appears in the export', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoLocalAuthentication();
    resetExpoFileSystem();
    resetExpoSharing();
    await herPhone();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the file another application reads', () => {
    it('carries every field the database holds, walked from the schema', async () => {
      await sheExports();

      const stored = everythingStored(herDatabase(), herVault());
      const exported = everythingExported(theDataFile(), stored.keys);

      expect(missingFrom(stored, exported)).toEqual([]);
      // The walk found the whole schema rather than one table of it, so an empty answer above
      // cannot be an empty question.
      expect(stored.fields.size).toBeGreaterThan(20);
    });

    it('carries the value in every field, and not only its name', async () => {
      await sheExports();

      const stored = everythingStored(herDatabase(), herVault());
      const exported = everythingExported(theDataFile(), stored.keys);
      const wrong = [...stored.values.entries()].filter(
        ([at, value]) => JSON.stringify(exported.values.get(at)) !== JSON.stringify(value),
      );

      expect(wrong.map(([at]) => at)).toEqual([]);
      expect(stored.values.size).toBeGreaterThan(200);
    });

    it('opens every day out of its envelope, so nothing arrives as sealed bytes', async () => {
      await sheExports();

      const file = theDataFile();
      const sealed = herDatabase().all<{ payload: Uint8Array }>('SELECT payload FROM day_log');

      expect(sealed.length).toBeGreaterThan(20);
      expect(readEnvelope(sealed[0]?.payload as Uint8Array).version).toBe(1);
      expect(file).toContain(everythingSheCanLog.note);
      expect(file).toContain(`"format": "${exportFormat}"`);
    });

    it('carries a day she deleted, because the server was told and she may want it back', async () => {
      await sheExports();

      const exported = everythingExported(
        theDataFile(),
        everythingStored(herDatabase(), herVault()).keys,
      );
      const days = [...exported.values.entries()].filter(([at]) => at.endsWith('.day'));

      expect(days.map(([, day]) => day)).toContain(theDaySheDeleted);
    });

    it('writes the same file twice for a phone that did not change', async () => {
      await sheExports();

      const first = theDataFile();

      await fireEvent.press(screen.getByTestId(exportActionTestID));
      await waitFor(() => expect(screen.getByTestId(exportHeldTestID)).toBeTruthy());

      expect(theDataFile()).toBe(first);
    });
  });

  describe('the document she can read', () => {
    it('names every day she logged, and her symptoms by their names', async () => {
      await sheExports();

      const document = theDocument();

      for (const start of herPeriodStarts) {
        expect(document).toContain(fullDate(start));
      }

      expect(document).toContain(findSymptom(theSymptom)?.name);
      expect(document).toContain(findMood(theMood)?.name);
      expect(document).toContain(everythingSheCanLog.note);
    });

    it('reads her measurements back in the scales she chose', async () => {
      await sheExports();

      const document = theDocument();
      const celsius = everythingSheCanLog.temperatureCelsius as number;
      const kilograms = everythingSheCanLog.weightKilograms as number;

      expect(document).toContain(`${temperature.shownIn(celsius, 'fahrenheit').toFixed(1)} °F`);
      expect(document).toContain(`${weight.shownIn(kilograms, 'pounds').toFixed(1)} lb`);
      expect(document).not.toContain(`${celsius.toFixed(1)} °C`);
    });

    it('says what it is, and makes no claim about her health', async () => {
      await sheExports();

      const document = theDocument();

      expect(document).toContain(exportCopy.document.what);
      expect(claimsIn('the exported document', document)).toEqual([]);
    });
  });

  describe('the screen she does it from', () => {
    it('says how much the files hold, counted from what was written', async () => {
      await sheExports();

      const days = herDatabase().all<{ count: number }>('SELECT COUNT(*) AS count FROM day_log')[0]
        ?.count;
      const cycles = herDatabase().all<{ count: number }>('SELECT COUNT(*) AS count FROM cycle')[0]
        ?.count;

      expect(screen.getByTestId(exportHeldTestID)).toHaveTextContent(
        heldSentence(days as number, cycles as number),
      );
      expect(days).toBeGreaterThan(25);
      expect(cycles).toBe(7);
    });

    it('hands a file to the sharing sheet only when she presses share', async () => {
      await sheExports();

      expect(whatWasShared()).toEqual([]);

      await fireEvent.press(screen.getByTestId(exportShareTestID(`${stem}.html`)));

      await waitFor(() => expect(whatWasShared()).toHaveLength(1));
      expect(whatWasShared()[0]?.url).toContain(`${stem}.html`);
      expect(whatWasShared()[0]?.options).toMatchObject({ mimeType: 'text/html' });
    });

    it('offers both files by name, the document first', async () => {
      await sheExports();

      expect(screen.getByTestId(exportFileTestID(`${stem}.html`))).toBeTruthy();
      expect(screen.getByTestId(exportFileTestID(`${stem}.json`))).toBeTruthy();
    });

    it('holds every control on it to 44 points on both axes', async () => {
      await sheExports();

      const controls = screen.queryAllByRole('button');

      expect(controlsTooSmallToPress(controls)).toEqual([]);
      expect(controls.length).toBeGreaterThan(3);
    });
  });
});
