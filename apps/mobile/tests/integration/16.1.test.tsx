import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import {
  calendarBackTestID,
  calendarTodayTestID,
} from '../../src/features/calendar/CalendarScreen';
import { dayTestID } from '../../src/features/calendar/CycleMonth';
import { herDayLabel } from '../../src/features/cycle/copy';
import { monthLabel } from '../../src/features/onboarding/days';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { partsMissing } from '../fixtures/theMockupScreen';
import {
  aWeekOfHerMonth,
  everyPartOfTheDrawing,
  herPeriodRunsFor,
  herPhoneHoldsThreeRecordedCycles,
  theColumnsOfTheDrawing,
  theCycleDayOver,
  theCycleDaysOfTheDrawing,
  theDatesOfTheDrawing,
  theDatesTheMonthDrew,
  theDaySheOpensTheMonth,
  theDayTheDrawingOutlines,
  theDayTheRingSaysOn,
  theDaysTheDrawingFills,
  theEmptyBoxesOfTheDrawing,
  theEmptyBoxesTheMonthDrew,
  theHeaderAndTheMonthOfTheDrawing,
  theMarkOnTheSquare,
  theMonthSheOpens,
  theMonthSheReads,
  theMonthSheReadsBack,
  theMonthTheDrawingNames,
  theRangeHerNextPeriodMayStartOn,
  theSquaresCountingTheirCycleDayBelowTheDate,
  theSquaresTakingAWidthOfTheirOwn,
  theSquaresTheMonthDrew,
  theSquaresTooShortForAThumb,
  theWeekMeasuredOn,
  whatTheMonthScreenDrew,
} from '../fixtures/theMonthSheOpens';
import { anIPhone16, aSmallIPhone } from '../fixtures/theWidthOfARow';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the day the drawing rings, so the month reads the same in any timezone. */
const whenSheOpensTheMonth = (): Date => new Date(`${theDaySheOpensTheMonth()}T12:00:00.000Z`);

async function sheOpensTheMonth(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/calendar' });

  await app;

  return { pathname: () => app.getPathname() };
}

