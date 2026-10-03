import { MINIMUM_TAP_TARGET, colour, radius } from '@emi/tokens';
import { screen } from '@testing-library/react-native';

import {
  calendarEditPeriodTestID,
  calendarHeaderTestID,
} from '../../src/features/calendar/CalendarScreen';
import { daySheetTestID } from '../../src/features/calendar/DaySheet';
import {
  editPeriodChangeTestID,
  editPeriodKeyTestID,
  editPeriodSaveTestID,
  periodRangePickerTestID,
} from '../../src/features/calendar/PeriodRangePicker';
import { editPeriodCopy } from '../../src/features/calendar/copy';
import { dayRefusedBackTestID, dayRefusedTestID } from '../../src/features/log/DayRefused';
import { flowPickerTestID } from '../../src/features/log/FlowPicker';
import {
  logFlowDoneTestID,
  logFlowFlowCardTestID,
  logFlowSavedTestID,
  logFlowSymptomsCardTestID,
  logFlowTitleTestID,
  logFlowWhenTestID,
} from '../../src/features/log/LogFlow';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  howManyDifferencesAreKeptFor,
  howManyPartsAreHeldTo,
  sheIsLookingAtTheLogOrCalendar,
  theChangeKeyNames,
  theDifferencesThisStepKeeps,
  theLogAndCalendarDrawings,
  theScreenOf,
  theStyleOf,
  theWashIsAtTheTopOfTheLogOrCalendar,
  theWordsOfTheKeyEntry,
  whatTheDrawingAsksFor,
  whatTheLogOrCalendarDoesNotAnswerFor,
  whenSheReads,
  whereTheLogOrCalendarDrew,
} from '../fixtures/theLogAndCalendarLook';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The screens she writes her day on and the screens she corrects it on, in the shapes the approved
 * redesign draws them in.
 *
 * Every case here reads a rendered state against the drawing of that state in the mockups stage.
 * Nothing here decides what Emi counts, what it refuses or where a press leads: a case reads what
 * the screen drew and in what order.
 */

