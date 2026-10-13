import { join } from 'node:path';

import { colour } from '@emi/tokens';
import { within } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet, type ViewStyle } from 'react-native';

import {
  calendarEditPeriodTestID,
  calendarMonthTestID,
} from '../../src/features/calendar/CalendarScreen';
import {
  dateDiscTestID,
  dayTestID,
  monthLegendTestID,
} from '../../src/features/calendar/CycleMonth';
import {
  daySheetLeadTestID,
  daySheetOpenTestID,
  daySheetTestID,
} from '../../src/features/calendar/DaySheet';
import { editPeriodListTestID } from '../../src/features/calendar/EditPeriodScreen';
import { monthLegendCopy } from '../../src/features/calendar/copy';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  herPhoneHoldsThreeRecordedCycles,
  theCycleDayOver,
  theDateInkOn,
  theDayAheadSheCannotOpen,
  theDaySheOpensTheMonth,
  theDayTheDrawingsSheetNames,
  theDaysOfTheDrawnMonth,
  theDaysTheDrawingFills,
  theFertileDaysTheForecastNames,
  theLegendDots,
  theLegendSheReads,
  theMarkOnTheSquare,
  theDayHerNextPeriodIsForecastOn,
  theOvulationDayOfTheForecastCycle,
  theOvulationDayTheForecastNames,
  thePanelIsAtTheFoot,
  thePhaseGroundOn,
  theSquaresCountingTheirCycleDayBelowTheDate,
  theSquaresTheMonthDrew,
  whatThePanelHolds,
} from '../fixtures/theMonthSheOpens';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The month she opens, in the shapes the approved redesign draws it in.
 *
 * Nothing here decides which day is a period day, a fertile day or the day of ovulation. Each one
 * is read off the cycle layer that already decided it, and every case asks whether the month drew
 * what that layer says. A case holding a list of dates typed out here would hold the month to this
 * file rather than to her own records.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the day the drawing rings, so the month reads the same in any timezone. */
const whenSheOpensTheMonth = (): Date => new Date(`${theDaySheOpensTheMonth()}T12:00:00.000Z`);

async function sheOpensTheMonth(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/calendar' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The style one element was drawn with, as one object. */
function styleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;
}

