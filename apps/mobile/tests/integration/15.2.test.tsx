import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID, ringCentreDayTestID } from '../../src/components/CycleRing';
import { homeCalendarTestID, homeHeaderTestID } from '../../src/features/home/HomeHeader';
import { homeCopy } from '../../src/features/home/copy';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { partsMissing } from '../fixtures/theMockupScreen';
import { theDifferencesTheTodayStepKeeps, theTodayDepartures } from '../fixtures/theTodayLook';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  herPhoneHoldsNoDayAtAll,
  theCalendarButton,
  theDayTheRingCentreSays,
  theDayTheRingSaysFor,
  theDaySheOpensIt,
  theDaysOfTheDrawingsStrip,
  theHeaderAndTheStripOfTheDrawing,
  whatIsLeftOfTheStrip,
  whatTheScreenSheOpensDrew,
} from '../fixtures/theWeekSheOpensWith';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the Thursday of the drawing, well away from any change of the clocks. */
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

/** The Sunday at the end of the same week, three days further into her cycle. */
const whenSheReachesTheSunday = new Date(`${addDays(theDaySheOpensIt, 3)}T12:00:00.000Z`);

async function sheOpensEmi(): Promise<void> {
  await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

/**
 * Contract changed by the todayPhases board: the strip of seven days is gone from Today. The day of
 * her cycle is read in the middle of the ring, and her month is one press away on the calendar
 * button in the top bar.
 */
describe('she reads the day of her cycle without pressing anything, and reaches her month in one press', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement is step 2.4. Here it arrives already open, so what a case reads off
    // the screen is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the drawing the screen is held to', () => {
    it('places the strip second, after the header, and nothing says it is built', () => {
      const [header, strip] = theHeaderAndTheStripOfTheDrawing();

      expect(header?.name).toBe('HomeHeader');
      expect(strip?.name).toBe('WeekStrip');
      expect(strip?.builtUnder).toEqual([]);
    });

    it('still draws a week of seven days in the older drawing, which is what the departure is from', () => {
      expect(theDaysOfTheDrawingsStrip()).toHaveLength(7);
    });

    it('records the strip as a departure of every drawing with a ring, with its reason', () => {
      expect(theTodayDepartures.map((departure) => departure.part)).toEqual([
        'WeekStrip',
        'WeekStrip',
        'WeekStrip',
      ]);
      expect(theTodayDepartures.every((departure) => departure.reason.includes('calendar'))).toBe(
        true,
      );
      expect(theDifferencesTheTodayStepKeeps).toEqual({
        todayLogged: 1,
        todayLuteal: 1,
        todayNext: 1,
      });
    });
  });

  describe('the screen she reads, on a phone holding four recorded period days', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('draws no part of the strip of seven days', () => {
      expect(whatIsLeftOfTheStrip()).toEqual([]);
    });

    it('draws the calendar button in the header, above the ring', () => {
      const drawn = whatTheScreenSheOpensDrew();

      expect(drawn[0]).toBe(homeHeaderTestID);
      expect(drawn.indexOf(homeCalendarTestID)).toBeGreaterThan(drawn.indexOf(homeHeaderTestID));
      expect(drawn.indexOf(homeCalendarTestID)).toBeLessThan(drawn.indexOf(cycleRingTestID));
    });

    it('names the calendar button for a screen reader, as a button', () => {
      expect(theCalendarButton().props.accessibilityLabel).toBe(homeCopy.calendar);
      expect(screen.getByTestId(homeCalendarTestID).props.accessibilityRole).toBe('button');
    });

    it('writes the day of her cycle in the middle of the ring, without a press', () => {
      expect(screen.getByTestId(ringCentreDayTestID)).toBeTruthy();
      expect(theDayTheRingCentreSays()).toBe(theDayTheRingSaysFor(theDaySheOpensIt));
      expect(theDayTheRingCentreSays()).toBe(4);
    });
  });

  describe('the press that reaches her month', () => {
    it('opens her month on the day she is on when she presses the calendar button', async () => {
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);
      const app = renderRouter(appDirectory, { initialUrl: '/' });

      await app;
      await fireEvent.press(screen.getByTestId(homeCalendarTestID));

      expect(app.getPathname()).toBe('/calendar');
      expect(app.getSearchParams()).toEqual({ day: theDaySheOpensIt });
    });
  });

  describe('the screen of a woman who has recorded nothing', () => {
    beforeEach(async () => {
      await herPhoneHoldsNoDayAtAll(whenSheOpensIt);
      await renderRouter(appDirectory, { initialUrl: '/' });
    });

    it('draws no strip and no day of a cycle, and still offers her the calendar', () => {
      expect(whatIsLeftOfTheStrip()).toEqual([]);
      expect(screen.queryByTestId(ringCentreDayTestID)).toBeNull();
      expect(screen.getByTestId(homeCalendarTestID)).toBeTruthy();
    });
  });

  describe('what the comparison says about the strip', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('names the strip as the one part of the top of the drawing the screen does not build', () => {
      expect(partsMissing(theHeaderAndTheStripOfTheDrawing(), whatTheScreenSheOpensDrew())).toEqual(
        ['the drawing names WeekStrip, and nothing says which test identifier it is built under'],
      );
    });
  });

  describe('the same week, opened on the Sunday at the end of it', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheReachesTheSunday);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheReachesTheSunday);
      await renderRouter(appDirectory, { initialUrl: '/' });
    });

    it('writes the day the ring says for the Sunday in its middle, three days on', () => {
      expect(theDayTheRingCentreSays()).toBe(theDayTheRingSaysFor(addDays(theDaySheOpensIt, 3)));
      expect(theDayTheRingCentreSays()).toBe(7);
    });
  });
});