describe('the Log and calendar screens match the redesign prototype', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('every screen of the set', () => {
    for (const drawing of theLogAndCalendarDrawings) {
      it(`carries the wash at the top of ${drawing}`, async () => {
        jest.setSystemTime(whenSheReads(drawing));
        await sheIsLookingAtTheLogOrCalendar(drawing);

        expect(theWashIsAtTheTopOfTheLogOrCalendar()).toBe(true);
      });
    }

    for (const drawing of theLogAndCalendarDrawings) {
      it(`answers for every part the drawing of ${drawing} names, in its order`, async () => {
        jest.setSystemTime(whenSheReads(drawing));
        await sheIsLookingAtTheLogOrCalendar(drawing);

        expect(whatTheDrawingAsksFor(drawing).length).toBeGreaterThan(1);
        expect(whatTheLogOrCalendarDoesNotAnswerFor(drawing)).toHaveLength(
          howManyDifferencesAreKeptFor(drawing),
        );
      });
    }

    it('is held to every part of every drawing, and the count is the check', () => {
      expect(theLogAndCalendarDrawings).toHaveLength(7);
      expect(howManyPartsAreHeldTo()).toBeGreaterThan(55);
    });

    it('names every part it leaves unanswered, which screen it is on, and why', () => {
      expect(theDifferencesThisStepKeeps.length).toBeGreaterThan(0);

      for (const kept of theDifferencesThisStepKeeps) {
        expect(theLogAndCalendarDrawings).toContain(kept.drawing);
        expect(kept.howMany).toBeGreaterThan(0);
        expect(kept.because.length).toBeGreaterThan(40);
      }
    });

    it('names a part the log does not draw, so a silent gap cannot hide in the count', async () => {
      jest.setSystemTime(whenSheReads('dayRefused'));
      await sheIsLookingAtTheLogOrCalendar('dayRefused');

      const missing = whatTheLogOrCalendarDoesNotAnswerFor('log').join(' ');

      expect(missing).toContain('CycleRing');
      expect(missing).toContain('FlowPicker');
      expect(missing).toContain('BottomNavigation');
    });
  });

  describe('the log she writes her day on', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheReads('log'));
      await sheIsLookingAtTheLogOrCalendar('log');
    });

    it('stands the flow she picks in a card, and the symptoms under it in a second one', () => {
      expect(theStyleOf(logFlowFlowCardTestID).backgroundColor).toBe(colour.card);
      expect(theStyleOf(logFlowFlowCardTestID).borderRadius).toBe(radius.xl);
      expect(theStyleOf(logFlowSymptomsCardTestID).backgroundColor).toBe(colour.card);
      expect(whereTheLogOrCalendarDrew(logFlowFlowCardTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(logFlowSymptomsCardTestID),
      );
    });

    it('names the day over the heading of the flow, which is the order the drawing places', () => {
      expect(whereTheLogOrCalendarDrew(logFlowWhenTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(logFlowTitleTestID),
      );
      expect(whereTheLogOrCalendarDrew(logFlowTitleTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(flowPickerTestID),
      );
    });

    it('keeps the line about her phone under the symptoms, where the drawing puts it', () => {
      expect(whereTheLogOrCalendarDrew(logFlowSavedTestID)).toBeGreaterThan(
        whereTheLogOrCalendarDrew(logFlowSymptomsCardTestID),
      );
      expect(whereTheLogOrCalendarDrew(logFlowSavedTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(logFlowDoneTestID),
      );
    });

    it('asks her to finish with the one wide capsule in the accent', () => {
      const done = theStyleOf(logFlowDoneTestID);

      expect(done.backgroundColor).toBe(colour.accent);
      expect(done.borderRadius).toBe(radius.full);
      expect(Number(done.minHeight)).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });
  });

  describe('a day Emi will not take', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheReads('dayRefused'));
      await sheIsLookingAtTheLogOrCalendar('dayRefused');
    });

    it('offers the way back as the quieter capsule, in the recessed ground', () => {
      const back = theStyleOf(dayRefusedBackTestID);

      expect(back.backgroundColor).toBe(colour.field);
      expect(back.borderRadius).toBe(radius.full);
      expect(Number(back.minHeight)).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });

    it('is the refusal screen and draws no picker at all', () => {
      expect(screen.getByTestId(dayRefusedTestID)).toBeTruthy();
      expect(screen.queryByTestId(flowPickerTestID)).toBeNull();
    });
  });

  describe('the month she reads her own days off', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheReads('calendar'));
      await sheIsLookingAtTheLogOrCalendar('calendar');
    });

    it('puts the day she pressed over the way to her whole period', () => {
      expect(whereTheLogOrCalendarDrew(daySheetTestID, calendarHeaderTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(calendarEditPeriodTestID, calendarHeaderTestID),
      );
    });

    it('offers her whole period as the quieter capsule, not as the one that acts', () => {
      const way = theStyleOf(calendarEditPeriodTestID);

      expect(way.backgroundColor).toBe(colour.field);
      expect(way.borderRadius).toBe(radius.full);
      expect(Number(way.minHeight)).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });
  });

  describe('her whole period, corrected in one action', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheReads('editPeriod'));
      await sheIsLookingAtTheLogOrCalendar('editPeriod');
    });

    it('says what she added and what she took off, in the words the catalogue holds', () => {
      expect(theChangeKeyNames()).toEqual(['added', 'takenOff']);
      expect(theWordsOfTheKeyEntry('added')).toBe(editPeriodCopy.added);
      expect(theWordsOfTheKeyEntry('takenOff')).toBe(editPeriodCopy.takenOff);
    });

    it('stands that key under the grid and over the sentence Emi reads back', () => {
      const screenAt = theScreenOf('editPeriod');

      expect(whereTheLogOrCalendarDrew(periodRangePickerTestID, screenAt)).toBeLessThan(
        whereTheLogOrCalendarDrew(editPeriodKeyTestID, screenAt),
      );
      expect(whereTheLogOrCalendarDrew(editPeriodKeyTestID, screenAt)).toBeLessThan(
        whereTheLogOrCalendarDrew(editPeriodChangeTestID, screenAt),
      );
    });

    it('saves with the one wide capsule in the accent', () => {
      const save = theStyleOf(editPeriodSaveTestID);

      expect(save.backgroundColor).toBe(colour.accent);
      expect(save.borderRadius).toBe(radius.full);
    });
  });
});
