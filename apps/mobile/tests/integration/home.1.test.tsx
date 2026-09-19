import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { colour } from '@emi/tokens';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { render } from '@testing-library/react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import {
  WeekStrip,
  weekDayTestID,
  weekDiscTestID,
  weekStripTestID,
} from '../../src/features/home/WeekStrip';
import type { StripDay } from '../../src/features/home/weekStrip';
import { flowOptionTestID } from '../../src/features/log/FlowPicker';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

const herCycleLengthDays = 28;
const herPeriodDays = 4;

/** Six periods, twenty eight days apart, the last of them starting on the day named. */
function herSixPeriods(lastStarted: string): DayRecord[] {
  const records: DayRecord[] = [];

  for (let back = 5; back >= 0; back -= 1) {
    const started = addDays(lastStarted, -back * herCycleLengthDays);

    for (let day = 0; day < herPeriodDays; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  return records;
}

/** She is on day four of her period, so the week holds all four days of it and three before. */
const herPeriodStarted = addDays(today, -3);

/** A woman whose period has not come: the days it may start on are in the week behind her. */
const theCycleSheIsLateIn = addDays(today, -31);

async function sheOpensEmi(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  await app;

  return { pathname: () => app.getPathname() };
}

function theColumn(day: string): string[] {
  return screen
    .getByTestId(weekDayTestID(day))
    .children.flatMap((child) => (typeof child === 'string' ? [child] : textOf(child)));
}

function textOf(node: unknown): string[] {
  if (typeof node === 'string') {
    return [node];
  }
  if (node !== null && typeof node === 'object' && 'children' in node) {
    return (node as { children: unknown[] }).children.flatMap(textOf);
  }
  return [];
}

function discStyle(day: string): Record<string, unknown> {
  const disc = screen.getByTestId(weekDiscTestID(day));

  return (StyleSheet.flatten(disc.props.style) ?? {}) as Record<string, unknown>;
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick'] }).setSystemTime(whenSheOpensIt);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  resetExpoSqlite();
  resetExpoSecureStore();
});

describe('a week strip above the ring', () => {
  describe('what the week says about her days', () => {
    beforeEach(async () => {
      await herPhoneHolds(
        new Date('2026-01-01T12:00:00.000Z'),
        herSixPeriods(herPeriodStarted),
        herCycleLengthDays,
      );
    });

    it('draws seven days ending on today, above the ring', async () => {
      await sheOpensEmi();

      const strip = screen.getByTestId(weekStripTestID);

      expect(strip.children).toHaveLength(7);
      expect(screen.getByTestId(weekDayTestID(today))).toBeTruthy();
      expect(screen.queryByTestId(weekDayTestID(addDays(today, -7)))).toBeNull();
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
    });

    it('carries the cycle day above each date', async () => {
      await sheOpensEmi();

      // The period started three days back, so today is the fourth day of her cycle.
      expect(theColumn(today)).toContain('4');
      // Four days back is the day before her period, which is the last day of the cycle before it.
      expect(theColumn(addDays(today, -4))).toContain('28');
    });

    it('fills the disc of a day she bled and puts its period day number in it', async () => {
      await sheOpensEmi();

      expect(discStyle(herPeriodStarted).backgroundColor).toBe(colour.emberTint);
      expect(theColumn(herPeriodStarted)).toContain('1');
      expect(theColumn(today)).toContain('4');
    });

    it('leaves the disc of a day before that period carrying its date', async () => {
      const before = addDays(herPeriodStarted, -1);
      await sheOpensEmi();

      expect(discStyle(before).backgroundColor).toBeUndefined();
      expect(theColumn(before)).toContain(String(Number(before.slice(8, 10))));
    });

    it('draws a line around today and around no other day', async () => {
      await sheOpensEmi();

      expect(discStyle(today).borderColor).toBe(colour.ember);
      expect(discStyle(addDays(today, -1)).borderColor).not.toBe(colour.ember);
    });

    it('says the day, the cycle day and the period day to a screen reader', async () => {
      await sheOpensEmi();

      expect(screen.getByTestId(weekDayTestID(today)).props.accessibilityLabel).toBe(
        'Today, cycle day 4, period day 4',
      );
    });

    it('takes a press anywhere on a column, which is at least 44 points', async () => {
      await sheOpensEmi();

      expect(
        controlsTooSmallToPress(screen.getByTestId(weekStripTestID).children as never[]),
      ).toEqual([]);
    });

    it('opens that day at its own address, and she is looking at what she logged', async () => {
      const app = await sheOpensEmi();
      const yesterday = addDays(today, -1);

      await fireEvent.press(screen.getByTestId(weekDayTestID(yesterday)));

      expect(app.pathname()).toBe(`/day/${yesterday}`);
      expect(screen.getByTestId(flowOptionTestID('medium'))).toBeTruthy();
    });
  });

  describe('a day she has not lived', () => {
    /**
     * The strip ends on today, so nothing it is handed today can be a day ahead. The rule is here
     * rather than in the week it is given, so a later section that widens the window cannot make
     * the screen take a press on a day she has not reached.
     */
    const tomorrow: StripDay = {
      day: addDays(today, 1),
      letter: 'F',
      dateNumber: 15,
      cycleDay: 5,
      periodDay: undefined,
      forecastPeriod: false,
      isToday: false,
    };

    it('takes no press', async () => {
      const opened: string[] = [];

      await render(
        <WeekStrip onOpenDay={(day) => opened.push(day)} today={today} week={[tomorrow]} />,
      );
      await fireEvent.press(screen.getByTestId(weekDayTestID(tomorrow.day)));

      expect(opened).toEqual([]);
      expect(screen.getByTestId(weekDayTestID(tomorrow.day)).props.accessibilityState).toEqual({
        disabled: true,
      });
    });
  });

  describe('when her period has not come', () => {
    it('draws a dotted outline on the days it may start on', async () => {
      await herPhoneHolds(
        new Date('2026-01-01T12:00:00.000Z'),
        herSixPeriods(theCycleSheIsLateIn),
        herCycleLengthDays,
      );
      await sheOpensEmi();

      const mayStart = addDays(theCycleSheIsLateIn, 28);

      expect(discStyle(mayStart).borderStyle).toBe('dotted');
      expect(discStyle(addDays(theCycleSheIsLateIn, 25)).borderStyle).toBe('solid');
    });
  });
});
