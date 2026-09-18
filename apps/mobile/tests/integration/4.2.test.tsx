import { type Symptom, loggableSymptoms, symptoms as catalogue } from '@emi/cycle';
import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Database } from '../../src/data/database';
import { insertDayLog, readDayLog, updateDayLog } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { LogSheet, type LogSheetEntry } from '../../src/features/log/LogSheet';
import { groupHeadings } from '../../src/features/log/SymptomGroup';
import { openTestDatabase } from '../data/nodeDatabase';
import { aDayRecord, recordBytes, recordFromBytes } from '../fixtures/dayRecord';

const day = '2026-03-14';
const pressedSaveAt = new Date('2026-03-14T21:05:00.000Z');

/** The save is awaited, so a test reads the screen she is left with rather than the one mid write. */
async function pressSave(): Promise<void> {
  fireEvent.press(screen.getByTestId('log-sheet-save'));
  await act(async () => {});
}

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

/**
 * The write the screen hosting the sheet performs. The envelope arrives in feature 5, so the
 * payload is the plaintext of design section 6.2 for now, which is what the day log already holds.
 */
function savesInto(database: Database): (entry: LogSheetEntry) => void {
  return (entry) => {
    const payload = recordBytes(
      aDayRecord({
        day: entry.day,
        symptoms: entry.symptoms,
        recordedAt: pressedSaveAt.toISOString(),
      }),
    );
    const held = readDayLog(database, entry.day);
    const write = { day: entry.day, payload, now: pressedSaveAt };
    if (held) {
      updateDayLog(database, write);
    } else {
      insertDayLog(database, write);
    }
  };
}

function slugsRecordedFor(database: Database, forDay: string): readonly string[] {
  const row = readDayLog(database, forDay);
  if (!row) {
    throw new Error(`${forDay} was saved and could not be read back`);
  }
  return recordFromBytes(row.payload).symptoms ?? [];
}

function revisionOf(database: Database, forDay: string): number {
  const row = readDayLog(database, forDay);
  if (!row) {
    throw new Error(`${forDay} was saved and could not be read back`);
  }
  return row.revision;
}

/** Every measurable side of a rendered element, after its style array is flattened. */
function styleOf(element: { props: { style?: unknown } }): Record<string, unknown> {
  return (StyleSheet.flatten(element.props.style) ?? {}) as Record<string, unknown>;
}

