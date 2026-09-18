import { type Symptom, loggableSymptoms, symptoms as catalogue } from '@emi/cycle';
import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Database } from '../../src/data/database';
import { readDayLog } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { LogSheet, type LogSheetEntry } from '../../src/features/log/LogSheet';
import { groupHeadings } from '../../src/features/log/SymptomGroup';
import { openTestDatabase } from '../data/nodeDatabase';
import { herVault } from '../fixtures/herVault';

import { savesInto as savesEntryInto } from '../fixtures/sheetSave';

const day = '2026-03-14';
const pressedSaveAt = new Date('2026-03-14T21:05:00.000Z');

/** The widest phone version 1 has to fit, in points: an iPhone SE of the first generation. */
const SMALLEST_SCREEN_WIDTH = 320;

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

function savesInto(database: Database): (entry: LogSheetEntry) => void {
  return savesEntryInto(database, pressedSaveAt);
}

async function sheOpensTheSheet(database: Database, held: readonly string[] = []): Promise<void> {
  await render(<LogSheet day={day} onSave={savesInto(database)} symptoms={held} />);
}

/** Closing the sheet is awaited, the way the library unmounts between tests. */
async function sheClosesTheSheet(): Promise<void> {
  await cleanup();
}

async function sheSearchesFor(typed: string): Promise<void> {
  await fireEvent.changeText(screen.getByTestId('symptom-search'), typed);
}

async function shePicks(slug: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(`symptom-chip-${slug}`));
}

async function shePressesSave(): Promise<void> {
  await fireEvent.press(screen.getByTestId('log-sheet-save'));
}

function slugsRecordedFor(database: Database, forDay: string): readonly string[] {
  const row = readDayLog(database, forDay);
  if (!row) {
    throw new Error(`${forDay} was saved and could not be read back`);
  }
  return herVault().open(row.payload).symptoms ?? [];
}

function revisionOf(database: Database, forDay: string): number {
  const row = readDayLog(database, forDay);
  if (!row) {
    throw new Error(`${forDay} was saved and could not be read back`);
  }
  return row.revision;
}

function styleOf(element: { props: { style?: unknown } }): Record<string, unknown> {
  return (StyleSheet.flatten(element.props.style) ?? {}) as Record<string, unknown>;
}

function numberIn(style: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const held = style[key];
    if (typeof held === 'number') {
      return held;
    }
  }
  return 0;
}

/**
 * Every control on the sheet that is too small to press, named with its size. A sheet holding
 * nothing to press is a measurement of nothing, so it fails rather than reporting an empty list.
 */
function controlsTooSmallToPress(): string[] {
  const controls = [
    ...screen.queryAllByTestId(/^symptom-chip-/),
    screen.getByTestId('log-sheet-save'),
    screen.getByTestId('symptom-search'),
  ];
  if (controls.length <= 2) {
    throw new Error('a sheet holding no chip was measured for tap targets');
  }

  return controls
    .map((control) => ({
      name: String(control.props.testID),
      style: styleOf(control),
    }))
    .filter(
      ({ name, style }) =>
        numberIn(style, ['height', 'minHeight']) < MINIMUM_TAP_TARGET ||
        // The search field runs the width of the sheet, so only its height is its own to hold.
        (name !== 'symptom-search' && numberIn(style, ['width', 'minWidth']) < MINIMUM_TAP_TARGET),
    )
    .map(
      ({ name, style }) =>
        `${name} is ${numberIn(style, ['width', 'minWidth'])} by ${numberIn(style, ['height', 'minHeight'])}`,
    );
}

