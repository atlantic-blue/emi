import { symptomGroups } from '@emi/cycle';
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
import {
  dayRefusedBackTestID,
  dayRefusedCalendarTestID,
  dayRefusedChevronTestID,
  dayRefusedTestID,
  dayRefusedTitleTestID,
} from '../../src/features/log/DayRefused';
import { flowPickerTestID } from '../../src/features/log/FlowPicker';
import { groupTileTestID } from '../../src/features/log/GroupTiles';
import { logHeaderLeaveTestID } from '../../src/features/log/LogHeader';
import { symptomGroupTestID } from '../../src/features/log/SymptomGroup';
import { dateWords } from '../../src/features/onboarding/days';
import {
  logFlowDoneTestID,
  logFlowFlowCardTestID,
  logFlowFootDoneTestID,
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
  theDaySheAlreadyLived,
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
    });

    it('puts Done at the top right as a word in the accent, and no wide button at the foot', () => {
      expect(screen.getByTestId(logFlowDoneTestID)).toHaveProp('accessibilityRole', 'link');
      expect(whereTheLogOrCalendarDrew(logFlowDoneTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(logFlowFlowCardTestID),
      );
      expect(whereTheLogOrCalendarDrew(logHeaderLeaveTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(logFlowWhenTestID),
      );
      expect(screen.queryByTestId(logFlowFootDoneTestID)).toBeNull();
    });

    it('draws her symptoms as the eight group tiles and never the long list of every symptom', () => {
      for (const group of symptomGroups) {
        expect(screen.getByTestId(groupTileTestID(group))).toBeTruthy();
        expect(screen.queryByTestId(symptomGroupTestID(group))).toBeNull();
      }
      expect(screen.queryAllByTestId(/^symptom-chip-/)).toHaveLength(0);
    });
  });

  describe('a day she already lived', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheReads('day'));
      await sheIsLookingAtTheLogOrCalendar('day');
    });

    it('names the date in the header, with the way back on the left and Done on the right', () => {
      expect(screen.getByTestId(logFlowWhenTestID)).toHaveTextContent(
        dateWords(theDaySheAlreadyLived),
      );
      expect(whereTheLogOrCalendarDrew(logHeaderLeaveTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(logFlowWhenTestID),
      );
      expect(whereTheLogOrCalendarDrew(logFlowWhenTestID)).toBeLessThan(
        whereTheLogOrCalendarDrew(logFlowDoneTestID),
      );
    });

    it('offers Done again at the foot, as the one wide capsule in the accent', () => {
      const done = theStyleOf(logFlowFootDoneTestID);

      expect(done.backgroundColor).toBe(colour.accent);
      expect(done.borderRadius).toBe(radius.full);
      expect(Number(done.minHeight)).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });

    it('leaves out the note to the reader about the ring', () => {
      expect(screen.queryByText(/The ring beside it/)).toBeNull();
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

    it('draws the way back at the top and the calendar above the title, as the board does', () => {
      const screenAt = theScreenOf('dayRefused');

      expect(whereTheLogOrCalendarDrew(dayRefusedChevronTestID, screenAt)).toBeLessThan(
        whereTheLogOrCalendarDrew(dayRefusedCalendarTestID, screenAt),
      );
      expect(whereTheLogOrCalendarDrew(dayRefusedCalendarTestID, screenAt)).toBeLessThan(
        whereTheLogOrCalendarDrew(dayRefusedTitleTestID, screenAt),
      );
      expect(screen.queryByText(/An address that is not a date/)).toBeNull();
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