describe('she opens a month and reads the cycle day of every day in it', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensTheMonth());
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the month on the glass', () => {
    it('is the month the drawing names, with the parts the drawing places in its order', async () => {
      await sheOpensTheMonth();

      expect(partsMissing(theHeaderAndTheMonthOfTheDrawing(), whatTheMonthScreenDrew())).toEqual(
        [],
      );
      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheOpens));
      expect(theMonthSheReads()).toContain(theMonthTheDrawingNames());
    });

    it('leaves the parts the later steps build to those steps, and the drawing places more', () => {
      expect(everyPartOfTheDrawing().length).toBeGreaterThan(
        theHeaderAndTheMonthOfTheDrawing().length,
      );
      expect(everyPartOfTheDrawing().map((part) => part.name)).toContain('DaySheet');
    });

    it('carries a way back and a way to today, which is what the drawing puts beside the title', async () => {
      await sheOpensTheMonth();

      expect(screen.getByTestId(calendarBackTestID)).toBeTruthy();
      expect(screen.getByTestId(calendarTodayTestID)).toBeTruthy();
    });

    it('draws a square for every day of the month, in the order the drawing draws them', async () => {
      await sheOpensTheMonth();

      expect(theDatesTheMonthDrew()).toEqual(theDatesOfTheDrawing());
      expect(theEmptyBoxesTheMonthDrew()).toBe(theEmptyBoxesOfTheDrawing());
      expect(aWeekOfHerMonth().cells).toHaveLength(theColumnsOfTheDrawing().length);
    });
  });

  describe('the day of her cycle', () => {
    it('is written over every date, and it is the number the drawing counts', async () => {
      await sheOpensTheMonth();

      expect(theMonthSheReadsBack().map((square) => square.cycleDay)).toEqual(
        theCycleDaysOfTheDrawing(),
      );
    });

    it('is drawn above the date and never under it', async () => {
      await sheOpensTheMonth();

      expect(theSquaresCountingTheirCycleDayBelowTheDate()).toEqual([]);
      expect(theSquaresTheMonthDrew().length).toBeGreaterThan(theColumnsOfTheDrawing().length);
    });

    it('is the day the ring says for that date, on every date of the month', async () => {
      await sheOpensTheMonth();

      const read = theSquaresTheMonthDrew().map((day) => theCycleDayOver(day));

      expect(read).toEqual(theSquaresTheMonthDrew().map((day) => theDayTheRingSaysOn(day)));
      expect(read.filter((day) => Number.isInteger(day))).toHaveLength(
        theDatesOfTheDrawing().length,
      );
    });

    it('counts on past the length of the cycle she is in, because that cycle has not closed', async () => {
      await sheOpensTheMonth();

      const last = theSquaresTheMonthDrew().at(-1) ?? '';

      expect(theCycleDayOver(last)).toBeGreaterThan(theCycleDayOver(theDaySheOpensTheMonth()) ?? 0);
    });
  });

  describe('what happened on a date, and what is expected on one', () => {
    it('fills every day she recorded bleeding on', async () => {
      await sheOpensTheMonth();

      for (const day of theDaysTheDrawingFills()) {
        expect(theMarkOnTheSquare(day)).toBe('bled');
      }

      expect(theDaysTheDrawingFills()).toHaveLength(herPeriodRunsFor());
    });

    it('outlines the days her next period is expected on, and the day the drawing outlines', async () => {
      await sheOpensTheMonth();
      const mayStart = theRangeHerNextPeriodMayStartOn();

      expect(theMarkOnTheSquare(theDayTheDrawingOutlines())).toBe('forecast');
      expect(theMarkOnTheSquare(mayStart.from)).toBe('forecast');
      expect(theMarkOnTheSquare(mayStart.to)).toBe('forecast');
    });

    it('leaves the day before that range plain, so the outline says something', async () => {
      await sheOpensTheMonth();
      const mayStart = theRangeHerNextPeriodMayStartOn();

      expect(theMarkOnTheSquare(addDays(mayStart.from, -1))).toBe('plain');
    });

    it('rings today, and rings nothing else', async () => {
      await sheOpensTheMonth();

      expect(theMarkOnTheSquare(theDaySheOpensTheMonth())).toBe('today');
      expect(theSquaresTheMonthDrew().filter((day) => theMarkOnTheSquare(day) === 'today')).toEqual(
        [theDaySheOpensTheMonth()],
      );
    });

    it('says the cycle day and the state in words, for a woman who is listening', async () => {
      await sheOpensTheMonth();
      const bled = theDaysTheDrawingFills()[0] ?? '';
      const said = String(screen.getByTestId(dayTestID(bled)).props.accessibilityLabel);

      expect(said).toBe(
        herDayLabel(
          {
            cycleDay: theCycleDayOver(bled),
            date: Number(bled.slice(8, 10)),
            day: bled,
            letter: '',
            mark: 'bled',
          },
          theDaySheOpensTheMonth(),
        ),
      );
      expect(said).toContain(String(theCycleDayOver(bled)));
    });
  });

  describe('a square her thumb has to find', () => {
    it('keeps the height a thumb needs and takes its width from the month', async () => {
      await sheOpensTheMonth();

      expect(theSquaresTooShortForAThumb()).toEqual([]);
      expect(theSquaresTakingAWidthOfTheirOwn()).toEqual([]);
    });

    it.each([anIPhone16, aSmallIPhone])('ends inside the month on $name', async (phone) => {
      await sheOpensTheMonth();
      const week = theWeekMeasuredOn(phone.width);

      expect(week.rightEdge).toBeLessThanOrEqual(week.width);
      expect(week.width).toBeGreaterThan(0);
    });
  });
});