describe('a symptom is found by search and saved in one action', () => {
  describe('the sheet she opens on a day with nothing logged', () => {
    it('opens empty, with every group of the catalogue named on it', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('0 picked');
      for (const heading of Object.values(groupHeadings)) {
        expect(screen.getByText(heading)).toBeTruthy();
      }
    });

    it('offers all seventy, so nothing in the catalogue is unreachable', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      // The mood group is reached through the picker at the top of the sheet, not through this
      // list, so the seventy arrive as sixty chips and ten mood chips.
      expect(loggableSymptoms()).toHaveLength(70);
      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(60);
      expect(screen.getAllByTestId(/^mood-chip-/)).toHaveLength(10);
    });
  });

  describe('she searches for a symptom by part of its name', () => {
    it('shows the symptom she meant and hides the rest', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSearchesFor('cram');

      expect(screen.getByTestId('symptom-chip-cramps')).toBeTruthy();
      expect(screen.queryByTestId('symptom-chip-acne')).toBeNull();
      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(1);
    });

    it('finds a symptom whose letters sit in the middle of its name', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSearchesFor('sweat');

      expect(screen.getByTestId('symptom-chip-night-sweats')).toBeTruthy();
      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(1);
    });

    it('finds a long name from its first letters, so she never spells diarrhoea out', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSearchesFor('diarrh');

      expect(screen.getByTestId('symptom-chip-diarrhoea')).toBeTruthy();
      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(1);
    });

    it('finds nausea for a woman whose keyboard put an accent on it', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSearchesFor('náusea');

      expect(screen.getByTestId('symptom-chip-nausea')).toBeTruthy();
    });

    it('says so when nothing matches, naming what she typed', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSearchesFor('hangover');

      expect(screen.getByTestId('no-symptom-found')).toHaveTextContent(
        'No symptom matches hangover',
      );
      expect(screen.queryAllByTestId(/^symptom-chip-/)).toHaveLength(0);
    });

    it('gives the whole catalogue back when she clears the field', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSearchesFor('cram');
      await sheSearchesFor('');

      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(60);
    });

    it('never offers a retired symptom, however she spells it', async () => {
      const database = migrated();
      const afterNappingRetires: readonly Symptom[] = catalogue.map((symptom) =>
        symptom.slug === 'napping' ? { ...symptom, retiredOn: '2027-03-01' } : symptom,
      );
      await render(
        <LogSheet catalogue={afterNappingRetires} day={day} onSave={savesInto(database)} />,
      );

      await sheSearchesFor('napping');

      expect(screen.queryByTestId('symptom-chip-napping')).toBeNull();
      expect(screen.getByTestId('no-symptom-found')).toBeTruthy();
    });
  });

  describe('she picks what she searched for and presses save once', () => {
    it('writes the day, and the record holds the slug she picked', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSearchesFor('cram');
      await shePicks('cramps');
      await shePressesSave();

      expect(slugsRecordedFor(database, day)).toEqual(['cramps']);
    });

    it('writes everything she picked across groups and across searches, in one write', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicks('insomnia');
      await shePicks('bloating');
      await sheSearchesFor('migr');
      await shePicks('migraine');
      await shePressesSave();

      expect(slugsRecordedFor(database, day)).toEqual(['insomnia', 'bloating', 'migraine']);
      expect(revisionOf(database, day)).toBe(1);
    });

    it('writes nothing at all until she presses save', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicks('cramps');
      await sheSearchesFor('acne');
      await shePicks('acne');

      expect(readDayLog(database, day)).toBeUndefined();
    });

    it('drops a symptom she picked and unpicked before saving', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicks('cramps');
      await shePicks('acne');
      await shePicks('cramps');
      await shePressesSave();

      expect(slugsRecordedFor(database, day)).toEqual(['acne']);
    });
  });

  describe('what she is left looking at after the save', () => {
    it('says the day is saved, and says how many she logged', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicks('cramps');
      await shePicks('acne');
      await shePressesSave();

      expect(screen.getByTestId('log-sheet-save')).toHaveTextContent('Saved');
      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('2 picked');
    });

    it('shows Save again the moment she changes her mind', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicks('cramps');
      await shePressesSave();
      await shePicks('acne');

      expect(screen.getByTestId('log-sheet-save')).toHaveTextContent('Save');
      expect(screen.getByTestId('log-sheet-save')).not.toHaveTextContent('Saved');
    });
  });

  describe('she reopens the day she already logged', () => {
    it('comes back with her symptoms picked, read from what was written', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheSearchesFor('cram');
      await shePicks('cramps');
      await shePressesSave();
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, slugsRecordedFor(database, day));

      expect(screen.getByTestId('symptom-chip-cramps')).toBeChecked();
      expect(screen.getByTestId('symptom-chip-acne')).not.toBeChecked();
      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('1 picked');
    });

    it('adds one more symptom and raises the revision rather than writing a second day', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await shePicks('cramps');
      await shePressesSave();
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, slugsRecordedFor(database, day));
      await shePicks('headache');
      await shePressesSave();

      expect(slugsRecordedFor(database, day)).toEqual(['cramps', 'headache']);
      expect(revisionOf(database, day)).toBe(2);
    });
  });

  describe('every control she can press', () => {
    it('is at least 44 points, and the failure names any that is not', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(controlsTooSmallToPress()).toEqual([]);
    });

    it('is measured against a sheet that actually holds chips', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheSearchesFor('hangover');

      expect(controlsTooSmallToPress).toThrow('no chip was measured');
    });
  });

  describe(`the sheet at the smallest supported screen, ${SMALLEST_SCREEN_WIDTH} points wide`, () => {
    it('wraps each row of chips rather than running one past the edge', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      const rows = screen.getAllByTestId(/^symptom-group-.*-chips$/);

      expect(rows).toHaveLength(7);
      for (const row of rows) {
        expect(styleOf(row).flexWrap).toBe('wrap');
      }
    });

    it('lets the longest name in the catalogue shrink inside its row', async () => {
      const database = migrated();
      const longest = [...loggableSymptoms()].sort(
        (one, other) => other.name.length - one.name.length,
      )[0];
      if (!longest) {
        throw new Error('the catalogue is empty');
      }
      await sheOpensTheSheet(database);
      const chip = screen.getByTestId(`symptom-chip-${longest.slug}`);

      expect(styleOf(chip).maxWidth).toBe('100%');
      expect(within(chip).getByText(longest.name).props.numberOfLines).toBe(2);
    });

    it('scrolls, so the eighth group is reachable on a screen that shows three', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(screen.getByTestId('log-sheet-scroll')).toBeTruthy();
      expect(screen.getByText(groupHeadings.libido)).toBeTruthy();
    });
  });
});
