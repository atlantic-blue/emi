import { join } from 'node:path';

import { colour } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import {
  dateDiscTestID,
  dateTestID,
  dayTestID,
  legendDotTestID,
  legendTestID,
} from '../../../src/features/calendar/CycleMonth';
import { listCycles } from '../../../src/data/cycleRepository';
import { herDaysOn } from '../../../src/features/cycle/herWeek';
import { recordedDays } from '../../../src/features/cycle/rebuild';
import { english } from '../../../src/language/english';
import { russian } from '../../../src/language/russian';
import { spanish } from '../../../src/language/spanish';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { daysLogged } from '../../fixtures/cycleCache';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { herVault } from '../../fixtures/herVault';
import { aBleedingDay, herPhoneHolds } from '../../fixtures/herPhone';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * Issue 379, step 2: the month draws the days Emi expects of the period she is in with a soft
 * fill, and the legend names them.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date(2026, 9, 8, 12, 0);
const herCycleRuns = 28;
const herPeriodRuns = 5;

async function sheOpensTheMonthWith(firstDay: string, periodLengthDays?: number): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, [aBleedingDay(firstDay)], herCycleRuns, periodLengthDays);
  await renderRouter(appDirectory, { initialUrl: '/calendar' });
  await screen.findByTestId(dayTestID(firstDay));
}

function theFillOf(day: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(dateDiscTestID(day)).props.style).backgroundColor;
}

function theInkOf(day: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(dateTestID(day)).props.style).color;
}

function whatIsSaidOf(day: string): string {
  return String(screen.getByTestId(dayTestID(day)).props.accessibilityLabel);
}

describe('the month draws the days Emi expects of her period', () => {
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

  it('fills the four days after a first day with the soft fill, and leaves the day after them plain', async () => {
    await sheOpensTheMonthWith('2026-10-01', herPeriodRuns);

    expect(theFillOf('2026-10-01')).toBe(colour.period);
    for (const day of ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']) {
      expect(theFillOf(day)).toBe(colour.accentSoft);
      expect(theInkOf(day)).toBe(colour.accentSoftInk);
      expect(whatIsSaidOf(day)).toContain(english['cycle.day.filledIn']);
    }
    expect(theFillOf('2026-10-06')).toBeUndefined();
    expect(whatIsSaidOf('2026-10-06')).not.toContain(english['cycle.day.filledIn']);
  });

  it('fills the expected days ahead of today too, in place of the broken line', async () => {
    await sheOpensTheMonthWith('2026-10-07', herPeriodRuns);

    for (const day of ['2026-10-09', '2026-10-10', '2026-10-11']) {
      expect(theFillOf(day)).toBe(colour.accentSoft);
      expect(
        StyleSheet.flatten(screen.getByTestId(dateDiscTestID(day)).props.style).borderStyle,
      ).not.toBe('dashed');
    }
    expect(theFillOf('2026-10-12')).toBeUndefined();
  });

  it('fills nothing when she said she is not sure how long her period runs', async () => {
    await sheOpensTheMonthWith('2026-10-01');

    expect(theFillOf('2026-10-02')).toBeUndefined();
    expect(whatIsSaidOf('2026-10-02')).not.toContain(english['cycle.day.filledIn']);
  });

  it('names the expected days in the legend, with the same soft fill', async () => {
    await sheOpensTheMonthWith('2026-10-01', herPeriodRuns);

    expect(screen.getByTestId(legendTestID('expected'))).toHaveTextContent(
      english['calendar.legend.expected'],
    );
    expect(
      StyleSheet.flatten(screen.getByTestId(legendDotTestID('expected')).props.style),
    ).toMatchObject({
      backgroundColor: colour.accentSoft,
    });
  });
});

describe('the mark of a day', () => {
  function theMarksFrom(firstDay: string, today: string): Record<string, string> {
    const database = daysLogged([aBleedingDay(firstDay)], new Date(`${today}T20:00:00.000Z`));
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'];

    return Object.fromEntries(
      herDaysOn(
        {
          cycles: listCycles(database),
          records: recordedDays(database, (payload) => herVault().open(payload)),
          statedCycleLengthDays: herCycleRuns,
          statedPeriodLengthDays: herPeriodRuns,
          today,
        },
        days,
      ).map((day) => [day.day, day.mark]),
    );
  }

  it('is expected on the days Emi fills in, and today keeps its ring', () => {
    expect(theMarksFrom('2026-10-01', '2026-10-03')).toEqual({
      '2026-10-01': 'bled',
      '2026-10-02': 'expected',
      '2026-10-03': 'today',
      '2026-10-05': 'expected',
      '2026-10-06': 'plain',
    });
  });
});

describe('the words for the expected days', () => {
  it('are written in English, Spanish and Russian', () => {
    expect(english['calendar.legend.expected']).toBe('Expected');
    expect(spanish['calendar.legend.expected']).toBe('Previsto');
    expect(russian['calendar.legend.expected']).toBe('Ожидаемые');
    expect(english['cycle.day.filledIn']).toBe('Emi filled in this day');
    expect(spanish['cycle.day.filledIn']).toBe('Emi completó este día');
    expect(russian['cycle.day.filledIn']).toBe('Emi отметила этот день');
  });
});
