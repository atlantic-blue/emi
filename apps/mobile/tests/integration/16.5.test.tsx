import { join } from 'node:path';

import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import {
  calendarEarlierTestID,
  calendarHeaderEndTestID,
  calendarHeaderStartTestID,
  calendarHeaderTestID,
  calendarLaterTestID,
  calendarTitleTestID,
} from '../../src/features/calendar/CalendarScreen';
import {
  screenHeaderAfterTitleTestID,
  screenHeaderBeforeTitleTestID,
} from '../../src/components/ScreenHeader';
import { dayTestID } from '../../src/features/calendar/CycleMonth';
import { daySheetOpenTestID } from '../../src/features/calendar/DaySheet';
import { dayParameter } from '../../src/features/calendar/askedMonth';
import { logFlowDoneTestID } from '../../src/features/log/LogFlow';
import { monthLabel, startOfMonth } from '../../src/features/onboarding/days';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { type Control, controlsTooSmallToPress } from '../fixtures/tapTargets';
import { partsMissing } from '../fixtures/theMockupScreen';
import {
  herPhoneHoldsThreeRecordedCycles,
  theDaySheOpensTheMonth,
  theDayTheEarlierDrawingOpens,
  theEarlierMonthAndItsSheetOfTheDrawing,
  theEarlierMonthOfTheDrawing,
  theMarkOnTheSquare,
  theMonthAfterSheOpens,
  theMonthBeforeSheOpens,
  theMonthSheOpens,
  theMonthSheReads,
  theMonthTheEarlierDrawingNames,
  theMonthTwoBeforeSheOpens,
  theSheetSheReads,
  whatTheMonthScreenDrew,
} from '../fixtures/theMonthSheOpens';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The way to an earlier month and the way to a later month: an arrow left of the month name and an
 * arrow right of it, in the header. Story 9 ends on a day two months behind today, and until these
 * two exist the only month she can read is the month she arrived on.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the day the drawing of the month rings, so the month reads the same in any zone. */
const whenSheOpensTheMonth = (): Date => new Date(`${theDaySheOpensTheMonth()}T12:00:00.000Z`);

interface OpenApp {
  readonly pathname: () => string;
  readonly searchParams: () => Record<string, string | string[]>;
}

