import { join } from 'node:path';

import { type DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { colour, phasePalette } from '@emi/tokens';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { readDayLog } from '../../src/data/dayLogRepository';
import { flowOptionTestID } from '../../src/features/log/FlowPicker';
import { logFlowDoneTestID } from '../../src/features/log/LogFlow';
import {
  historyArcTestID,
  historyBackTestID,
  historyCycleTestID,
  historyCyclesTestID,
  historyPatternPhaseTestID,
  historyPatternTestID,
  historyPatternsTestID,
  historyScreenTestID,
  historyWaitingTestID,
} from '../../src/features/history/HistoryScreen';
import { historyCopy, patternsWaitingSentence } from '../../src/features/history/copy';
import { historyNeedsCycles } from '../../src/features/history/historyNow';
import { historyTestID } from '../../src/features/home/HomeScreen';
import { resetExpoSqlite } from '../data/expoSqlite';
import { herVault } from '../fixtures/herVault';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { colourOf, textDrawnOnAPhaseFill } from '../fixtures/phaseInk';
import { textIn } from '../fixtures/renderedText';
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

/** Thirteen days behind her, so the cycle she is in today is nowhere near its end. */
const herLastPeriodStarted = addDays(today, -13);

/**
 * Seven periods, twenty eight days apart, four days of bleeding each. Six cycles are complete
 * behind her and the seventh is the one she is in, which is the window the screen reads back.
 */
const herPeriodStarts: readonly string[] = [6, 5, 4, 3, 2, 1, 0].map((back) =>
  addDays(herLastPeriodStarted, -back * herCycleLengthDays),
);

/** The six periods that closed a cycle, which is what a day before them is counted against. */
const thePeriodsThatClosedACycle = herPeriodStarts.slice(1);

/** The first day of each complete cycle, most recent first, as the screen lists them. */
const herCompleteCyclesNewestFirst = [...herPeriodStarts.slice(0, 6)].reverse();

const crampsCameBack = 3;
const theCrampDays = thePeriodsThatClosedACycle.map((period) => addDays(period, -crampsCameBack));

/** One headache, in the oldest cycle, which is the coincidence this screen must not name. */
const theOneHeadache = addDays(thePeriodsThatClosedACycle[0] as string, -5);

/** The same symptom, in two cycles only, which is one short of the floor. */
const theTwoNauseousDays = thePeriodsThatClosedACycle
  .slice(-2)
  .map((period) => addDays(period, -6));

function aDayOf(day: string, symptoms: readonly string[]): DayRecord {
  return { day, symptoms: [...symptoms], recordedAt: `${day}T20:00:00.000Z` };
}

function herBleedingDays(): DayRecord[] {
  return herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodDays }, (_unused, day) => aBleedingDay(addDays(start, day))),
  );
}

/** Her year: seven periods, cramps before six of them, one headache, two days of nausea. */
function herYear(): DayRecord[] {
  return [
    ...herBleedingDays(),
    ...theCrampDays.map((day) => aDayOf(day, ['cramps'])),
    aDayOf(theOneHeadache, ['headache']),
    ...theTwoNauseousDays.map((day) => aDayOf(day, ['nausea'])),
  ];
}

/** Two periods and nothing else, which is fewer cycles than a pattern may be read from. */
function herFirstWeeks(): DayRecord[] {
  return herPeriodStarts
    .slice(-2)
    .flatMap((start) =>
      Array.from({ length: herPeriodDays }, (_unused, day) => aBleedingDay(addDays(start, day))),
    );
}

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheOpensHerHistory(): Promise<OpenApp> {
  const app = await sheOpensEmi();
  await shePresses(historyTestID);

  return app;
}

function whatOneRowSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** The cycle rows in the order they are drawn, because the order is what she reads first. */
function theCycleRowsInOrder(): string[] {
  return screen
    .getAllByRole('button')
    .map((control) => String(control.props.testID))
    .filter((testID) => testID.startsWith('history-cycle-'));
}

/** The days one arc covers, read off the drawing rather than off the arithmetic behind it. */
function theDaysOfTheArc(testID: string): number {
  const style = StyleSheet.flatten(screen.getByTestId(testID).props.style) as { flexGrow?: number };

  return style.flexGrow ?? 0;
}

function everyControlOnTheScreen() {
  return [...screen.queryAllByRole('button'), ...screen.queryAllByRole('radio')];
}

function whatWasRecordedOn(day: string): DayRecord | undefined {
  const row = readDayLog(herDatabase(), day);

  return row ? herVault().open(row.payload) : undefined;
}

