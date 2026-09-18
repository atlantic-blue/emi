import { RecordError, highestEnergy, lowestEnergy } from '@emi/crypto';
import { type Symptom, loggableMoods, symptoms as catalogue } from '@emi/cycle';
import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Database } from '../../src/data/database';
import { readDayLog } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { energyName, nothingChosen } from '../../src/features/log/EnergyScale';
import { LogSheet } from '../../src/features/log/LogSheet';
import { openTestDatabase } from '../data/nodeDatabase';
import { type DayRecord, recordFromBytes } from '../fixtures/dayRecord';
import { savesInto } from '../fixtures/sheetSave';

const day = '2026-03-14';
const pressedSaveAt = new Date('2026-03-14T21:05:00.000Z');

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

async function sheOpensTheSheet(database: Database, held: Partial<DayRecord> = {}): Promise<void> {
  await render(
    <LogSheet
      day={day}
      energy={held.energy}
      moods={held.moods ?? []}
      onSave={savesInto(database, pressedSaveAt)}
      symptoms={held.symptoms ?? []}
    />,
  );
}

async function sheClosesTheSheet(): Promise<void> {
  await cleanup();
}

async function shePicksMood(slug: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(`mood-chip-${slug}`));
}

async function sheChoosesEnergy(level: number): Promise<void> {
  await fireEvent.press(screen.getByTestId(`energy-step-${level}`));
}

async function shePicksSymptom(slug: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(`symptom-chip-${slug}`));
}

async function shePressesSave(): Promise<void> {
  await fireEvent.press(screen.getByTestId('log-sheet-save'));
}

/** What the day actually holds, read back out of the database rather than out of the screen. */
function dayRecordedFor(database: Database, forDay: string): DayRecord {
  const row = readDayLog(database, forDay);
  if (!row) {
    throw new Error(`${forDay} was saved and could not be read back`);
  }
  return recordFromBytes(row.payload);
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
 * Every mood chip and every energy step that is too small to press, named with its size. A sheet
 * holding none of either is a measurement of nothing, so it fails rather than reporting an empty
 * list.
 */
function controlsTooSmallToPress(): string[] {
  const controls = [
    ...screen.queryAllByTestId(/^mood-chip-/),
    ...screen.queryAllByTestId(/^energy-step-/),
  ];
  if (controls.length < loggableMoods().length + highestEnergy) {
    throw new Error('a sheet holding no mood chip and no energy step was measured');
  }

  return controls
    .map((control) => ({ name: String(control.props.testID), style: styleOf(control) }))
    .filter(
      ({ style }) =>
        numberIn(style, ['height', 'minHeight']) < MINIMUM_TAP_TARGET ||
        numberIn(style, ['width', 'minWidth']) < MINIMUM_TAP_TARGET,
    )
    .map(
      ({ name, style }) =>
        `${name} is ${numberIn(style, ['width', 'minWidth'])} by ${numberIn(style, ['height', 'minHeight'])}`,
    );
}

interface RenderedNode {
  readonly props?: { readonly testID?: unknown };
  readonly children?: readonly unknown[] | null;
}

function testIDsInOrder(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(testIDsInOrder);
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }

  const held = node as RenderedNode;
  const testID = held.props?.testID;
  const found = typeof testID === 'string' ? [testID] : [];
  return [...found, ...(held.children ?? []).flatMap(testIDsInOrder)];
}

/** Where a control sits in the order she scrolls through, counted from the top of the sheet. */
function orderOnScreen(testID: string): number {
  const at = testIDsInOrder(screen.toJSON()).indexOf(testID);
  if (at === -1) {
    throw new Error(`${testID} is not on the sheet`);
  }
  return at;
}