async function sheOpens(at: string): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: at });

  await app;

  return { pathname: () => app.getPathname(), searchParams: () => app.getSearchParams() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The day the address carries, which is where the month she is reading is held. */
function theDayTheAddressCarries(app: OpenApp): string {
  return String(app.searchParams()[dayParameter] ?? '');
}

function theWaysToAnotherMonth(): Control[] {
  return [
    screen.getByTestId(calendarEarlierTestID),
    screen.getByTestId(calendarLaterTestID),
  ] as unknown as Control[];
}

describe('she swipes back two months and reads a day in that month', () => {
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

  describe('the month before, once she presses the way to an earlier month', () => {
    it('is the month before the one she opened, and the month the drawing of it names', async () => {
      await sheOpens('/calendar');

      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheOpens));

      await shePresses(calendarEarlierTestID);

      expect(theMonthSheReads()).toBe(monthLabel(theMonthBeforeSheOpens()));
      expect(theMonthSheReads()).toContain(theMonthTheEarlierDrawingNames());
    });

    it('holds against that drawing, part for part and in the order it places them', async () => {
      await sheOpens('/calendar');
      await shePresses(calendarEarlierTestID);

      expect(partsMissing(theEarlierMonthOfTheDrawing(), whatTheMonthScreenDrew())).toEqual([]);
    });

    it('draws the sheet that drawing places, once she presses the day it opens', async () => {
      await sheOpens('/calendar');
      await shePresses(calendarEarlierTestID);
      await shePresses(dayTestID(theDayTheEarlierDrawingOpens()));

      expect(theSheetSheReads()).toBeDefined();
      expect(
        partsMissing(theEarlierMonthAndItsSheetOfTheDrawing(), whatTheMonthScreenDrew()),
      ).toEqual([]);
    });

    it('rings no square of it, because today is in the month she opened', async () => {
      await sheOpens('/calendar');

      expect(theMarkOnTheSquare(theDaySheOpensTheMonth())).toBe('today');

      await shePresses(calendarEarlierTestID);

      expect(theMarkOnTheSquare(theDayTheEarlierDrawingOpens())).not.toBe('today');
    });

    it('is the month two behind the one she opened when she presses it twice', async () => {
      await sheOpens('/calendar');
      await shePresses(calendarEarlierTestID);
      await shePresses(calendarEarlierTestID);

      expect(theMonthSheReads()).toBe(monthLabel(theMonthTwoBeforeSheOpens()));
    });
  });

  describe('the way to a later month', () => {
    it('reads the month after the one she opened, two presses on from the month before', async () => {
      const app = await sheOpens('/calendar');

      await shePresses(calendarEarlierTestID);
      await shePresses(calendarLaterTestID);
      await shePresses(calendarLaterTestID);

      expect(theMonthSheReads()).toBe(monthLabel(theMonthAfterSheOpens()));
      expect(app.pathname()).toBe('/calendar');
    });

    it('returns her to the month she opened, with today ringed on it again', async () => {
      await sheOpens('/calendar');
      await shePresses(calendarEarlierTestID);
      await shePresses(calendarLaterTestID);
      await shePresses(calendarLaterTestID);
      await shePresses(calendarEarlierTestID);

      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheOpens));
      expect(theMarkOnTheSquare(theDaySheOpensTheMonth())).toBe('today');
    });

    it('reaches a month of days she has not lived, and names a day of it as a forecast', async () => {
      await sheOpens('/calendar');
      await shePresses(calendarLaterTestID);

      const aDayAheadOfHer = `${theMonthAfterSheOpens().slice(0, 8)}15`;

      expect(theMonthSheReads()).toBe(monthLabel(theMonthAfterSheOpens()));

      await shePresses(dayTestID(aDayAheadOfHer));

      expect(theSheetSheReads()?.line).toMatch(/likely to start between/);
      expect(screen.queryByTestId(daySheetOpenTestID)).toBeNull();
    });
  });

  describe('the month she is reading, held in the address', () => {
    it('carries a day of that month, so nothing else has to remember it', async () => {
      const app = await sheOpens('/calendar');

      await shePresses(calendarEarlierTestID);

      expect(startOfMonth(theDayTheAddressCarries(app))).toBe(theMonthBeforeSheOpens());
    });

    it('is the month she comes back to from a day she opened in it', async () => {
      const app = await sheOpens('/calendar');

      await shePresses(calendarEarlierTestID);
      await shePresses(calendarEarlierTestID);

      const aDayOfThatMonth = `${theMonthTwoBeforeSheOpens().slice(0, 8)}14`;

      await shePresses(dayTestID(aDayOfThatMonth));
      await shePresses(daySheetOpenTestID);

      expect(app.pathname()).toBe(`/day/${aDayOfThatMonth}`);

      await shePresses(logFlowDoneTestID);

      expect(app.pathname()).toBe('/calendar');
      expect(theMonthSheReads()).toBe(monthLabel(theMonthTwoBeforeSheOpens()));
    });
  });

  describe('the header the title shares with the way back and Today', () => {
    it('draws the whole month with no line limit, so the title is never cut', async () => {
      await sheOpens('/calendar');

      const title = screen.getByTestId(calendarTitleTestID);

      expect(title.props.numberOfLines).toBeUndefined();
      expect(title).toHaveTextContent(monthLabel(theMonthSheOpens));
    });

    it('never takes a point off the way back or Today', async () => {
      await sheOpens('/calendar');

      for (const end of [calendarHeaderStartTestID, calendarHeaderEndTestID]) {
        expect(StyleSheet.flatten(screen.getByTestId(end).props.style)).toMatchObject({
          flexShrink: 0,
        });
      }
    });
  });

  describe('the two ways, as a thumb and a screen reader meet them', () => {
    it('are each at least 44 points on both axes', async () => {
      await sheOpens('/calendar');

      expect(controlsTooSmallToPress(theWaysToAnotherMonth())).toEqual([]);
    });

    it('each tell somebody listening the month they go to', async () => {
      await sheOpens('/calendar');

      expect(screen.getByTestId(calendarEarlierTestID).props.accessibilityLabel).toBe(
        monthLabel(theMonthBeforeSheOpens()),
      );
      expect(screen.getByTestId(calendarLaterTestID).props.accessibilityLabel).toBe(
        monthLabel(theMonthAfterSheOpens()),
      );
    });

    it('name the new months once she has moved, so the label follows the month she reads', async () => {
      await sheOpens('/calendar');
      await shePresses(calendarEarlierTestID);

      expect(screen.getByTestId(calendarEarlierTestID).props.accessibilityLabel).toBe(
        monthLabel(theMonthTwoBeforeSheOpens()),
      );
      expect(screen.getByTestId(calendarLaterTestID).props.accessibilityLabel).toBe(
        monthLabel(theMonthSheOpens),
      );
    });

    it('stand in the header, the arrow back left of the month name and the arrow on right of it', async () => {
      await sheOpens('/calendar');

      const header = screen.getByTestId(calendarHeaderTestID);
      const order = within(header)
        .getAllByTestId(
          new RegExp(`^(${calendarEarlierTestID}|${calendarTitleTestID}|${calendarLaterTestID})$`),
        )
        .map((element) => element.props.testID as string);

      expect(order).toEqual([calendarEarlierTestID, calendarTitleTestID, calendarLaterTestID]);
      expect(
        within(screen.getByTestId(screenHeaderBeforeTitleTestID(calendarHeaderTestID))).getByTestId(
          calendarEarlierTestID,
        ),
      ).toBeTruthy();
      expect(
        within(screen.getByTestId(screenHeaderAfterTitleTestID(calendarHeaderTestID))).getByTestId(
          calendarLaterTestID,
        ),
      ).toBeTruthy();
    });

    it('replace the row of Earlier and Later under the header, which is gone', async () => {
      await sheOpens('/calendar');

      expect(screen.queryByTestId('calendar-screen-pages')).toBeNull();
      expect(screen.queryByText('Earlier')).toBeNull();
      expect(screen.queryByText('Later')).toBeNull();
    });
  });
});
