import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { dayTestID } from '../../src/features/calendar/CycleMonth';
import { daySheetTestID } from '../../src/features/calendar/DaySheet';
import { words } from '../../src/language';
import {
  dayRefusedBackTestID,
  dayRefusedCopy,
  dayRefusedTestID,
} from '../../src/features/log/DayRefused';
import { flowOptionTestID, flowPickerTestID } from '../../src/features/log/FlowPicker';
import { readDayLog } from '../../src/data/dayLogRepository';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herDatabase } from '../fixtures/herPhone';
import { herVault } from '../fixtures/herVault';
import { partsMissing } from '../fixtures/theMockupScreen';
import {
  thePartsOfTheDrawingOfARefusedDay,
  whatTheRefusalDrew,
} from '../fixtures/theDayEmiRefuses';
import {
  herPhoneHoldsThreeRecordedCycles,
  theDayAheadSheCannotOpen,
  theDaySheOpensTheMonth,
  theDaysBehindHer,
  theSheetSheReads,
  theSquareSheSees,
  theSquaresTheMonthDrew,
} from '../fixtures/theMonthSheOpens';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * A day she has not lived, met from the month and met from its own address. One rule decides both,
 * so she never reads two refusals worded differently for one day.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the day the drawing of the month rings, so her calendar reads the same in any zone. */
const whenSheOpensIt = (): Date => new Date(`${theDaySheOpensTheMonth()}T12:00:00.000Z`);

async function sheOpens(at: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: at });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function whatWasRecordedOn(day: string): unknown {
  const row = readDayLog(herDatabase(), day);

  return row ? herVault().open(row.payload) : undefined;
}

/** The days of the drawn month she has not lived, which is every day after the one she opens it on. */
function theDaysAheadOfHer(): string[] {
  return theSquaresTheMonthDrew().filter((day) => day > theDaySheOpensTheMonth());
}

describe('a day that has not happened yet is refused in the month and at its address', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt());
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHoldsThreeRecordedCycles(whenSheOpensIt());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the month, on a day she has not lived', () => {
    it('opens nothing and names nothing at the foot when she presses it', async () => {
      await sheOpens('/calendar');
      await shePresses(dayTestID(theDayAheadSheCannotOpen()));

      expect(screen.queryByTestId(daySheetTestID)).toBeNull();
      expect(theSheetSheReads()).toBeUndefined();
      expect(screen.queryByTestId(dayRefusedTestID)).toBeNull();
    });

    it('keeps the square on the grid, drawn faint', async () => {
      await sheOpens('/calendar');

      expect(theDaysAheadOfHer().length).toBeGreaterThan(0);
      expect(screen.getByTestId(dayTestID(theDayAheadSheCannotOpen()))).toBeTruthy();
      expect(theSquareSheSees(theDayAheadSheCannotOpen()).dimmed).toBe(true);
    });

    it('tells somebody listening that every day ahead of her takes no press', async () => {
      await sheOpens('/calendar');

      const spoken = theDaysAheadOfHer().map((day) => theSquareSheSees(day));

      expect(spoken.length).toBeGreaterThan(0);
      expect(spoken.filter((square) => !square.saidToTakeNoPress)).toEqual([]);
      expect(spoken.filter((square) => !square.spoken.includes(words('cycle.day.notYet')))).toEqual(
        [],
      );
    });

    it('leaves today and every day behind it pressable', async () => {
      await sheOpens('/calendar');

      const behind = theDaysBehindHer();

      expect(behind).toContain(theDaySheOpensTheMonth());
      expect(behind.filter((day) => theSquareSheSees(day).saidToTakeNoPress)).toEqual([]);
      expect(behind.filter((day) => theSquareSheSees(day).dimmed)).toEqual([]);

      await shePresses(dayTestID(theDaySheOpensTheMonth()));

      expect(theSheetSheReads()).toBeDefined();
    });
  });

  describe('the same day, reached by its address', () => {
    it('says the day has not happened, in the words the drawing carries', async () => {
      await sheOpens(`/day/${theDayAheadSheCannotOpen()}`);

      expect(screen.getByText(dayRefusedCopy['day-is-in-the-future'].title)).toBeTruthy();
      expect(screen.getByText(dayRefusedCopy['day-is-in-the-future'].line)).toBeTruthy();
    });

    it('is the drawing of the day Emi refuses, part for part and in its order', async () => {
      await sheOpens(`/day/${theDayAheadSheCannotOpen()}`);

      expect(partsMissing(thePartsOfTheDrawingOfARefusedDay(), whatTheRefusalDrew())).toEqual([]);
    });

    it('offers no flow to pick, so no path records a day she has not lived', async () => {
      await sheOpens(`/day/${theDayAheadSheCannotOpen()}`);

      expect(screen.queryByTestId(flowPickerTestID)).toBeNull();
      expect(screen.queryByTestId(flowOptionTestID('heavy'))).toBeNull();

      await shePresses(dayRefusedBackTestID);

      expect(whatWasRecordedOn(theDayAheadSheCannotOpen())).toBeUndefined();
    });

    it('refuses a day a month ahead the same way it refuses one two days ahead', async () => {
      const far = addDays(theDaySheOpensTheMonth(), 40);

      await sheOpens(`/day/${far}`);

      expect(screen.getByText(dayRefusedCopy['day-is-in-the-future'].line)).toBeTruthy();
    });
  });
});
