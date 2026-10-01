import { join } from 'node:path';

import { phaseLabel } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { listCycles } from '../../src/data/cycleRepository';
import { readProfile } from '../../src/data/profileRepository';
import { readSetting } from '../../src/data/settingRepository';
import { cycleCopy, ringSpokenLabel } from '../../src/features/cycle/copy';
import { statedLengthSentence } from '../../src/features/forecast/copy';
import { learningStatedLengthTestID } from '../../src/features/forecast/Learning';
import {
  homeLogTodayTestID,
  homeNoRingLineTestID,
  homeNoRingTitleTestID,
  homeScreenTestID,
} from '../../src/features/home/HomeScreen';
import { homeCopy } from '../../src/features/home/copy';
import { flowOptionTestID } from '../../src/features/log/FlowPicker';
import { logFlowDoneTestID } from '../../src/features/log/LogFlow';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { holdCoreTestID } from '../../src/features/onboarding/HoldToBegin';
import { tourSkipTestID } from '../../src/features/onboarding/TourScreen';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase } from '../fixtures/herPhone';
import { theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { textIn } from '../fixtures/renderedText';
import { sheAnswersEveryQuestionWithNoDate } from '../fixtures/theFirstRun';
import {
  thePartsOfTheDayOneDrawing,
  thePartsTheDayOneDrawingNames,
} from '../fixtures/theDrawingOfDayOne';
import { sheHoldsTheRing } from '../fixtures/theHold';
import { partsMissing, theIdentifiersDrawn } from '../fixtures/theMockupScreen';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** Not the length the screen offers, so a number drawn back is a number she gave. */
const sheSaysHerCycleRuns = defaultCycleLengthDays + 2;

/**
 * Her first run, end to end, from the tour to the hold, without a day for her last period.
 *
 * The walk is the whole point of this file: the screen she lands on is reached by using Emi and
 * never by seeding a phone, so nothing a fixture writes can stand in for what the hold wrote.
 */
async function sheWalksTheFirstRunWithNoDate(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await fireEvent.press(screen.getByTestId(tourSkipTestID));
  await sheAnswersEveryQuestionWithNoDate({ cycleLengthDays: sheSaysHerCycleRuns });
  await sheHoldsTheRing();
}

/** What the ring says about the day she is on, read off the ring and not off the arithmetic. */
function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
}

/** The days her phone holds, which after a first run with no date is none at all. */
function theDaysOnHerPhone(): string[] {
  return listDayLogs(herDatabase()).map((row) => row.day);
}

describe('she completes the first run with no date, logs a period, and reads a ring', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement belongs to step 2.4. The ring this walk ends on arrives already
    // open, so what a case reads off it is her cycle and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the screen the hold leaves her on when she gave no date', () => {
    beforeEach(async () => {
      await sheWalksTheFirstRunWithNoDate();
    });

    it('is the screen she opens, and it is the drawing of day one, part for part, in order', () => {
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(partsMissing(thePartsOfTheDayOneDrawing(), theIdentifiersDrawn())).toEqual([]);
      expect(thePartsTheDayOneDrawingNames().map((part) => part.name)).toEqual(
        thePartsOfTheDayOneDrawing().map((part) => part.name),
      );
    });

    it('draws no ring, and the drawing of day one places none either', () => {
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      expect(thePartsTheDayOneDrawingNames().map((part) => part.name)).not.toContain('CycleRing');
    });

    it('says there is nothing to draw yet, and what the ring needs before it can be drawn', () => {
      expect(textIn(screen.getByTestId(homeNoRingTitleTestID))).toEqual([cycleCopy.noRing.title]);
      expect(textIn(screen.getByTestId(homeNoRingLineTestID))).toEqual([cycleCopy.noRing.line]);
    });

    it('counts the cycle length she gave at her first run, and never the length Emi would pick', () => {
      const said = textIn(screen.getByTestId(learningStatedLengthTestID)).join(' ');

      expect(said).toBe(statedLengthSentence(sheSaysHerCycleRuns));
      expect(said).not.toContain(String(defaultCycleLengthDays));
    });

    it('offers one way to log today, and it is the only one of it on the screen', () => {
      expect(textIn(screen.getByTestId(homeLogTodayTestID))).toEqual([homeCopy.logToday]);
      expect(screen.queryAllByTestId(homeLogTodayTestID)).toHaveLength(1);
    });

    it('holds her answers and not one day, because she gave Emi no day to count from', async () => {
      const sealed = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(sealed?.cycleLengthDays).toBe(sheSaysHerCycleRuns);
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeDefined();
      expect(theDaysOnHerPhone()).toEqual([]);
      expect(listCycles(herDatabase())).toEqual([]);
    });
  });

  describe('the ring the first period she logs draws', () => {
    beforeEach(async () => {
      await sheWalksTheFirstRunWithNoDate();
      await fireEvent.press(screen.getByTestId(homeLogTodayTestID));
      await fireEvent.press(screen.getByTestId(flowOptionTestID('medium')));
      await fireEvent.press(screen.getByTestId(logFlowDoneTestID));
    });

    it('arrives on the screen she started from, drawn from the day she logged', () => {
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(theDaysOnHerPhone()).toEqual([today]);
    });

    it('says she is on the first day of a cycle of the length she gave', () => {
      expect(theRingSays()).toBe(ringSpokenLabel(1, sheSaysHerCycleRuns, phaseLabel.period));
    });

    it('offers nothing to log today any more, and the two lines are gone', () => {
      for (const gone of [homeLogTodayTestID, homeNoRingTitleTestID, homeNoRingLineTestID]) {
        expect(screen.queryByTestId(gone)).toBeNull();
      }
    });
  });

  describe('the walk itself, so a pass cannot come from a screen that was never reached', () => {
    it('presses the hold the first run ends on, which no seeded phone ever draws', async () => {
      await renderRouter(appDirectory, { initialUrl: '/' });
      await fireEvent.press(screen.getByTestId(tourSkipTestID));
      await sheAnswersEveryQuestionWithNoDate({ cycleLengthDays: sheSaysHerCycleRuns });

      expect(screen.getByTestId(holdCoreTestID)).toBeTruthy();
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();

      await sheHoldsTheRing();

      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeDefined();
    });
  });
});
