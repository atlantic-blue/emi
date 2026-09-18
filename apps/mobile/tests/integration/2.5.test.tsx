import { join } from 'node:path';

import { type DayRecord } from '@emi/crypto';
import { type Flow, addDays } from '@emi/cycle';
import { phaseLabel } from '@emi/tokens';
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID, ringArcTestID, ringBeadTestID } from '../../src/components/CycleRing';
import { readDayLog } from '../../src/data/dayLogRepository';
import { flowOptionTestID, flowLabel } from '../../src/features/log/FlowPicker';
import {
  logFlowCopy,
  logFlowDoneTestID,
  logFlowNoRingTestID,
  logFlowSavedTestID,
} from '../../src/features/log/LogFlow';
import { logTodayTestID } from '../../src/features/home/HomeScreen';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { resetExpoSqlite } from '../data/expoSqlite';
import { herVault } from '../fixtures/herVault';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const today = dayOf(whenSheOpensIt);

/** She is on the second day of the cycle she is in, and she bled on the first. */
const thisCycleStarted = addDays(today, -1);

const herCycleLengthDays = 28;
const herPeriodDays = 4;
const herCompleteCycles = 6;

/**
 * Six cycles of her own, each 28 days with 4 days of bleeding, and then the cycle she is in with
 * its first day recorded. Nothing here is computed by the code under test.
 */
function herSixCycles(): DayRecord[] {
  const records: DayRecord[] = [];

  for (let cycle = herCompleteCycles; cycle >= 1; cycle -= 1) {
    const started = addDays(thisCycleStarted, -cycle * herCycleLengthDays);
    for (let day = 0; day < herPeriodDays; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }
  records.push(aBleedingDay(thisCycleStarted));

  return records;
}

/** A fresh install: the first run recorded one day and she has logged nothing since. */
function herFirstDayOnly(): DayRecord[] {
  return [aBleedingDay(today)];
}

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpensEmi(at = '/'): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: at });
  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function shePicks(flow: Flow): Promise<void> {
  await shePresses(flowOptionTestID(flow));
}

/** What the ring says about the day she is on, read off the ring rather than off the arithmetic. */
function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
}

function thePeriodArc(): string {
  return String(screen.getByTestId(ringArcTestID('period', 'elapsed')).props.d);
}

function theBead(): { x: number; y: number } {
  const bead = screen.getByTestId(ringBeadTestID);

  return { x: Number(bead.props.cx), y: Number(bead.props.cy) };
}

function whatWasRecordedToday(): DayRecord {
  const row = readDayLog(herDatabase(), today);
  if (!row) {
    throw new Error(`${today} was saved and could not be read back`);
  }
  return herVault().open(row.payload);
}

function theRevisionOfToday(): number {
  const row = readDayLog(herDatabase(), today);
  if (!row) {
    throw new Error(`${today} was saved and could not be read back`);
  }
  return row.revision;
}

function everyControlOnTheScreen() {
  return [...screen.queryAllByRole('radio'), ...screen.queryAllByRole('button')];
}

