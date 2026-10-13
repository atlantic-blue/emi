import { join } from 'node:path';

import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import {
  editPeriodAddAfterTestID,
  editPeriodAddBeforeTestID,
  editPeriodCancelTestID,
  editPeriodRowTestID,
  editPeriodSaveTestID,
} from '../../src/features/calendar/EditPeriodScreen';
import { dayParameter } from '../../src/features/calendar/askedMonth';
import { whatSheChanged } from '../../src/features/calendar/savePeriod';
import { english } from '../../src/language/english';
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
  theDaySheStopped,
  theDaySheTakesOff,
  theDaysEmiHolds,
  theDaysHerPhoneHoldsIn,
  theDaysSheAdds,
  theDaysTheListDrew,
  theDaysTickedOnThePicker,
  theTagOn,
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

const thePickerAt = (day: string): string => `/calendar/period?${dayParameter}=${day}`;

/** The list, opened on the first day of the period Emi holds, which is the day she pressed. */
const thePicker = (): string => thePickerAt(String(theDaysEmiHolds()[0]));

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
      await sheOpens(thePicker());

      expect(sheIsOnThePeriodPicker()).toBe(true);
      expect(partsMissing(thePartsOfTheRangePickerDrawing(), whatTheRangePickerDrew())).toEqual([]);
    });

    it('lists the period of the day the address names, ticked, and the two days after it', async () => {
      await sheOpens(thePicker());

      expect(theDaysTickedOnThePicker()).toEqual(theDaysEmiHolds());
      expect(theDaysTheListDrew()).toEqual([
        ...theDaysEmiHolds(),
        theDaySheStopped(),
        addADay(theDaySheStopped(), 1),
      ]);
    });

    it('lists the same period from any day of that cycle, and from a day ahead of her', async () => {
      await sheOpens(thePickerAt(addADay(String(theDaysEmiHolds()[0]), 8)));

      expect(theDaysTickedOnThePicker()).toEqual(theDaysEmiHolds());
    });

    it('tags a day she adds Added and a day she takes off Taken off', async () => {
      await sheOpens(thePicker());

      await shePresses(editPeriodRowTestID(theDaySheStopped()));
      await shePresses(editPeriodRowTestID(theDaySheTakesOff()));

      expect(theTagOn(theDaySheStopped())).toBe(english['calendar.editPeriod.addedDay']);
      expect(theTagOn(theDaySheTakesOff())).toBe(english['calendar.editPeriod.takenOffDay']);
      expect(theTagOn(String(theDaysEmiHolds()[1]))).toBeUndefined();
      expect(theChangeLineSheReads()).toBe(
        `You added the ${Number(theDaySheStopped().slice(8))}th. You took the ${Number(theDaySheTakesOff().slice(8))}th off.`,
      );
    });

    it('adds a day before the list and a day after it, ticked, so no day is out of reach', async () => {
      await sheOpens(thePicker());
      const before = addADay(String(theDaysEmiHolds()[0]), -1);
      const after = addADay(theDaySheStopped(), 2);

      await shePresses(editPeriodAddBeforeTestID);
      await shePresses(editPeriodAddAfterTestID);

      expect(theDaysTheListDrew()[0]).toBe(before);
      expect(theDaysTheListDrew().at(-1)).toBe(after);
      expect(theDaysTickedOnThePicker()).toEqual(expect.arrayContaining([before, after]));
      expect(theTagOn(before)).toBe(english['calendar.editPeriod.addedDay']);
    });

    it('offers no day after today', async () => {
      jest.setSystemTime(new Date(`${addADay(theDaySheStopped(), 1)}T12:00:00.000Z`));
      await sheOpens(thePicker());

      expect(theDaysTheListDrew().at(-1)).toBe(addADay(theDaySheStopped(), 1));
      expect(screen.queryByTestId(editPeriodAddAfterTestID)).toBeNull();
    });

    it('says nothing has changed, and offers no save until something has', async () => {
      await sheOpens(thePicker());

      expect(theChangeLineSheReads()).not.toBe('');
      expect(screen.getByTestId(editPeriodSaveTestID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('offers a save once she changes one day, and takes it back when she undoes it', async () => {
      await sheOpens(thePicker());

      await shePresses(editPeriodRowTestID(theDaySheStopped()));

      expect(screen.getByTestId(editPeriodSaveTestID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      );

      await shePresses(editPeriodRowTestID(theDaySheStopped()));

      expect(screen.getByTestId(editPeriodSaveTestID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('offers no save when she takes every day of the period off', async () => {
      await sheOpens(thePicker());

      for (const day of theDaysEmiHolds()) {
        await shePresses(editPeriodRowTestID(day));
      }

      expect(theDaysTickedOnThePicker()).toEqual([]);
      expect(screen.getByTestId(editPeriodSaveTestID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('gives every row a thumb to press, and tells somebody listening it is a tick', async () => {
      await sheOpens(thePicker());

      const rows = theDaysEmiHolds().map(
        (day) => screen.getByTestId(editPeriodRowTestID(day)) as unknown as Control,
      );

      expect(controlsTooSmallToPress(rows)).toEqual([]);
      expect(whatSomebodyListeningHearsOn(String(theDaysEmiHolds()[0]))).toEqual({
        checked: true,
        disabled: undefined,
        role: 'checkbox',
      });
    });
  });

  describe('the way out that writes nothing', () => {
    it('leaves her period as it was when she cancels after changing days', async () => {
      const app = await sheOpens(thePicker());

      for (const day of theDaysSheAdds()) {
        await shePresses(editPeriodRowTestID(day));
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
      await sheOpens(thePicker());

      for (const day of theDaysSheAdds()) {
        await shePresses(editPeriodRowTestID(day));
      }
      await shePresses(editPeriodRowTestID(theDaySheTakesOff()));
      await shePresses(editPeriodSaveTestID);

      const untouched = theDaysEmiHolds().filter((day) => day !== theDaySheTakesOff());

      for (const day of untouched) {
        expect(whatHerPhoneHoldsOn(day)?.revision).toBe(1);
      }

      expect(theDaysHerPhoneHoldsIn(theMonthSheCorrects)).toEqual(
        [...new Set([...theDaysEmiHolds(), ...theDaysSheAdds()])].sort(),
      );
    });

    it('writes a day she added from outside the list, and takes nothing off', async () => {
      await sheOpens(thePicker());
      const before = addADay(String(theDaysEmiHolds()[0]), -1);

      expect(whatHerPhoneHoldsOn(before)).toBeUndefined();

      await shePresses(editPeriodAddBeforeTestID);
      await shePresses(editPeriodSaveTestID);

      expect(whatHerPhoneHoldsOn(before)?.revision).toBe(1);
      expect(theCycleStartsHerPhoneHolds()).toContain(before);

      for (const day of theDaysEmiHolds()) {
        expect(whatHerPhoneHoldsOn(day)?.revision).toBe(1);
      }
    });

    it('rebuilds the cache from the day log, and the cache refuses a write by hand', async () => {
      await sheOpens(thePicker());

      await shePresses(editPeriodRowTestID(theDaySheTakesOff()));
      await shePresses(editPeriodSaveTestID);

      expect(theCycleStartsHerPhoneHolds()).toEqual(theCycleStartsHerDayLogGives());
      expect(() => {
        aCycleIsWrittenByHand();
      }).toThrow(/cache/);
    });

    it('moves the day her next period is expected on, because the cycle started a day later', async () => {
      await sheOpens(thePicker());

      const expectedBefore = theDayHerNextPeriodMayStartOn();

      await shePresses(editPeriodRowTestID(theDaySheTakesOff()));
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
      await sheOpens(thePicker());

      const inTheMiddle = theDaysEmiHolds()[3];

      for (const day of theDaysSheAdds()) {
        await shePresses(editPeriodRowTestID(day));
      }
      await shePresses(editPeriodRowTestID(String(inTheMiddle)));
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