describe('a recurring symptom is named and a one off is not', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement belongs to step 2.4. Here it arrives already open, so what the test
    // reads off a screen is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the symptom that came back before every period', () => {
    it('names the symptom, the day it lands on and the cycles behind it', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());

      await sheOpensHerHistory();

      expect(whatOneRowSays(historyPatternTestID('cramps'))).toBe(
        'Cramps About 3 days before your period, in 6 of your last 6 cycles Luteal',
      );
    });

    it('opens the day she last logged it, so a pattern she disagrees with is a day she can fix', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());
      const app = await sheOpensHerHistory();

      await shePresses(historyPatternTestID('cramps'));

      expect(app.pathname()).toBe(`/day/${theCrampDays[theCrampDays.length - 1] as string}`);
      expect(whatWasRecordedOn(theCrampDays[theCrampDays.length - 1] as string)?.symptoms).toEqual([
        'cramps',
      ]);
    });
  });

  describe('the symptom that happened once', () => {
    it('is not named on the screen at all, because once is not a pattern', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());

      await sheOpensHerHistory();

      expect(screen.queryByTestId(historyPatternTestID('headache'))).toBeNull();
      expect(textIn(screen.toJSON())).not.toContain('Headache');
    });

    it('is still not named after it came back a second time, one short of the floor', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());

      await sheOpensHerHistory();

      expect(historyNeedsCycles).toBe(3);
      expect(screen.queryByTestId(historyPatternTestID('nausea'))).toBeNull();
      expect(textIn(screen.getByTestId(historyPatternsTestID))).not.toContain('Nausea');
    });

    it('says how many of her cycles are complete while there are too few to read', async () => {
      await herPhoneHolds(whenSheOpensIt, herFirstWeeks());

      await sheOpensHerHistory();

      expect(screen.getByTestId(historyWaitingTestID)).toHaveTextContent(
        patternsWaitingSentence(1, historyNeedsCycles),
      );
      expect(screen.queryByTestId(historyPatternsTestID)).toBeNull();
    });
  });

  describe('six cycles, read back', () => {
    it('lists the cycles she recorded, most recent first, with their lengths', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());

      await sheOpensHerHistory();

      for (const started of herCompleteCyclesNewestFirst) {
        expect(whatOneRowSays(historyCycleTestID(started))).toContain(
          `${herCycleLengthDays} days, ${herPeriodDays} of them bleeding`,
        );
      }
      expect(theCycleRowsInOrder()).toEqual(
        [herLastPeriodStarted, ...herCompleteCyclesNewestFirst].map(historyCycleTestID),
      );
      expect(textIn(screen.getByTestId(historyCyclesTestID))).toContain(historyCopy.running);
    });

    it('draws the period she is having in the cycle she is still in', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());

      await sheOpensHerHistory();

      expect(theDaysOfTheArc(historyArcTestID(herLastPeriodStarted, 'period'))).toBe(herPeriodDays);
    });

    it('opens the day a cycle began when she presses that cycle', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());
      const app = await sheOpensHerHistory();
      const started = herCompleteCyclesNewestFirst[0] as string;

      await shePresses(historyCycleTestID(started));

      expect(app.pathname()).toBe(`/day/${started}`);
      expect(screen.getByTestId(flowOptionTestID('medium'))).toBeChecked();
    });

    it('comes back to the history when she leaves the day she opened', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());
      const app = await sheOpensHerHistory();
      const started = herCompleteCyclesNewestFirst[0] as string;
      await shePresses(historyCycleTestID(started));

      await shePresses(logFlowDoneTestID);

      expect(app.pathname()).toBe('/history');
      expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();
    });

    it('takes her back to the ring from the history', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());
      const app = await sheOpensHerHistory();

      await shePresses(historyBackTestID);

      expect(app.pathname()).toBe('/');
    });
  });

  describe('the colour and the words next to it', () => {
    it('draws no text on a phase fill, because a fill fails the contrast floor', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());

      await sheOpensHerHistory();

      expect(textIn(screen.toJSON()).length).toBeGreaterThan(0);
      expect(textDrawnOnAPhaseFill(screen.toJSON())).toEqual([]);
    });

    it('writes the phase name in the ink partner of the phase it names', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());

      await sheOpensHerHistory();

      expect(colourOf(screen.getByTestId(historyPatternPhaseTestID('cramps')))).toBe(
        colour[phasePalette.luteal.ink],
      );
    });

    it('leaves nothing on the screen too small to press', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear());

      await sheOpensHerHistory();

      expect(controlsTooSmallToPress(everyControlOnTheScreen())).toEqual([]);
    });
  });
});
