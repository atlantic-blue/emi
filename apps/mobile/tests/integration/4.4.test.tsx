import { RecordError } from '@emi/crypto';
import {
  type ChosenUnits,
  rangeIn,
  storedUnits,
  temperature,
  temperatureUnits,
  weight,
  weightReading,
  weightUnits,
} from '@emi/cycle';
import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { Database } from '../../src/data/database';
import { readDayLog } from '../../src/data/dayLogRepository';
import { readSetting } from '../../src/data/settingRepository';
import { migrate } from '../../src/data/schema';
import { LogSheet } from '../../src/features/log/LogSheet';
import { chooseUnits, chosenUnits } from '../../src/features/log/units';
import { Weight } from '../../src/features/log/Weight';
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

/**
 * The screen that hosts the sheet, until the one in the path is built. It reads the unit she chose
 * out of the setting table and writes it back there, so every switch in this file goes through the
 * database she actually has.
 */
function HostedSheet({ database, held }: { database: Database; held: Partial<DayRecord> }) {
  const [units, setUnits] = useState<ChosenUnits>(() => chosenUnits(database));

  function choose(chosen: ChosenUnits): void {
    chooseUnits(database, chosen);
    setUnits(chosenUnits(database));
  }

  return (
    <LogSheet
      day={day}
      energy={held.energy}
      moods={held.moods ?? []}
      onChooseUnits={choose}
      onSave={savesInto(database, pressedSaveAt)}
      symptoms={held.symptoms ?? []}
      temperatureCelsius={held.temperatureCelsius}
      units={units}
      weightKilograms={held.weightKilograms}
    />
  );
}

async function sheOpensTheSheet(database: Database, held: Partial<DayRecord> = {}): Promise<void> {
  await render(<HostedSheet database={database} held={held} />);
}

async function sheClosesTheSheet(): Promise<void> {
  await cleanup();
}

async function sheTypesTemperature(typed: string): Promise<void> {
  await fireEvent.changeText(screen.getByTestId('temperature-value'), typed);
}

async function sheTypesWeight(typed: string): Promise<void> {
  await fireEvent.changeText(screen.getByTestId('weight-value'), typed);
}

async function sheSwitchesTemperatureTo(unit: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(`temperature-unit-${unit}`));
}

async function sheSwitchesWeightTo(unit: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(`weight-unit-${unit}`));
}

async function shePressesSave(): Promise<void> {
  await fireEvent.press(screen.getByTestId('log-sheet-save'));
}

function shownTemperature(): string {
  return String(screen.getByTestId('temperature-value').props.value);
}

function shownWeight(): string {
  return String(screen.getByTestId('weight-value').props.value);
}

function dayRecordedFor(database: Database, forDay: string): DayRecord {
  const row = readDayLog(database, forDay);
  if (!row) {
    throw new Error(`${forDay} was saved and could not be read back`);
  }
  return recordFromBytes(row.payload);
}

