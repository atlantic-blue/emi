import { join } from 'node:path';

import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { dayTestID } from '../../src/features/calendar/CycleMonth';
import {
  editPeriodCancelTestID,
  editPeriodSaveTestID,
} from '../../src/features/calendar/PeriodRangePicker';
import { dayParameter } from '../../src/features/calendar/askedMonth';
import { whatSheChanged } from '../../src/features/calendar/savePeriod';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { type Control, controlsTooSmallToPress } from '../fixtures/tapTargets';
import { partsMissing } from '../fixtures/theMockupScreen';
import {
  aCycleIsWrittenByHand,
  herPhoneHoldsAPeriodOfFourDays,
  sheIsOnThePeriodPicker,
  theChangeLineSheReads,
  theCycleStartsHerDayLogGives,
  theCycleStartsHerPhoneHolds,
  theDayHerNextPeriodMayStartOn,
  theDaySheOpensEmi,
  theDaySheStopped,
  theDaySheTakesOff,
  theDaysEmiHolds,
  theDaysHerPhoneHoldsIn,
  theDaysSheAdds,
  theDaysTickedOnThePicker,
  theMonthSheCorrects,
  thePartsOfTheRangePickerDrawing,
  thePeriodLengthHerPhoneHolds,
  whatHerPhoneHoldsOn,
  whatSomebodyListeningHearsOn,
  whatTheRangePickerDrew,
  whenSheOpensEmi,
} from '../fixtures/thePeriodSheCorrects';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The whole period, saved as a range in one action.
 *
 * The walk itself is the scenario under features/. What is here is what the walk passes over: the
 * refusals, the days one save leaves alone, and what the cache holds when she leaves a gap in the
 * middle of a period.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

const thePickerAt = (month: string): string => `/calendar/period?${dayParameter}=${month}`;

async function sheOpens(at: string): Promise<{ readonly pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: at });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