describe('mood and energy are saved and read back', () => {
  describe('the sheet she opens on a day with nothing logged', () => {
    it('offers every mood in the catalogue, with none of them picked', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(screen.getAllByTestId(/^mood-chip-/)).toHaveLength(10);
      expect(loggableMoods()).toHaveLength(10);
      for (const mood of loggableMoods()) {
        expect(screen.getByTestId(`mood-chip-${mood.slug}`)).not.toBeChecked();
      }
    });

    it('offers one to five and says the day has no energy logged', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(screen.getAllByTestId(/^energy-step-/)).toHaveLength(5);
      expect(screen.getByTestId('energy-chosen')).toHaveTextContent(nothingChosen);
      for (const level of [lowestEnergy, highestEnergy]) {
        expect(screen.getByTestId(`energy-step-${level}`)).not.toBeChecked();
      }
    });

    it('offers no energy outside the range the record accepts', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(screen.queryByTestId(`energy-step-${lowestEnergy - 1}`)).toBeNull();
      expect(screen.queryByTestId(`energy-step-${highestEnergy + 1}`)).toBeNull();
    });

    it('never offers a retired mood', async () => {
      const database = migrated();
      const afterCalmRetires: readonly Symptom[] = catalogue.map((symptom) =>
        symptom.slug === 'calm' ? { ...symptom, retiredOn: '2027-03-01' } : symptom,
      );
      await render(
        <LogSheet
          catalogue={afterCalmRetires}
          day={day}
          onSave={savesInto(database, pressedSaveAt)}
        />,
      );

      expect(screen.queryByTestId('mood-chip-calm')).toBeNull();
      expect(screen.getAllByTestId(/^mood-chip-/)).toHaveLength(9);
    });
  });

  describe('she sets a mood and an energy and presses save once', () => {
    it('writes both into the day, in one write', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicksMood('calm');
      await shePicksMood('content');
      await sheChoosesEnergy(4);
      await shePressesSave();

      expect(dayRecordedFor(database, day).moods).toEqual(['calm', 'content']);
      expect(dayRecordedFor(database, day).energy).toBe(4);
      expect(revisionOf(database, day)).toBe(1);
    });

    it('keeps a mood out of the symptoms she logged on the same day', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicksMood('irritable');
      await shePicksSymptom('cramps');
      await shePressesSave();

      expect(dayRecordedFor(database, day).moods).toEqual(['irritable']);
      expect(dayRecordedFor(database, day).symptoms).toEqual(['cramps']);
    });

    it('counts a mood alongside a symptom in what she has picked', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('0 picked');

      await shePicksMood('calm');

      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('1 picked');

      await shePicksSymptom('cramps');

      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent('2 picked');
    });

    it('writes nothing at all until she presses save', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicksMood('calm');
      await sheChoosesEnergy(2);

      expect(readDayLog(database, day)).toBeUndefined();
    });

    it('says the day is saved, and says Save again the moment she changes her mind', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await shePicksMood('calm');
      await shePressesSave();

      expect(screen.getByTestId('log-sheet-save')).toHaveTextContent('Saved');

      await sheChoosesEnergy(3);

      expect(screen.getByTestId('log-sheet-save')).toHaveTextContent('Save');
      expect(screen.getByTestId('log-sheet-save')).not.toHaveTextContent('Saved');
    });
  });

  describe('she reopens the day she already logged', () => {
    it('comes back with her moods picked and her energy chosen, named in words', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await shePicksMood('calm');
      await shePicksMood('content');
      await sheChoosesEnergy(5);
      await shePressesSave();
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, dayRecordedFor(database, day));

      expect(screen.getByTestId('mood-chip-calm')).toBeChecked();
      expect(screen.getByTestId('mood-chip-content')).toBeChecked();
      expect(screen.getByTestId('mood-chip-tearful')).not.toBeChecked();
      expect(screen.getByTestId('energy-step-5')).toBeChecked();
      expect(screen.getByTestId('energy-chosen')).toHaveTextContent(energyName(5));
    });

    it('changes the energy and raises the revision rather than writing a second day', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheChoosesEnergy(2);
      await shePressesSave();
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, dayRecordedFor(database, day));
      await sheChoosesEnergy(4);
      await shePressesSave();

      expect(dayRecordedFor(database, day).energy).toBe(4);
      expect(revisionOf(database, day)).toBe(2);
    });

    it('drops a mood she unpicked, and leaves the day holding none', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await shePicksMood('tearful');
      await shePressesSave();
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, dayRecordedFor(database, day));
      await shePicksMood('tearful');
      await shePressesSave();

      expect(dayRecordedFor(database, day).moods).toBeUndefined();
    });

    it('clears the energy when she presses the level she already chose', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheChoosesEnergy(3);
      await shePressesSave();
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, dayRecordedFor(database, day));
      await sheChoosesEnergy(3);

      expect(screen.getByTestId('energy-chosen')).toHaveTextContent(nothingChosen);
      expect(screen.getByTestId('energy-step-3')).not.toBeChecked();

      await shePressesSave();

      expect(dayRecordedFor(database, day).energy).toBeUndefined();
    });
  });

  describe('an energy the record format does not allow', () => {
    it('is refused when it is written, rather than stored and read back wrong', () => {
      const database = migrated();
      const write = savesInto(database, pressedSaveAt);

      for (const energy of [lowestEnergy - 1, highestEnergy + 1]) {
        expect(() => write({ day, symptoms: [], moods: [], energy })).toThrow(RecordError);
        expect(() => write({ day, symptoms: [], moods: [], energy })).toThrow(
          'an energy runs from 1 to 5',
        );
      }

      expect(readDayLog(database, day)).toBeUndefined();
    });
  });

  describe('a mood slug the catalogue never held', () => {
    it('is refused when it is written, and the refusal names it', () => {
      const database = migrated();
      const write = savesInto(database, pressedSaveAt);

      expect(() => write({ day, symptoms: [], moods: ['ecstatic'] })).toThrow(
        'the catalogue holds no mood named ecstatic',
      );
      expect(readDayLog(database, day)).toBeUndefined();
    });

    it('refuses a symptom from another group, because a symptom is not a mood', () => {
      const database = migrated();
      const write = savesInto(database, pressedSaveAt);

      expect(() => write({ day, symptoms: [], moods: ['cramps'] })).toThrow(
        'the catalogue holds no mood named cramps',
      );
    });
  });

  describe('every mood chip and every energy step she presses', () => {
    it('is at least 44 points, and the failure names any that is not', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(controlsTooSmallToPress()).toEqual([]);
    });

    it('is measured against a sheet that actually holds them', async () => {
      const database = migrated();
      const withoutMoods = catalogue.filter((symptom) => symptom.group !== 'mood');
      await render(
        <LogSheet catalogue={withoutMoods} day={day} onSave={savesInto(database, pressedSaveAt)} />,
      );

      expect(controlsTooSmallToPress).toThrow('no mood chip and no energy step');
    });
  });

  describe('the mood words the symptom list used to carry', () => {
    it('is offered by the picker and by nothing else, so no word is on the sheet twice', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      for (const mood of loggableMoods()) {
        expect(screen.queryByTestId(`symptom-chip-${mood.slug}`)).toBeNull();
        expect(screen.getByTestId(`mood-chip-${mood.slug}`)).toBeTruthy();
      }
      expect(screen.getAllByTestId(/^symptom-chip-/)).toHaveLength(60);
      expect(screen.queryByTestId('symptom-group-mood')).toBeNull();
    });

    it('is not found by the symptom search either', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await fireEvent.changeText(screen.getByTestId('symptom-search'), 'irritable');

      expect(screen.queryByTestId('symptom-chip-irritable')).toBeNull();
      expect(screen.getByTestId('no-symptom-found')).toHaveTextContent(
        'No symptom matches irritable',
      );
    });

    it('stays on a day that recorded it as a symptom before the picker existed', async () => {
      const database = migrated();
      await sheOpensTheSheet(database, { symptoms: ['cramps', 'low-mood'] });

      await shePicksSymptom('acne');
      await shePressesSave();

      expect(dayRecordedFor(database, day).symptoms).toEqual(['cramps', 'low-mood', 'acne']);
      expect(dayRecordedFor(database, day).moods).toBeUndefined();
    });
  });

  describe('where mood and energy sit on the sheet', () => {
    it('is above the symptoms, because she reaches for them daily', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(orderOnScreen('mood-picker')).toBeLessThan(orderOnScreen('energy-scale'));
      expect(orderOnScreen('energy-scale')).toBeLessThan(orderOnScreen('symptom-search'));
      expect(orderOnScreen('symptom-search')).toBeLessThan(orderOnScreen('symptom-group-pain'));
    });
  });
});