describe('logging a flow redraws the ring', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement is proven in step 2.4. Here it arrives already open, so what the
    // test reads off it is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('she reaches the day from the home screen', () => {
    it('opens the flow picker in one press, with every value of flow on it', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      const app = await sheOpensEmi();

      await shePresses(logTodayTestID);

      expect(app.pathname()).toBe('/log');
      for (const [flow, label] of Object.entries(flowLabel)) {
        expect(screen.getByTestId(flowOptionTestID(flow as Flow))).toBeTruthy();
        expect(screen.getByText(label)).toBeTruthy();
      }
    });

    it('sends her back to the home screen when she is done', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      const app = await sheOpensEmi();
      await shePresses(logTodayTestID);

      await shePresses(logFlowDoneTestID);

      expect(app.pathname()).toBe('/');
    });
  });

  describe('she says today was heavy, on a day the ring called follicular', () => {
    it('writes today, holding the flow she picked and nothing she did not', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      await sheOpensEmi('/log');

      await shePicks('heavy');

      expect(whatWasRecordedToday()).toEqual({
        day: today,
        flow: 'heavy',
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    it('moves today out of the follicular arc and into the period arc', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      await sheOpensEmi('/log');

      expect(theRingSays()).toBe(`Day 2 of ${herCycleLengthDays}, follicular`);
      expect(screen.getByText(phaseLabel.follicular)).toBeTruthy();

      await shePicks('heavy');

      expect(theRingSays()).toBe(`Day 2 of ${herCycleLengthDays}, period`);
      expect(screen.getByText(phaseLabel.period)).toBeTruthy();
      expect(screen.queryByText(phaseLabel.follicular)).toBeNull();
    });

    it('widens the period arc she is looking at and moves the bead with it', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      await sheOpensEmi('/log');
      const before = { arc: thePeriodArc(), bead: theBead() };

      await shePicks('heavy');

      expect(thePeriodArc()).not.toBe(before.arc);
      expect(theBead()).not.toEqual(before.bead);
    });

    it('marks the option she picked, and says the day is saved on this phone', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      await sheOpensEmi('/log');

      await shePicks('heavy');

      expect(screen.getByTestId(flowOptionTestID('heavy'))).toBeChecked();
      expect(screen.getByTestId(flowOptionTestID('light'))).not.toBeChecked();
      expect(screen.getByTestId(logFlowSavedTestID)).toHaveTextContent(logFlowCopy.saved);
    });

    it('keeps the symptoms that day already held, because it writes the day and not the flow', async () => {
      await herPhoneHolds(whenSheOpensIt, [
        ...herSixCycles(),
        { day: today, symptoms: ['cramps', 'low-mood'], recordedAt: `${today}T07:00:00.000Z` },
      ]);
      await sheOpensEmi('/log');

      await shePicks('heavy');

      expect(whatWasRecordedToday()).toEqual({
        day: today,
        flow: 'heavy',
        symptoms: ['cramps', 'low-mood'],
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    it('edits the day she already wrote rather than writing a second one', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      await sheOpensEmi('/log');

      await shePicks('heavy');
      await shePicks('light');

      expect(whatWasRecordedToday().flow).toBe('light');
      expect(theRevisionOfToday()).toBe(2);
    });
  });

  describe('she says there was no bleeding today after all', () => {
    it('takes today back out of the period arc', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      await sheOpensEmi('/log');
      await shePicks('heavy');

      await shePicks('none');

      expect(whatWasRecordedToday().flow).toBe('none');
      expect(theRingSays()).toBe(`Day 2 of ${herCycleLengthDays}, follicular`);
    });

    it('leaves nothing to draw when it was the only day she had ever bled', async () => {
      await herPhoneHolds(whenSheOpensIt, herFirstDayOnly());
      await sheOpensEmi('/log');

      expect(theRingSays()).toBe(`Day 1 of ${defaultCycleLengthDays}, period`);

      await shePicks('none');

      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      expect(
        within(screen.getByTestId(logFlowNoRingTestID)).getByText(logFlowCopy.noRing.line),
      ).toBeTruthy();
    });

    it('draws the ring again the moment she logs a period', async () => {
      await herPhoneHolds(whenSheOpensIt, herFirstDayOnly());
      await sheOpensEmi('/log');
      await shePicks('none');

      await shePicks('medium');

      expect(screen.queryByTestId(logFlowNoRingTestID)).toBeNull();
      expect(theRingSays()).toBe(`Day 1 of ${defaultCycleLengthDays}, period`);
    });
  });

  describe('every control she can press on this screen', () => {
    it('is at least 44 points on both axes, and the failure names any that is not', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      await sheOpensEmi('/log');

      expect(controlsTooSmallToPress(everyControlOnTheScreen())).toEqual([]);
    });

    it('is measured against a screen that actually holds controls', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCycles());
      await sheOpensEmi('/log');

      expect(everyControlOnTheScreen().length).toBeGreaterThan(5);
      expect(() => controlsTooSmallToPress([])).toThrow('nothing to press');
    });
  });
});