function sizeOf(element: { props: { style?: unknown } }): { height: number; width: number } {
  const flat = styleOf(element);
  return { height: numberIn(flat, ['height', 'minHeight']), width: numberIn(flat, ['width', 'minWidth']) };
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

function labelIn(chip: { props: { children?: unknown } }): { props: { numberOfLines?: number } } {
  const label = chip.props.children;
  if (label === null || typeof label !== 'object' || !('props' in label)) {
    throw new Error('a chip carries one label');
  }
  return label as { props: { numberOfLines?: number } };
}

describe('a symptom is found by search and saved in one action', () => {
  describe('the sheet she opens on a day with nothing logged', () => {
    it('opens empty, with every group of the catalogue on it', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('0 picked');
      for (const heading of ['Mood', 'Energy', 'Pain', 'Digestion', 'Skin and hair', 'Sleep', 'Head', 'Libido']) {
        expect(screen.getByText(heading)).toBeTruthy();
      }
    });

    it('offers all seventy symptoms, so nothing in the catalogue is unreachable', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(loggableSymptoms().length);
      expect(loggableSymptoms()).toHaveLength(70);
    });
  });

  describe('she searches for a symptom by part of its name', () => {
    it('shows the symptom she meant and hides the rest', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.changeText(screen.getByTestId('symptom-search'), 'cram');

      expect(screen.getByTestId('symptom-chip-cramps')).toBeTruthy();
      expect(screen.queryByTestId('symptom-chip-acne')).toBeNull();
      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(1);
    });

    it('finds a symptom whose letters sit in the middle of its name', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.changeText(screen.getByTestId('symptom-search'), 'sweat');

      expect(screen.getByTestId('symptom-chip-night-sweats')).toBeTruthy();
    });

    it('finds a long name from its first letters, so she never spells diarrhoea out', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.changeText(screen.getByTestId('symptom-search'), 'diarrh');

      expect(screen.getByTestId('symptom-chip-diarrhoea')).toBeTruthy();
      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(1);
    });

    it('finds nausea for a woman whose keyboard put an accent on it', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.changeText(screen.getByTestId('symptom-search'), 'náusea');

      expect(screen.getByTestId('symptom-chip-nausea')).toBeTruthy();
    });

    it('says so when nothing matches, naming what she typed', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.changeText(screen.getByTestId('symptom-search'), 'hangover');

      expect(screen.getByTestId('no-symptom-found')).toHaveTextContent('No symptom matches hangover');
      expect(screen.queryAllByTestId(/^symptom-chip-/)).toHaveLength(0);
    });

    it('never offers a retired symptom, however she spells it', async () => {
      const database = migrated();
      const afterNappingRetires: readonly Symptom[] = catalogue.map((symptom) =>
        symptom.slug === 'napping' ? { ...symptom, retiredOn: '2027-03-01' } : symptom,
      );
      await render(
        <LogSheet catalogue={afterNappingRetires} day={day} onSave={savesInto(database)} />,
      );

      fireEvent.changeText(screen.getByTestId('symptom-search'), 'napping');

      expect(screen.queryByTestId('symptom-chip-napping')).toBeNull();
      expect(screen.getByTestId('no-symptom-found')).toBeTruthy();
    });
  });

  describe('she picks what she searched for and presses save once', () => {
    it('writes the day, and the record holds the slug she picked', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.changeText(screen.getByTestId('symptom-search'), 'cram');
      fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      await pressSave();

      expect(slugsRecordedFor(database, day)).toEqual(['cramps']);
    });

    it('writes everything she picked across groups and across searches, in one write', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.press(screen.getByTestId('symptom-chip-low-mood'));
      fireEvent.press(screen.getByTestId('symptom-chip-bloating'));
      fireEvent.changeText(screen.getByTestId('symptom-search'), 'migr');
      fireEvent.press(screen.getByTestId('symptom-chip-migraine'));
      await pressSave();

      expect(slugsRecordedFor(database, day)).toEqual(['low-mood', 'bloating', 'migraine']);
      expect(revisionOf(database, day)).toBe(1);
    });

    it('writes nothing at all until she presses save', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      fireEvent.changeText(screen.getByTestId('symptom-search'), 'acne');
      fireEvent.press(screen.getByTestId('symptom-chip-acne'));

      expect(readDayLog(database, day)).toBeUndefined();
    });

    it('drops a symptom she picked and unpicked before saving', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      fireEvent.press(screen.getByTestId('symptom-chip-acne'));
      fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      await pressSave();

      expect(slugsRecordedFor(database, day)).toEqual(['acne']);
    });
  });

  describe('what she is left looking at after the save', () => {
    it('says the day is saved, and says how many she logged', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      fireEvent.press(screen.getByTestId('symptom-chip-acne'));
      await pressSave();

      expect(screen.getByTestId('log-sheet-save')).toHaveTextContent('Saved');
      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('2 picked');
    });

    it('shows Save again the moment she changes her mind', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      await pressSave();
      fireEvent.press(screen.getByTestId('symptom-chip-acne'));

      expect(screen.getByTestId('log-sheet-save')).toHaveTextContent('Save');
      expect(screen.getByTestId('log-sheet-save')).not.toHaveTextContent('Saved');
    });
  });

  describe('she reopens the day she already logged', () => {
    it('comes back with her symptoms picked, read from what was written', async () => {
      const database = migrated();
      const save = savesInto(database);
      const { unmount } = await render(<LogSheet day={day} onSave={save} />);

      fireEvent.changeText(screen.getByTestId('symptom-search'), 'cram');
      fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      await pressSave();
      unmount();

      await render(
        <LogSheet day={day} onSave={save} symptoms={slugsRecordedFor(database, day)} />,
      );

      expect(screen.getByTestId('symptom-chip-cramps')).toBeChecked();
      expect(screen.getByTestId('symptom-chip-acne')).not.toBeChecked();
      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('1 picked');
    });

    it('adds one more symptom and raises the revision rather than writing a second day', async () => {
      const database = migrated();
      const save = savesInto(database);
      const { unmount } = await render(<LogSheet day={day} onSave={save} />);

      fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      await pressSave();
      unmount();

      await render(
        <LogSheet day={day} onSave={save} symptoms={slugsRecordedFor(database, day)} />,
      );
      fireEvent.press(screen.getByTestId('symptom-chip-headache'));
      await pressSave();

      expect(slugsRecordedFor(database, day)).toEqual(['cramps', 'headache']);
      expect(revisionOf(database, day)).toBe(2);
    });
  });

  describe('every chip she can press', () => {
    it('is at least 44 points on both axes, and names any that is not', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      const tooSmall = screen
        .getAllByTestId(/^symptom-chip-/)
        .map((chip) => ({ chip: String(chip.props.testID), ...sizeOf(chip) }))
        .filter((each) => each.height < MINIMUM_TAP_TARGET || each.width < MINIMUM_TAP_TARGET);

      expect(tooSmall).toEqual([]);
    });

    it('holds the save control and the search field to the same floor', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      const save = sizeOf(screen.getByTestId('log-sheet-save'));
      expect(save.height).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
      expect(save.width).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
      expect(sizeOf(screen.getByTestId('symptom-search')).height).toBeGreaterThanOrEqual(
        MINIMUM_TAP_TARGET,
      );
    });
  });

  describe('the sheet at the smallest supported screen, 320 points wide', () => {
    it('wraps each row of chips rather than running one past the edge', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);
      const rows = screen.getAllByTestId(/^symptom-group-.*-chips$/);

      expect(rows).toHaveLength(8);
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
      await render(<LogSheet day={day} onSave={savesInto(database)} />);
      const chip = screen.getByTestId(`symptom-chip-${longest.slug}`);

      expect(styleOf(chip).maxWidth).toBe('100%');
      expect(labelIn(chip).props.numberOfLines).toBe(2);
    });

    it('scrolls, so the eighth group is reachable on a screen that shows three', async () => {
      const database = migrated();
      await render(<LogSheet day={day} onSave={savesInto(database)} />);

      expect(screen.getByTestId('log-sheet-scroll')).toBeTruthy();
      expect(screen.getByText(groupHeadings.libido)).toBeTruthy();
    });
  });
});