describe('the month grid takes the redesign look', () => {
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

  describe('every date of her month', () => {
    it('sits in a disc of its own, with the day of her cycle above it', async () => {
      await sheOpensTheMonth();

      for (const day of theSquaresTheMonthDrew()) {
        expect(screen.getByTestId(dateDiscTestID(day))).toBeTruthy();
        expect(theCycleDayOver(day)).toBeGreaterThan(0);
      }

      expect(theSquaresCountingTheirCycleDayBelowTheDate()).toEqual([]);
      expect(theSquaresTheMonthDrew().length).toBeGreaterThan(7);
    });

    it('draws that disc round, and square enough to hold a two figure date', async () => {
      await sheOpensTheMonth();

      const disc = styleOf(dateDiscTestID(theDaySheOpensTheMonth()));

      expect(disc.width).toBe(disc.height);
      expect(Number(disc.width)).toBeGreaterThanOrEqual(32);
      expect(Number(disc.borderRadius)).toBeGreaterThanOrEqual(Number(disc.width) / 2);
    });
  });

  describe('the days she bled', () => {
    it('fill that disc with the colour of her period', async () => {
      await sheOpensTheMonth();

      expect(theDaysTheDrawingFills().length).toBeGreaterThan(0);

      for (const day of theDaysTheDrawingFills()) {
        expect(thePhaseGroundOn(day)).toBe(colour.period);
        expect(theDateInkOn(day)).toBe(colour.onAccent);
      }
    });
  });

  describe('her fertile days', () => {
    it('tint the disc of every day inside the fertile window the forecast names', async () => {
      await sheOpensTheMonth();

      // A day she bled is filled over the top of the tint, because what she recorded wins.
      const bled = new Set(theDaysTheDrawingFills());
      const tinted = theFertileDaysTheForecastNames().filter(
        (day) =>
          day !== theOvulationDayTheForecastNames() &&
          day !== theOvulationDayOfTheForecastCycle() &&
          !bled.has(day),
      );

      expect(tinted.length).toBeGreaterThan(0);

      for (const day of tinted) {
        expect(thePhaseGroundOn(day)).toBe(colour.washWarm);
        expect(theDateInkOn(day)).toBe(colour.ovulationInk);
      }
    });

    it('reach the forecast cycle ahead of her, with its ovulation day filled (issue 270)', async () => {
      await sheOpensTheMonth();
      const ahead = theFertileDaysTheForecastNames().filter(
        (day) => day >= theDayHerNextPeriodIsForecastOn(),
      );

      expect(ahead.length).toBeGreaterThan(0);
      expect(ahead).toContain(theOvulationDayOfTheForecastCycle());
      expect(thePhaseGroundOn(theOvulationDayOfTheForecastCycle())).toBe(colour.ovulation);
    });

    it('fill the one day the forecast names as the estimated ovulation', async () => {
      await sheOpensTheMonth();

      const ovulation = String(theOvulationDayTheForecastNames());

      expect(theOvulationDayTheForecastNames()).toBeDefined();
      expect(theFertileDaysTheForecastNames()).toContain(ovulation);
      expect(thePhaseGroundOn(ovulation)).toBe(colour.ovulation);
      expect(theDateInkOn(ovulation)).toBe(colour.text);
    });

    it('leave a day outside that window with no ground under its date', async () => {
      await sheOpensTheMonth();

      const fertile = new Set(theFertileDaysTheForecastNames());
      const bled = new Set(theDaysTheDrawingFills());
      const plain = theDaysOfTheDrawnMonth().filter(
        (day) => !fertile.has(day) && !bled.has(day) && theMarkOnTheSquare(day) === 'plain',
      );

      expect(plain.length).toBeGreaterThan(0);

      for (const day of plain) {
        expect(thePhaseGroundOn(day)).toBeUndefined();
        expect(theDateInkOn(day)).toBe(colour.text);
      }
    });
  });

  describe('the legend above the grid', () => {
    it('names her period, the forecast and her fertile days, in the words of the catalogue', async () => {
      await sheOpensTheMonth();

      expect(theLegendSheReads()).toEqual({
        fertile: monthLegendCopy.fertile,
        forecast: monthLegendCopy.forecast,
        period: monthLegendCopy.period,
      });
    });

    it('draws each mark the way the grid draws those days: a fill, a dashed ring and a tint', async () => {
      await sheOpensTheMonth();
      const dots = theLegendDots();

      expect(dots.period.fill).toBe(colour.period);
      expect(dots.forecast).toEqual({ fill: undefined, line: colour.period, lineStyle: 'dashed' });
      expect(dots.fertile.fill).toBe(colour.washWarm);
      expect(dots.fertile.line).toBe(colour.ovulation);
    });

    it('stands above the grid, so the words are read before the dates', async () => {
      await sheOpensTheMonth();

      const drawn = screen.queryAllByTestId(/.+/).map((element) => String(element.props.testID));

      expect(drawn).toContain(monthLegendTestID);
      expect(drawn.indexOf(monthLegendTestID)).toBeLessThan(drawn.indexOf(calendarMonthTestID));
      expect(
        within(screen.getByTestId(calendarMonthTestID)).queryByTestId(monthLegendTestID),
      ).toBeNull();
    });

    it('stays off the period editor, which is a list of days rather than a month', async () => {
      await sheOpensTheMonth();

      expect(theLegendSheReads()).toBeDefined();

      await shePresses(calendarEditPeriodTestID);

      expect(screen.queryByTestId(calendarMonthTestID)).toBeNull();
      expect(screen.getByTestId(editPeriodListTestID)).toBeTruthy();
      expect(theLegendSheReads()).toBeUndefined();
    });
  });

  describe('the panel at the foot', () => {
    it('holds the card of today, with the way to her whole period, before she presses a day', async () => {
      await sheOpensTheMonth();

      expect(thePanelIsAtTheFoot()).toBe(true);
      expect(whatThePanelHolds()).toContain(daySheetTestID);
      expect(whatThePanelHolds()).toContain(calendarEditPeriodTestID);
    });

    it('names the day she pressed over that way, and opens the day it names', async () => {
      const app = await sheOpensTheMonth();
      const day = theDayTheDrawingsSheetNames();

      await shePresses(dayTestID(day));

      const held = whatThePanelHolds();

      expect(held.indexOf(daySheetLeadTestID)).toBeLessThan(held.indexOf(calendarEditPeriodTestID));

      await shePresses(daySheetOpenTestID);

      expect(app.pathname()).toBe(`/day/${day}`);
    });
  });

  describe('what the look did not change', () => {
    it('fills the days she bled and rings today, and only today', async () => {
      await sheOpensTheMonth();

      for (const day of theDaysTheDrawingFills()) {
        expect(theMarkOnTheSquare(day)).toBe('bled');
      }

      expect(theMarkOnTheSquare(theDaySheOpensTheMonth())).toBe('today');
      expect(theSquaresTheMonthDrew().filter((day) => theMarkOnTheSquare(day) === 'today')).toEqual(
        [theDaySheOpensTheMonth()],
      );
    });

    it('no longer draws a day ahead of her faint, because every day is a button', async () => {
      await sheOpensTheMonth();

      const ahead = theDayAheadSheCannotOpen();
      const square = screen.getByTestId(dayTestID(ahead));

      expect(styleOf(dayTestID(ahead)).opacity).toBeUndefined();
      expect(square.props.accessibilityRole).toBe('button');
      expect(square.props.accessibilityState).toEqual(
        expect.not.objectContaining({ disabled: true }),
      );
    });
  });
});