/** The bytes on disk, which is the thing a unit setting must never be able to move. */
function storedBytesFor(database: Database, forDay: string): string {
  const row = readDayLog(database, forDay);
  if (!row) {
    throw new Error(`${forDay} was saved and could not be read back`);
  }
  return `${row.revision}:${[...row.payload].join(',')}`;
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
 * Every unit control that is too small to press, named with its size. A screen carrying fewer of
 * them than the sheet offers is a measurement of the wrong thing, so it fails rather than
 * reporting an empty list.
 */
function unitControlsTooSmallToPress(): string[] {
  const controls = screen.queryAllByTestId(/-unit-/);
  if (controls.length < temperatureUnits.length + weightUnits.length) {
    throw new Error('fewer unit controls than the whole sheet offers were measured');
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

describe('changing the unit setting does not change a stored measurement', () => {
  describe('the unit a day is written in', () => {
    it('is Celsius and kilograms before she has chosen anything', async () => {
      const database = migrated();

      expect(chosenUnits(database)).toEqual(storedUnits);
      expect(readSetting(database, 'temperatureUnit')).toBeUndefined();

      await sheOpensTheSheet(database);

      expect(screen.getByTestId('temperature-unit-celsius')).toBeChecked();
      expect(screen.getByTestId('weight-unit-kilograms')).toBeChecked();
    });

    it('is Celsius and kilograms after she chose to read in the other one', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSwitchesTemperatureTo('fahrenheit');
      await sheSwitchesWeightTo('pounds');
      await sheTypesTemperature('97.9');
      await sheTypesWeight('141.5');
      await shePressesSave();

      expect(dayRecordedFor(database, day).temperatureCelsius).toBe(36.6);
      expect(dayRecordedFor(database, day).weightKilograms).toBe(64.2);
      expect(readSetting(database, 'temperatureUnit')).toBe('fahrenheit');
      expect(readSetting(database, 'weightUnit')).toBe('pounds');
    });
  });

  describe('she enters a temperature in Fahrenheit and switches the setting to Celsius', () => {
    it('leaves the stored day exactly as it was, and converts what she is shown', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheSwitchesTemperatureTo('fahrenheit');
      await sheTypesTemperature('97.9');
      await shePressesSave();

      const asStored = storedBytesFor(database, day);
      expect(dayRecordedFor(database, day).temperatureCelsius).toBe(36.6);
      expect(shownTemperature()).toBe('97.9');

      await sheSwitchesTemperatureTo('celsius');

      expect(shownTemperature()).toBe('36.6');
      expect(storedBytesFor(database, day)).toBe(asStored);
    });

    it('carries the same reading back when she reopens the day in the other unit', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheSwitchesTemperatureTo('fahrenheit');
      await sheTypesTemperature('97.9');
      await shePressesSave();
      const asStored = storedBytesFor(database, day);
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, dayRecordedFor(database, day));

      expect(shownTemperature()).toBe('97.9');
      expect(screen.getByTestId('temperature-unit-fahrenheit')).toBeChecked();
      expect(storedBytesFor(database, day)).toBe(asStored);
    });

    it('never writes a record while she is only changing the unit she reads', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheTypesTemperature('36.6');
      await sheSwitchesTemperatureTo('fahrenheit');

      expect(shownTemperature()).toBe('97.9');
      expect(readDayLog(database, day)).toBeUndefined();
    });
  });

  describe('she enters a weight in pounds and switches the setting to kilograms', () => {
    it('leaves the stored day exactly as it was, and converts what she is shown', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheSwitchesWeightTo('pounds');
      await sheTypesWeight('141.5');
      await shePressesSave();

      const asStored = storedBytesFor(database, day);
      expect(dayRecordedFor(database, day).weightKilograms).toBe(64.2);

      await sheSwitchesWeightTo('kilograms');

      expect(shownWeight()).toBe('64.2');
      expect(storedBytesFor(database, day)).toBe(asStored);
    });

    it('switches one measurement without switching the other', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheSwitchesWeightTo('pounds');

      expect(screen.getByTestId('weight-unit-pounds')).toBeChecked();
      expect(screen.getByTestId('temperature-unit-celsius')).toBeChecked();
      expect(chosenUnits(database)).toEqual({ temperature: 'celsius', weight: 'pounds' });
    });
  });

  describe('a reading no body produces', () => {
    it('refuses the save, and the refusal names the range in the unit she is reading', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheTypesTemperature('43.0');

      expect(screen.getByTestId('temperature-refusal')).toHaveTextContent(
        'a temperature runs from 34.0 to 42.0 °C, this one is 43.0',
      );

      await shePressesSave();

      expect(readDayLog(database, day)).toBeUndefined();
    });

    it('names the range in Fahrenheit when that is what she is reading', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheSwitchesTemperatureTo('fahrenheit');

      await sheTypesTemperature('110.0');

      expect(screen.getByTestId('temperature-refusal')).toHaveTextContent(
        `a temperature runs from ${rangeIn(temperature, 'fahrenheit').lowest.toFixed(1)} to ` +
          `${rangeIn(temperature, 'fahrenheit').highest.toFixed(1)} °F, this one is 110.0`,
      );
    });

    it('refuses a weight the same way, and lets her correct it and save', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await sheTypesWeight('900.0');

      expect(screen.getByTestId('weight-refusal')).toHaveTextContent(
        `a weight runs from ${rangeIn(weight, 'kilograms').lowest.toFixed(1)} to ` +
          `${rangeIn(weight, 'kilograms').highest.toFixed(1)} kg, this one is 900.0`,
      );

      await sheTypesWeight('90.0');

      expect(screen.queryByTestId('weight-refusal')).toBeNull();

      await shePressesSave();

      expect(dayRecordedFor(database, day).weightKilograms).toBe(90);
    });

    it('stops the whole sheet rather than dropping the reading out of the write', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      await sheTypesTemperature('43.0');
      await shePressesSave();

      expect(readDayLog(database, day)).toBeUndefined();
      expect(screen.getByTestId('log-sheet-count')).toHaveTextContent(
        'a temperature runs from 34.0 to 42.0 °C, this one is 43.0',
      );
    });

    it('is refused by the record format too, so no screen is the only thing standing there', () => {
      const database = migrated();
      const write = savesInto(database, pressedSaveAt);

      expect(() => write({ day, symptoms: [], moods: [], temperatureCelsius: 43 })).toThrow(
        RecordError,
      );
      expect(() => write({ day, symptoms: [], moods: [], weightKilograms: 401 })).toThrow(
        'a weight runs from 20.0 to 400.0',
      );
      expect(readDayLog(database, day)).toBeUndefined();
    });
  });

  describe('a day she reopens', () => {
    it('comes back with both readings, and saves again without changing them', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheTypesTemperature('36.6');
      await sheTypesWeight('64.2');
      await shePressesSave();
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, dayRecordedFor(database, day));

      expect(shownTemperature()).toBe('36.6');
      expect(shownWeight()).toBe('64.2');

      await shePressesSave();

      expect(dayRecordedFor(database, day).temperatureCelsius).toBe(36.6);
      expect(dayRecordedFor(database, day).weightKilograms).toBe(64.2);
      expect(readDayLog(database, day)?.revision).toBe(2);
    });

    it('holds no measurement at all on a day she logged nothing but a symptom', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      await fireEvent.press(screen.getByTestId('symptom-chip-cramps'));
      await shePressesSave();

      expect(dayRecordedFor(database, day).temperatureCelsius).toBeUndefined();
      expect(dayRecordedFor(database, day).weightKilograms).toBeUndefined();
      expect(shownTemperature()).toBe('');
    });

    it('clears a reading she emptied, rather than keeping the one it held', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);
      await sheTypesTemperature('36.6');
      await shePressesSave();
      await sheClosesTheSheet();

      await sheOpensTheSheet(database, dayRecordedFor(database, day));
      await sheTypesTemperature('');
      await shePressesSave();

      expect(dayRecordedFor(database, day).temperatureCelsius).toBeUndefined();
    });
  });

  describe('every control that switches a unit', () => {
    it('is at least 44 points, and the failure names any that is not', async () => {
      const database = migrated();
      await sheOpensTheSheet(database);

      expect(unitControlsTooSmallToPress()).toEqual([]);
    });

    it('is measured against a screen that actually offers them', async () => {
      await render(
        <Weight
          onChooseUnit={() => {}}
          onRead={() => {}}
          reading={weightReading('64.2', 'kilograms')}
          unit="kilograms"
        />,
      );

      expect(screen.getAllByTestId(/-unit-/)).toHaveLength(weightUnits.length);
      expect(unitControlsTooSmallToPress).toThrow('fewer unit controls');
    });
  });
});
