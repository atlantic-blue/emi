import { join } from 'node:path';

import { type DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

const herCycleLengthDays = 28;
const herPeriodDays = 4;
const herLastPeriodStarted = '2026-04-13';

/** Six periods of four days, twenty eight days apart, the last of them the cycle she is in. */
function herSixPeriods(): DayRecord[] {
  const records: DayRecord[] = [];

  for (let back = 5; back >= 0; back -= 1) {
    const started = addDays(herLastPeriodStarted, -back * herCycleLengthDays);

    for (let day = 0; day < herPeriodDays; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  return records;
}

const theRingToday = 'Day 32 of 32, luteal';

const threeDatesShePresses = [
  { date: addDays(herLastPeriodStarted, 1), theRingSays: 'Day 2 of 28, period' },
  { date: addDays(herLastPeriodStarted, 8), theRingSays: 'Day 9 of 28, follicular' },
  { date: addDays(herLastPeriodStarted, 21), theRingSays: 'Day 22 of 28, luteal' },
] as const;

async function sheOpens(day: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: `/day/${day}` });
}

function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
}

describe('the day entry header reads the date that is open', () => {
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

  it.each(threeDatesShePresses)(
    'names the cycle day and phase of $date',
    async ({ date, theRingSays: expected }) => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());

      await sheOpens(date);

      expect(theRingSays()).toBe(expected);
    },
  );

  it('gives three dates three different readings, none of them today', async () => {
    const readings: string[] = [];

    for (const { date } of threeDatesShePresses) {
      resetExpoSqlite();
      resetExpoSecureStore();
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens(date);
      readings.push(theRingSays());
      screen.unmount();
    }

    expect(new Set(readings).size).toBe(3);
    expect(readings).not.toContain(theRingToday);
  });

  it('still reads today as the cycle she is in now', async () => {
    await herPhoneHolds(whenSheOpensIt, herSixPeriods());

    await sheOpens(today);

    expect(theRingSays()).toBe(theRingToday);
  });
});
