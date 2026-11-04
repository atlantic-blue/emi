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
import { daySheetRemovePeriodDayTestID } from '../../../src/features/calendar/DaySheet';
import {
  deletePeriodConfirmTestID,
  deletePeriodKeepTestID,
  deletePeriodSheetTestID,
} from '../../../src/features/calendar/DeletePeriodSheet';
import {
  editPeriodDeleteTestID,
  editPeriodRowTestID,
  editPeriodScreenTestID,
} from '../../../src/features/calendar/EditPeriodScreen';
import {
  historyCycleTestID,
  historyEditTestID,
  historyScreenTestID,
} from '../../../src/features/history/HistoryScreen';
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

const whenSheOpensIt = new Date('2026-11-01T12:00:00.000Z');

function aPeriodOf(start: string, lengthDays: number): DayRecord[] {
  return Array.from({ length: lengthDays }, (_unused, at) => aBleedingDay(addDays(start, at)));
}

const herPeriods = [
  ...aPeriodOf('2026-08-25', 5),
  ...aPeriodOf('2026-09-24', 5),
  ...aPeriodOf('2026-10-29', 3),
];

/** A period of one day she logged by mistake, with a symptom she meant to keep. */
const theWrongPeriod = '2026-10-09';
const theWrongDay: DayRecord = {
  day: theWrongPeriod,
  flow: 'light',
  symptoms: ['headache'],
  recordedAt: `${theWrongPeriod}T08:00:00.000Z`,
};

function theDayOnHerPhone(day: string): DayRecord | undefined {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? undefined : herVault().open(held.payload);
}

function herCycleStarts(): string[] {
  return listCycles(herDatabase())
    .filter((cycle) => !cycle.isPredicted)
    .map((cycle) => cycle.startedOn);
}

async function press(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheOpensTheEditorFromHistory(start: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/history' });
  await fireEvent.press(await screen.findByTestId(historyEditTestID(start)));
  await screen.findByTestId(editPeriodScreenTestID);
}

async function sheOpensTheMonthOf(day: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: `/calendar?day=${day}` });
  await screen.findByTestId(calendarScreenTestID);
}

function whatTheSquareSays(day: string): string {
  return String(screen.getByTestId(dayTestID(day)).props.accessibilityLabel);
}

/** A day record as the arithmetic and the export read it, without the moment it was written. */
function withoutTheMoment(
  record: DayRecord | undefined,
): Omit<DayRecord, 'recordedAt'> | undefined {
  if (record === undefined) {
    return undefined;
  }
  const { recordedAt: _moment, ...rest } = record;
  return rest;
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

describe('a whole period deleted from Your cycles', () => {
  it('should offer Delete this period when taking the last day off leaves nothing to save', async () => {
    await herPhoneHolds(whenSheOpensIt, [...herPeriods, theWrongDay]);
    await sheOpensTheEditorFromHistory(theWrongPeriod);

    await press(editPeriodRowTestID(theWrongPeriod));

    expect(textIn(screen.getByTestId(editPeriodDeleteTestID)).join('')).toBe('Delete this period');
  });

  it('should ask first, and then take the period out of Your cycles and the calendar', async () => {
    await herPhoneHolds(whenSheOpensIt, [...herPeriods, theWrongDay]);
    await sheOpensTheEditorFromHistory(theWrongPeriod);

    await press(editPeriodDeleteTestID);

    expect(screen.getByTestId(deletePeriodSheetTestID)).toBeTruthy();
    expect(herCycleStarts()).toContain(theWrongPeriod);

    await press(deletePeriodConfirmTestID);

    expect(await screen.findByTestId(historyScreenTestID)).toBeTruthy();
    expect(screen.queryByTestId(historyCycleTestID(theWrongPeriod))).toBeNull();
    expect(screen.getByTestId(historyCycleTestID('2026-09-24'))).toBeTruthy();
    expect(herCycleStarts()).toEqual(['2026-08-25', '2026-09-24', '2026-10-29']);
    expect(theDayOnHerPhone(theWrongPeriod)).toMatchObject({
      flow: 'none',
      symptoms: ['headache'],
    });

    await screen.unmount();
    await sheOpensTheMonthOf(theWrongPeriod);

    expect(whatTheSquareSays(theWrongPeriod)).not.toContain('you bled');
    expect(whatTheSquareSays('2026-10-08')).not.toContain('you bled');
  });

  it('should keep the period when she does not confirm', async () => {
    await herPhoneHolds(whenSheOpensIt, [...herPeriods, theWrongDay]);
    await sheOpensTheEditorFromHistory(theWrongPeriod);

    await press(editPeriodDeleteTestID);
    await press(deletePeriodKeepTestID);

    expect(screen.queryByTestId(deletePeriodSheetTestID)).toBeNull();
    expect(screen.getByTestId(editPeriodScreenTestID)).toBeTruthy();
    expect(herCycleStarts()).toContain(theWrongPeriod);
    expect(theDayOnHerPhone(theWrongPeriod)).toMatchObject({ flow: 'light' });
  });

  it('should take every day of a longer period off, and nothing around it', async () => {
    await herPhoneHolds(whenSheOpensIt, herPeriods);
    await sheOpensTheEditorFromHistory('2026-09-24');

    await press(editPeriodDeleteTestID);
    await press(deletePeriodConfirmTestID);

    expect(await screen.findByTestId(historyScreenTestID)).toBeTruthy();
    expect(herCycleStarts()).toEqual(['2026-08-25', '2026-10-29']);
    for (const day of aPeriodOf('2026-09-24', 5).map((each) => each.day)) {
      expect(theDayOnHerPhone(day)?.flow).toBe('none');
    }
    expect(theDayOnHerPhone('2026-09-29')).toBeUndefined();
    expect(theDayOnHerPhone('2026-08-25')?.flow).toBe('medium');
  });

  it('should leave the same day record as Remove period day on the calendar', async () => {
    await herPhoneHolds(whenSheOpensIt, [...herPeriods, theWrongDay]);
    await sheOpensTheMonthOf(theWrongPeriod);
    await press(dayTestID(theWrongPeriod));
    await press(daySheetRemovePeriodDayTestID);
    const fromTheCalendar = withoutTheMoment(theDayOnHerPhone(theWrongPeriod));
    const startsFromTheCalendar = herCycleStarts();
    await screen.unmount();

    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHolds(whenSheOpensIt, [...herPeriods, theWrongDay]);
    await sheOpensTheEditorFromHistory(theWrongPeriod);
    await press(editPeriodDeleteTestID);
    await press(deletePeriodConfirmTestID);
    await screen.findByTestId(historyScreenTestID);

    expect(withoutTheMoment(theDayOnHerPhone(theWrongPeriod))).toEqual(fromTheCalendar);
    expect(herCycleStarts()).toEqual(startsFromTheCalendar);
  });

  it('should not offer a delete where Emi holds no day of the period', async () => {
    await herPhoneHolds(whenSheOpensIt, herPeriods);
    await renderRouter(appDirectory, { initialUrl: '/calendar/period?day=2026-10-15' });
    await screen.findByTestId(editPeriodScreenTestID);

    expect(screen.queryByTestId(editPeriodDeleteTestID)).toBeNull();
  });
});

describe('the words of the delete', () => {
  it('should say it in Spanish and in Russian', () => {
    expect(english['calendar.editPeriod.delete']).toBe('Delete this period');
    expect(spanish['calendar.editPeriod.delete']).toBe('Eliminar este periodo');
    expect(russian['calendar.editPeriod.delete']).toBe('Удалить эти месячные');
  });
});
