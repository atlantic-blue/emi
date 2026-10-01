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
  weekTestID,
} from '../../src/features/calendar/CycleMonth';
import { daySheetTestID } from '../../src/features/calendar/DaySheet';
import { monthLegendCopy } from '../../src/features/calendar/copy';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  herPhoneHoldsThreeRecordedCycles,
  theCycleDayOver,
  theDateInkOn,
  theDayAheadSheCannotOpen,
  theDaySheOpensTheMonth,
  theDayTheDrawingOutlines,
  theDayTheDrawingsSheetNames,
  theDaysOfTheDrawnMonth,
  theDaysTheDrawingFills,
  theFertileDaysTheRingCounts,
  theLegendDots,
  theLegendSheReads,
  theMarkOnTheSquare,
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
    it('tint the disc of every day the ring counts inside that window', async () => {
      await sheOpensTheMonth();

      const tinted = theFertileDaysTheRingCounts().filter(
        (day) => day !== theOvulationDayTheForecastNames(),
      );

      expect(tinted.length).toBeGreaterThan(0);

      for (const day of tinted) {
        expect(thePhaseGroundOn(day)).toBe(colour.washWarm);
        expect(theDateInkOn(day)).toBe(colour.ovulationInk);
      }
    });

    it('fill the one day the forecast names as the estimated ovulation', async () => {
      await sheOpensTheMonth();

      const ovulation = String(theOvulationDayTheForecastNames());

      expect(theOvulationDayTheForecastNames()).toBeDefined();
      expect(theFertileDaysTheRingCounts()).toContain(ovulation);
      expect(thePhaseGroundOn(ovulation)).toBe(colour.ovulation);
      expect(theDateInkOn(ovulation)).toBe(colour.text);
    });

    it('leave a day outside that window with no ground under its date', async () => {
      await sheOpensTheMonth();

      const fertile = new Set(theFertileDaysTheRingCounts());
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
    it('names her period and her fertile days, in the words of the catalogue', async () => {
      await sheOpensTheMonth();

      expect(theLegendSheReads()).toEqual({
        fertile: monthLegendCopy.fertile,
        period: monthLegendCopy.period,
      });
    });

    it('gives each of those words the colour the grid draws those days in', async () => {
      await sheOpensTheMonth();

      expect(theLegendDots()).toEqual({ fertile: colour.ovulation, period: colour.period });
    });

    it('stands above the columns, so the words are read before the dates', async () => {
      await sheOpensTheMonth();

      const drawn = within(screen.getByTestId(calendarMonthTestID))
        .queryAllByTestId(/.+/)
        .map((element) => String(element.props.testID));

      expect(drawn).toContain(monthLegendTestID);
      expect(drawn.indexOf(monthLegendTestID)).toBeLessThan(drawn.indexOf(weekTestID));
    });

    it('stays off the grid that asks her to pick a day instead of reading a phase', async () => {
      await sheOpensTheMonth();

      expect(theLegendSheReads()).toBeDefined();

      await shePresses(calendarEditPeriodTestID);

      expect(screen.queryByTestId(calendarMonthTestID)).toBeNull();
      expect(screen.queryAllByTestId(new RegExp(`^${dayTestID('')}\\d`)).length).toBeGreaterThan(7);
      expect(theLegendSheReads()).toBeUndefined();
    });
  });

  describe('the panel at the foot', () => {
    it('holds the way to her whole period before she has pressed any day', async () => {
      await sheOpensTheMonth();

      expect(thePanelIsAtTheFoot()).toBe(true);
      expect(whatThePanelHolds()).toContain(calendarEditPeriodTestID);
      expect(screen.queryByTestId(daySheetTestID)).toBeNull();
    });

    it('names the day she pressed over that way, and opens the day it names', async () => {
      const app = await sheOpensTheMonth();
      const day = theDayTheDrawingsSheetNames();

      await shePresses(dayTestID(day));

      const held = whatThePanelHolds();

      expect(held).toContain(daySheetTestID);
      expect(held).toContain(calendarEditPeriodTestID);
      expect(held.indexOf(daySheetTestID)).toBeLessThan(held.indexOf(calendarEditPeriodTestID));

      await shePresses(daySheetTestID);

      expect(app.pathname()).toBe(`/day/${day}`);
    });
  });

  describe('what the look did not change', () => {
    it('fills, outlines and rings the same days it filled, outlined and ringed before', async () => {
      await sheOpensTheMonth();

      for (const day of theDaysTheDrawingFills()) {
        expect(theMarkOnTheSquare(day)).toBe('bled');
      }

      expect(theMarkOnTheSquare(theDayTheDrawingOutlines())).toBe('forecast');
      expect(theMarkOnTheSquare(theDaySheOpensTheMonth())).toBe('today');
      expect(theSquaresTheMonthDrew().filter((day) => theMarkOnTheSquare(day) === 'today')).toEqual(
        [theDaySheOpensTheMonth()],
      );
    });

    it('still draws a day it will not open faint, and still refuses the press', async () => {
      await sheOpensTheMonth();

      const ahead = theDayAheadSheCannotOpen();
      const square = screen.getByTestId(dayTestID(ahead));

      expect(Number(styleOf(dayTestID(ahead)).opacity)).toBeLessThan(1);
      expect(square.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    });
  });
});