describe('she corrects a whole period in one save and the ring redraws', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensEmi());
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHoldsAPeriodOfFourDays(whenSheOpensEmi());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the picker as she opens it', () => {
    it('holds against its drawing, part for part and in the order it places them', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      expect(sheIsOnThePeriodPicker()).toBe(true);
      expect(partsMissing(thePartsOfTheRangePickerDrawing(), whatTheRangePickerDrew())).toEqual([]);
    });

    it('draws the month the address names, and the period Emi holds in it', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      expect(theDaysTickedOnThePicker()).toEqual(theDaysEmiHolds());
    });

    it('says nothing has changed, and offers no save until something has', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      expect(theChangeLineSheReads()).not.toBe('');
      expect(screen.getByTestId(editPeriodSaveTestID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('offers a save once she changes one day, and takes it back when she undoes it', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      await shePresses(dayTestID(theDaySheStopped()));

      expect(screen.getByTestId(editPeriodSaveTestID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      );

      await shePresses(dayTestID(theDaySheStopped()));

      expect(screen.getByTestId(editPeriodSaveTestID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('offers no save when she takes every day of the period off', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      for (const day of theDaysEmiHolds()) {
        await shePresses(dayTestID(day));
      }

      expect(theDaysTickedOnThePicker()).toEqual([]);
      expect(screen.getByTestId(editPeriodSaveTestID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('gives every square of it a thumb to press, and refuses a day she has not lived', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      const squares = theDaysEmiHolds().map(
        (day) => screen.getByTestId(dayTestID(day)) as unknown as Control,
      );

      expect(controlsTooSmallToPress(squares)).toEqual([]);
      expect(whatSomebodyListeningHearsOn(addADay(theDaySheOpensEmi(), 1))).toEqual({
        checked: undefined,
        disabled: true,
        role: 'button',
      });
    });
  });

  describe('the way out that writes nothing', () => {
    it('leaves her period as it was when she cancels after changing days', async () => {
      const app = await sheOpens(thePickerAt(theMonthSheCorrects));

      for (const day of theDaysSheAdds()) {
        await shePresses(dayTestID(day));
      }

      await shePresses(editPeriodCancelTestID);

      expect(app.pathname()).toBe('/calendar');
      expect(theDaysHerPhoneHoldsIn(theMonthSheCorrects)).toEqual([
        ...theDaysEmiHolds(),
        theDaySheStopped(),
      ]);
      expect(whatHerPhoneHoldsOn(theDaySheStopped())?.revision).toBe(1);
    });
  });

  describe('one save', () => {
    it('writes a record for each day it changes and for no other day of the month', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      for (const day of theDaysSheAdds()) {
        await shePresses(dayTestID(day));
      }
      await shePresses(dayTestID(theDaySheTakesOff()));
      await shePresses(editPeriodSaveTestID);

      const untouched = theDaysEmiHolds().filter((day) => day !== theDaySheTakesOff());

      for (const day of untouched) {
        expect(whatHerPhoneHoldsOn(day)?.revision).toBe(1);
      }

      expect(theDaysHerPhoneHoldsIn(theMonthSheCorrects)).toEqual(
        [...new Set([...theDaysEmiHolds(), ...theDaysSheAdds()])].sort(),
      );
    });

    it('rebuilds the cache from the day log, and the cache refuses a write by hand', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      await shePresses(dayTestID(theDaySheTakesOff()));
      await shePresses(editPeriodSaveTestID);

      expect(theCycleStartsHerPhoneHolds()).toEqual(theCycleStartsHerDayLogGives());
      expect(() => {
        aCycleIsWrittenByHand();
      }).toThrow(/cache/);
    });

    it('moves the day her next period is expected on, because the cycle started a day later', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      const expectedBefore = theDayHerNextPeriodMayStartOn();

      await shePresses(dayTestID(theDaySheTakesOff()));
      await shePresses(editPeriodSaveTestID);

      expect(theCycleStartsHerPhoneHolds()).toContain(addADay(theDaySheTakesOff(), 1));
      expect(theDayHerNextPeriodMayStartOn()).not.toBe(expectedBefore);
    });
  });

  /**
   * A period she leaves a hole in. Her body decides which days she bled on, so the picker takes the
   * days she gives it, and the arithmetic then reads a recorded day with no bleeding as the end of
   * the period. Every bleeding day inside eight days of the start after that end reaches no cycle,
   * so the cache holds a shorter period than the ticks she left. It is written down here because a
   * woman who does this is owed an answer, and today the answer is that the days after the hole
   * count for nothing.
   */
  describe('a period she leaves a hole in', () => {
    it('ends the period at the hole, and the days after it reach no cycle', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      const inTheMiddle = theDaysEmiHolds()[3];

      for (const day of theDaysSheAdds()) {
        await shePresses(dayTestID(day));
      }
      await shePresses(dayTestID(String(inTheMiddle)));
      await shePresses(editPeriodSaveTestID);

      expect(theCycleStartsHerPhoneHolds()).toEqual(theCycleStartsHerDayLogGives());
      expect(thePeriodLengthHerPhoneHolds(String(theDaysEmiHolds()[0]))).toBe(3);
    });
  });

  describe('what one save changes', () => {
    it('is the days she added and the days she took off, and never a day she left alone', () => {
      expect(
        whatSheChanged({
          held: ['2026-09-15', '2026-09-16', '2026-09-17'],
          ticked: ['2026-09-16', '2026-09-17', '2026-09-18'],
        }),
      ).toEqual({ added: ['2026-09-18'], removed: ['2026-09-15'] });
    });

    it('is nothing at all when she is holding the days Emi already held', () => {
      expect(
        whatSheChanged({
          held: ['2026-09-16', '2026-09-15'],
          ticked: ['2026-09-15', '2026-09-16'],
        }),
      ).toEqual({ added: [], removed: [] });
    });
  });
});

/** One day on from a day, without reaching for the arithmetic package in a test of a screen. */
function addADay(day: string, count: number): string {
  const at = new Date(`${day}T00:00:00.000Z`);

  at.setUTCDate(at.getUTCDate() + count);

  return at.toISOString().slice(0, 10);
}
