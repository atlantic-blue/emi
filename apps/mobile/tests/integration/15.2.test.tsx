import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { homeHeaderTestID } from '../../src/features/home/HomeHeader';
import {
  weekCycleDayTestID,
  weekDateTestID,
  weekLetterTestID,
  weekStripTestID,
} from '../../src/features/home/WeekStrip';
import { weekdayColumnNames } from '../../src/features/onboarding/days';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { partsMissing } from '../fixtures/theMockupScreen';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  herPhoneHoldsNoDayAtAll,
  theDayTheRingSaysFor,
  theDaySheOpensIt,
  theDaysOfHerWeek,
  theDaysOfTheDrawingsStrip,
  theDaysTheStripDrew,
  theHeaderAndTheStripOfTheDrawing,
  theLetterOver,
  theStripSheReads,
  whatTheScreenSheOpensDrew,
} from '../fixtures/theWeekSheOpensWith';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the Thursday of the drawing, well away from any change of the clocks. */
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

/** The Sunday at the end of the same week, which is the same strip with today at the other end. */
const whenSheReachesTheSunday = new Date(`${addDays(theDaySheOpensIt, 3)}T12:00:00.000Z`);

async function sheOpensEmi(): Promise<void> {
  await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

describe('she reads the cycle day of every day of her week without pressing anything', () => {
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

  describe('the drawing the strip is held to', () => {
    it('places the strip second, after the header, and says what each is drawn under', () => {
      const [header, strip] = theHeaderAndTheStripOfTheDrawing();

      expect(header?.name).toBe('HomeHeader');
      expect(strip?.name).toBe('WeekStrip');
      expect(strip?.builtUnder).toContain(weekStripTestID);
    });

    it('draws a week of seven days, three of them behind today and three ahead', () => {
      const drawn = theDaysOfTheDrawingsStrip();

      expect(drawn).toHaveLength(7);
      expect(drawn.map((day) => day.mark)).toEqual([
        'bled',
        'bled',
        'bled',
        'today',
        'forecast',
        'plain',
        'plain',
      ]);
    });

    it('counts the cycle day up from one across the week', () => {
      expect(theDaysOfTheDrawingsStrip().map((day) => day.cycleDay)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('the week she reads, on a phone holding four recorded period days', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('answers for the strip the drawing places after the header', () => {
      expect(partsMissing(theHeaderAndTheStripOfTheDrawing(), whatTheScreenSheOpensDrew())).toEqual(
        [],
      );
    });

    it('draws the strip under the header and above everything else on the screen', () => {
      expect(whatTheScreenSheOpensDrew()[0]).toBe(homeHeaderTestID);
      expect(whatTheScreenSheOpensDrew()[1]).toBe(weekStripTestID);
    });

    it('draws her whole week, Monday to Sunday, with today in it', () => {
      expect(theDaysTheStripDrew()).toEqual(theDaysOfHerWeek());
      expect(theDaysTheStripDrew()).toHaveLength(7);
      expect(theDaysTheStripDrew()).toContain(theDaySheOpensIt);
    });

    it('draws the date, the cycle day and the state the drawing gives every day of that week', () => {
      expect(
        theStripSheReads().map(({ cycleDay, date, mark }) => ({ cycleDay, date, mark })),
      ).toEqual(
        theDaysOfTheDrawingsStrip().map(({ cycleDay, date, mark }) => ({ cycleDay, date, mark })),
      );
    });

    it('fills the three days behind today, rings today, and dots the day her period runs into', () => {
      const marks = theStripSheReads().map((day) => day.mark);

      expect(marks.slice(0, 3)).toEqual(['bled', 'bled', 'bled']);
      expect(marks[3]).toBe('today');
      expect(marks[4]).toBe('forecast');
      expect(marks.slice(5)).toEqual(['plain', 'plain']);
    });

    it('names every weekday by its own letter, from the catalogue', () => {
      expect(theDaysOfHerWeek().map((day) => theLetterOver(day))).toEqual(
        weekdayColumnNames.map((name) => name.slice(0, 1)),
      );
    });

    it('puts the cycle day above the date, under the letter of the weekday', () => {
      const three = [
        weekLetterTestID(theDaySheOpensIt),
        weekCycleDayTestID(theDaySheOpensIt),
        weekDateTestID(theDaySheOpensIt),
      ];
      const drawn = screen
        .queryAllByTestId(/.+/)
        .map((element) => String(element.props.testID))
        .filter((identifier) => three.includes(identifier));

      expect(drawn).toEqual(three);
    });
  });

  describe('the cycle day she reads over each date', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('is the day the ring says for that date, on every day of the week', () => {
      const read = theStripSheReads().map((day) => day.cycleDay);

      expect(read).toEqual(theDaysOfHerWeek().map((day) => theDayTheRingSaysFor(day)));
      // The ring answering nothing for all seven would make the line above compare two empty
      // lists, so the days are counted as well as compared.
      expect(read.filter((day) => Number.isInteger(day))).toHaveLength(7);
    });

    it('is the day the ring draws inside itself, on the day she is actually looking at', () => {
      const today = theStripSheReads().find((day) => day.mark === 'today');

      expect(today?.cycleDay).toBe(theDayTheRingSaysFor(theDaySheOpensIt));
    });
  });

  describe('the week of a woman who has recorded nothing', () => {
    beforeEach(async () => {
      await herPhoneHoldsNoDayAtAll(whenSheOpensIt);
      await renderRouter(appDirectory, { initialUrl: '/' });
    });

    it('still draws her seven days, with no cycle day over any of them', () => {
      expect(theDaysTheStripDrew()).toHaveLength(7);
      expect(theStripSheReads().every((day) => Number.isNaN(day.cycleDay))).toBe(true);
    });

    it('rings today and leaves every other day plain', () => {
      expect(theStripSheReads().map((day) => day.mark)).toEqual([
        'plain',
        'plain',
        'plain',
        'today',
        'plain',
        'plain',
        'plain',
      ]);
    });
  });

  describe('what the comparison says when the strip is missing', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('names the strip, and says what it is built under', () => {
      const withoutTheStrip = whatTheScreenSheOpensDrew().filter(
        (identifier) => identifier !== weekStripTestID,
      );

      expect(partsMissing(theHeaderAndTheStripOfTheDrawing(), withoutTheStrip)).toEqual([
        `the drawing names WeekStrip, built under ${weekStripTestID}, and the screen draws none of them after ${homeHeaderTestID}`,
      ]);
    });

    it('counts the days, so a strip drawing six of them is not a week', () => {
      expect(theDaysTheStripDrew()).toHaveLength(theDaysOfTheDrawingsStrip().length);
      expect(theDaysTheStripDrew()).not.toHaveLength(6);
    });
  });

  describe('the same week, opened on the Sunday at the end of it', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheReachesTheSunday);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheReachesTheSunday);
      await renderRouter(appDirectory, { initialUrl: '/' });
    });

    it('is the same seven days, so the strip is her week and not a window that moves', () => {
      expect(theDaysTheStripDrew()).toEqual(theDaysOfHerWeek());
    });

    it('rings the last day of the strip, because that is the day she is on', () => {
      const marks = theStripSheReads().map((day) => day.mark);

      expect(marks[marks.length - 1]).toBe('today');
      expect(marks.slice(0, 4)).toEqual(['bled', 'bled', 'bled', 'bled']);
    });
  });
});
