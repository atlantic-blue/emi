import { join } from 'node:path';

import { space, stroke } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import {
  calendarEarlierTestID,
  calendarHeadingTestID,
  calendarLaterTestID,
  calendarTitleTestID,
} from '../../src/features/calendar/CalendarScreen';
import { dayTestID } from '../../src/features/calendar/CycleMonth';
import { daySheetTestID } from '../../src/features/calendar/DaySheet';
import { calendarCopy } from '../../src/features/calendar/copy';
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
import {
  type Box,
  type MeasuredWordRow,
  anIPhone16,
  theRowOfWords,
  toATenthOfAPoint,
} from '../fixtures/theWidthOfARow';
import { theWidthOfWords } from '../fixtures/theWidthOfWords';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The way to an earlier month and the way to a later month. Story 9 ends on a day two months
 * behind today, and until these two exist the only month she can read is the month she arrived on.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the day the drawing of the month rings, so the month reads the same in any zone. */
const whenSheOpensTheMonth = (): Date => new Date(`${theDaySheOpensTheMonth()}T12:00:00.000Z`);

/** Points. What a pill puts round its own words: the padding each side and the line it carries. */
const thePillAroundTheWords = 2 * space.spaceMd + 2 * stroke.hairline;

/**
 * Points. Every width the title could arrive at, from nothing to far wider than any glass. A month
 * name is longer in Spanish than in English, and longer again in a face the phone substitutes for
 * Cyrillic, so the rule is held at each of these rather than at the English width alone.
 */
const everyWidthATitleCouldTake: readonly number[] = [0, 20, 60, 120, 200, 400, 1000];

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

/**
 * The row that carries the month title, laid out on an iPhone 16: the way to an earlier month, the
 * title, and the way to a later month.
 *
 * A style is the same in every language and only the words change, so one render carries every
 * case and a language arrives as a width. The title is swept rather than measured, because the
 * shipped faces carry no Cyrillic and no width for Russian can be read here.
 */
function theRowOfTheTitle(titleWidth: number): MeasuredWordRow {
  const aCell = (testID: string, words: number): { box: Box; words: number } => ({
    box: screen.getByTestId(testID) as unknown as Box,
    words,
  });

  return theRowOfWords(
    screen.getByTestId(calendarHeadingTestID) as unknown as Box,
    [
      aCell(calendarEarlierTestID, theWidthOfWords(calendarCopy.earlier, 'body-sm')),
      aCell(calendarTitleTestID, titleWidth),
      aCell(calendarLaterTestID, theWidthOfWords(calendarCopy.later, 'body-sm')),
    ],
    anIPhone16.width,
  );
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

    it('reaches a month of days she has not lived, and offers her none of them', async () => {
      await sheOpens('/calendar');
      await shePresses(calendarLaterTestID);

      const aDayAheadOfHer = `${theMonthAfterSheOpens().slice(0, 8)}15`;

      expect(theMonthSheReads()).toBe(monthLabel(theMonthAfterSheOpens()));

      await shePresses(dayTestID(aDayAheadOfHer));

      expect(theSheetSheReads()).toBeUndefined();
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
      await shePresses(daySheetTestID);

      expect(app.pathname()).toBe(`/day/${aDayOfThatMonth}`);

      await shePresses(logFlowDoneTestID);

      expect(app.pathname()).toBe('/calendar');
      expect(theMonthSheReads()).toBe(monthLabel(theMonthTwoBeforeSheOpens()));
    });
  });

  describe('the row the title shares with the two ways, at 393 points across', () => {
    it.each(everyWidthATitleCouldTake)(
      'stands a gap between the title and each way at a title of %p points',
      async (titleWidth) => {
        await sheOpens('/calendar');

        const row = theRowOfTheTitle(titleWidth);

        expect(row.separations).toHaveLength(2);

        for (const separation of row.separations) {
          expect(separation).toBeGreaterThanOrEqual(space.spaceSm);
        }
      },
    );

    it('ends inside the row, whatever the title asks for', async () => {
      await sheOpens('/calendar');

      for (const titleWidth of everyWidthATitleCouldTake) {
        const row = theRowOfTheTitle(titleWidth);

        expect(row.rightEdge).toBeLessThanOrEqual(row.width);
      }
    });

    it('never takes a point off either way to another month', async () => {
      await sheOpens('/calendar');

      const aPillAround = (word: string): number =>
        toATenthOfAPoint(theWidthOfWords(word, 'body-sm') + thePillAroundTheWords);

      for (const titleWidth of everyWidthATitleCouldTake) {
        const [earlier, , later] = theRowOfTheTitle(titleWidth).cellWidths;

        expect(earlier).toBe(aPillAround(calendarCopy.earlier));
        expect(later).toBe(aPillAround(calendarCopy.later));
      }
    });

    it('draws the title on one line, so giving way never makes the row taller', async () => {
      await sheOpens('/calendar');

      expect(screen.getByTestId(calendarTitleTestID).props.numberOfLines).toBe(1);
    });

    it('leaves the English month its whole width, and lets it give way past that', async () => {
      await sheOpens('/calendar');

      const theWholeTitle = theWidthOfWords(monthLabel(theMonthSheOpens), 'headline-md');
      const [, asDrawn] = theRowOfTheTitle(theWholeTitle).cellWidths;

      expect(asDrawn).toBe(toATenthOfAPoint(theWholeTitle));
      expect(theRowOfTheTitle(1000).cellWidths[1]).toBeLessThan(1000);
    });
  });

  describe('the two ways, as a thumb and a screen reader meet them', () => {
    it('are each at least 44 points on both axes', async () => {
      await sheOpens('/calendar');

      expect(controlsTooSmallToPress(theWaysToAnotherMonth())).toEqual([]);
    });

    it('each tell somebody listening which way they go', async () => {
      await sheOpens('/calendar');

      expect(screen.getByTestId(calendarEarlierTestID).props.accessibilityLabel).toBe(
        calendarCopy.earlierMonth,
      );
      expect(screen.getByTestId(calendarLaterTestID).props.accessibilityLabel).toBe(
        calendarCopy.laterMonth,
      );
      expect(calendarCopy.earlierMonth).not.toBe(calendarCopy.laterMonth);
    });
  });
});
