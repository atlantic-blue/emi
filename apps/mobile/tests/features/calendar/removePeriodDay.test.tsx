import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../../src/data/cycleRepository';
import { readDayLog } from '../../../src/data/dayLogRepository';
import { calendarScreenTestID } from '../../../src/features/calendar/CalendarScreen';
import { dayTestID } from '../../../src/features/calendar/CycleMonth';
import {
  daySheetLineTestID,
  daySheetRemovePeriodDayTestID,
} from '../../../src/features/calendar/DaySheet';
import { english, russian, spanish } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, herDatabase, herPhoneHolds } from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';
import { textIn } from '../../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = '2026-10-12';

function aPeriodOf(start: string, lengthDays: number): DayRecord[] {
  return Array.from({ length: lengthDays }, (_unused, at) => aBleedingDay(addDays(start, at)));
}

const herPeriods = [
  ...aPeriodOf('2026-07-29', 4),
  ...aPeriodOf('2026-08-26', 4),
  ...aPeriodOf('2026-09-23', 4),
];

/** A day in a past month she marked as a period by mistake, with a symptom she meant to keep. */
const theWrongDay = '2026-09-08';
const theWrongDayRecord: DayRecord = {
  day: theWrongDay,
  flow: 'medium',
  symptoms: ['headache'],
  recordedAt: `${theWrongDay}T08:00:00.000Z`,
};

async function sheOpensTheMonthOf(day: string, records: readonly DayRecord[]): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, records);
  await renderRouter(appDirectory, { initialUrl: `/calendar?day=${day}` });
  await screen.findByTestId(calendarScreenTestID);
}

async function press(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function theDayOnHerPhone(day: string): DayRecord | undefined {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? undefined : herVault().open(held.payload);
}

function whatTheSquareSays(day: string): string {
  return String(screen.getByTestId(dayTestID(day)).props.accessibilityLabel);
}

function herCycleStarts(): string[] {
  return listCycles(herDatabase())
    .filter((cycle) => !cycle.isPredicted)
    .map((cycle) => cycle.startedOn);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  resetExpoSqlite();
  resetExpoSecureStore();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a wrong period day removed from the calendar day', () => {
  it('should take the bleeding off that day in one press and keep the rest of it', async () => {
    await sheOpensTheMonthOf(theWrongDay, [...herPeriods, theWrongDayRecord]);
    await press(dayTestID(theWrongDay));

    expect(herCycleStarts()).toContain(theWrongDay);
    expect(whatTheSquareSays(theWrongDay)).toContain('you bled');
    expect(textIn(screen.getByTestId(daySheetRemovePeriodDayTestID)).join('')).toBe(
      'Remove period day',
    );

    await press(daySheetRemovePeriodDayTestID);

    expect(theDayOnHerPhone(theWrongDay)).toMatchObject({ flow: 'none', symptoms: ['headache'] });
    expect(herCycleStarts()).toEqual(['2026-07-29', '2026-08-26', '2026-09-23']);
  });

  it('should leave the month and the card without the day, and every other day as it was', async () => {
    await sheOpensTheMonthOf(theWrongDay, [...herPeriods, theWrongDayRecord]);
    await press(dayTestID(theWrongDay));
    await press(daySheetRemovePeriodDayTestID);

    expect(whatTheSquareSays(theWrongDay)).not.toContain('you bled');
    expect(whatTheSquareSays(theWrongDay)).toContain('cycle day 14');
    expect(whatTheSquareSays('2026-09-09')).toContain('cycle day 15');
    expect(screen.queryByTestId(daySheetRemovePeriodDayTestID)).toBeNull();
    expect(textIn(screen.getByTestId(daySheetLineTestID)).join('')).toBe(
      'Day 14, ovulation. No bleeding and headache',
    );
    for (const day of aPeriodOf('2026-09-23', 4).map((each) => each.day)) {
      expect(whatTheSquareSays(day)).toContain('you bled');
    }
  });

  it('should start the period on the next day when she removes its first day', async () => {
    await sheOpensTheMonthOf('2026-09-23', herPeriods);
    await press(dayTestID('2026-09-23'));
    await press(daySheetRemovePeriodDayTestID);

    expect(herCycleStarts()).toEqual(['2026-07-29', '2026-08-26', '2026-09-24']);
    expect(whatTheSquareSays('2026-09-24')).toContain('cycle day 1,');
  });

  it('should put her back in the cycle before when she removes the only day of her last period', async () => {
    await sheOpensTheMonthOf('2026-10-05', [...herPeriods, aBleedingDay('2026-10-05')]);
    await press(dayTestID('2026-10-05'));

    expect(herCycleStarts().at(-1)).toBe('2026-10-05');

    await press(daySheetRemovePeriodDayTestID);

    expect(herCycleStarts().at(-1)).toBe('2026-09-23');
    expect(whatTheSquareSays(today)).toContain('cycle day 20');
  });

  it('should carry no remove on a day she recorded no bleeding on, or on a day ahead of her', async () => {
    await sheOpensTheMonthOf(today, herPeriods);

    await press(dayTestID('2026-10-06'));
    expect(screen.queryByTestId(daySheetRemovePeriodDayTestID)).toBeNull();

    await press(dayTestID('2026-10-20'));
    expect(screen.queryByTestId(daySheetRemovePeriodDayTestID)).toBeNull();
  });
});

describe('the words of the link', () => {
  it('should say it in Spanish and in Russian', () => {
    expect(english['calendar.screen.removePeriodDay']).toBe('Remove period day');
    expect(spanish['calendar.screen.removePeriodDay']).toBe('Quitar día de periodo');
    expect(russian['calendar.screen.removePeriodDay']).toBe('Убрать день месячных');
  });
});
