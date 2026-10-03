import { MINIMUM_TAP_TARGET, colour, radius } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet, type ViewStyle } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import {
  loggedTodayMarkTestID,
  loggedTodayTestID,
  loggedTodayTileTestID,
} from '../../src/features/home/LoggedToday';
import { phaseLineTestID } from '../../src/features/home/PhaseLine';
import {
  roundActionDiscTestID,
  roundActionDrawingTestID,
  roundActionTestID,
  roundActions,
} from '../../src/features/home/RoundAction';
import {
  sectionWaitingNeedsTestID,
  sectionWaitingReadTestID,
  sectionWaitingTestID,
  sectionWaitingTileTestID,
  waitingSections,
} from '../../src/features/home/SectionWaiting';
import {
  lockDiscTestID,
  lockLineTestID,
  lockTitleTestID,
  lockWordmarkTestID,
  unlockTestID,
} from '../../src/features/lock/LockScreen';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  type TodayDrawing,
  howManyPartsTheTodayScreensAreHeldTo,
  sheIsLookingAtTheTodayScreen,
  theDifferencesTheTodayStepKeeps,
  theDrawingNothingIsBuiltFor,
  theSecondDesignOfTheRoute,
  theTodayDrawings,
  thePushedHeaderBelongsToAnotherFeature,
  thePushedHeaderOfDayOne,
  theWashIsAtTheTopOfTheTodayScreen,
  thePartsOfTheReminderDrawing,
  thePartsOfTheSecondDesign,
  whatTheTodayDrawingAsksFor,
  whatTheTodayScreenDoesNotAnswerFor,
  whenSheOpens,
  whereTheScreenDrew,
} from '../fixtures/theTodayLook';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The Today screens, in the shapes the approved redesign draws them in.
 *
 * This is the screen she opens every day, so every case here reads a rendered state of it against
 * the drawing of that state in the mockups stage. Nothing here decides what Emi counts, what it
 * forecasts or where a press leads: a case reads what the screen drew and in what order.
 */

/** The three states of the screen the drawings place the ring above the phase line on. */
const theStatesWithARing: readonly TodayDrawing[] = ['todayNext', 'todayLuteal', 'todayLogged'];

/** Points. The disc of a round action, which the prototype draws wider than the tap floor. */
const theDiscIsThisWide = 60;

function styleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;
}

function drawingIn(testID: string): string {
  return String(screen.getByTestId(testID).props['xml']);
}

describe('the Today screens match the redesign prototype', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // The ring's one movement is step 2.4. Here it arrives already open, so what a case reads off
    // the screen is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('every state of the screen she opens', () => {
    for (const drawing of theTodayDrawings) {
      it(`carries the wash at the top of ${drawing}`, async () => {
        jest.setSystemTime(whenSheOpens(drawing));
        await sheIsLookingAtTheTodayScreen(drawing);

        expect(theWashIsAtTheTopOfTheTodayScreen()).toBe(true);
      });
    }

    for (const drawing of theTodayDrawings) {
      it(`answers for every part the drawing of ${drawing} names, in its order`, async () => {
        jest.setSystemTime(whenSheOpens(drawing));
        await sheIsLookingAtTheTodayScreen(drawing);

        expect(whatTheTodayDrawingAsksFor(drawing).length).toBeGreaterThan(1);
        expect(whatTheTodayScreenDoesNotAnswerFor(drawing)).toHaveLength(
          theDifferencesTheTodayStepKeeps[drawing] ?? 0,
        );
      });
    }

    it('is held to every part of every drawing, and the count is the check', () => {
      expect(theTodayDrawings).toHaveLength(6);
      expect(howManyPartsTheTodayScreensAreHeldTo()).toBeGreaterThan(50);
    });

    it('names the parts of the pushed header it passed over, and which feature owns them', () => {
      const header = thePushedHeaderOfDayOne();

      expect(header.map((part) => part.name)).toEqual(['Text', 'TextLink', 'TextLink']);
      expect(header.slice(1).every((part) => part.builtUnder.length === 0)).toBe(true);
      expect(thePushedHeaderBelongsToAnotherFeature).toBe(header.length);
    });

    it('names a part the screen does not draw, so a silent gap cannot hide in the count', async () => {
      jest.setSystemTime(whenSheOpens('todayEmpty'));
      await sheIsLookingAtTheTodayScreen('todayEmpty');

      const missing = whatTheTodayScreenDoesNotAnswerFor('todayNext').join(' ');

      expect(missing).toContain('CycleRing');
      expect(missing).toContain('PhaseLine');
      expect(missing).toContain('NextPeriod');
    });
  });

  describe('the ring and the line under it', () => {
    for (const drawing of theStatesWithARing) {
      it(`stands the ring over the line that names her phase on ${drawing}`, async () => {
        jest.setSystemTime(whenSheOpens(drawing));
        await sheIsLookingAtTheTodayScreen(drawing);

        expect(whereTheScreenDrew(cycleRingTestID)).toBeGreaterThan(-1);
        expect(whereTheScreenDrew(cycleRingTestID)).toBeLessThan(
          whereTheScreenDrew(phaseLineTestID),
        );
      });
    }
  });

  describe('the two round actions under that line', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheOpens('todayNext'));
      await sheIsLookingAtTheTodayScreen('todayNext');
    });

    it('stands them under the line and above the forecast, which is the order the drawing places', () => {
      expect(whereTheScreenDrew(phaseLineTestID)).toBeLessThan(
        whereTheScreenDrew(roundActionTestID('period')),
      );
      expect(whereTheScreenDrew(roundActionTestID('period'))).toBeLessThan(
        whereTheScreenDrew(roundActionTestID('symptoms')),
      );
    });

    it('fills the period disc with the accent and draws it in the ink measured on the accent', () => {
      expect(styleOf(roundActionDiscTestID('period')).backgroundColor).toBe(colour.accent);
      expect(drawingIn(roundActionDrawingTestID('period'))).toContain(colour.onAccent);
    });

    it('leaves the symptoms disc white and draws it in the ink measured on a card', () => {
      expect(styleOf(roundActionDiscTestID('symptoms')).backgroundColor).toBe(colour.card);
      expect(drawingIn(roundActionDrawingTestID('symptoms'))).toContain(colour.text);
    });

    it('draws both discs round, at one width, and wider than a thumb needs', () => {
      for (const action of roundActions) {
        const disc = styleOf(roundActionDiscTestID(action));

        expect({ action, width: disc.width, height: disc.height }).toEqual({
          action,
          width: theDiscIsThisWide,
          height: theDiscIsThisWide,
        });
        expect(Number(disc.borderRadius)).toBeGreaterThanOrEqual(theDiscIsThisWide / 2);
        expect(theDiscIsThisWide).toBeGreaterThan(MINIMUM_TAP_TARGET);
      }
    });
  });

  describe('the row that reads back what she logged today', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheOpens('todayLogged'));
      await sheIsLookingAtTheTodayScreen('todayLogged');
    });

    it('stands under the round actions, which is where the drawing of that state places it', () => {
      expect(whereTheScreenDrew(roundActionTestID('symptoms'))).toBeLessThan(
        whereTheScreenDrew(loggedTodayTestID),
      );
    });

    it('carries the mark that says the day is in her record, in a tile of its own', () => {
      const tile = styleOf(loggedTodayTileTestID);

      expect(tile.width).toBe(MINIMUM_TAP_TARGET);
      expect(tile.height).toBe(MINIMUM_TAP_TARGET);
      expect(tile.borderRadius).toBe(radius.md);
      expect(drawingIn(loggedTodayMarkTestID)).toContain(colour.ovulationInk);
    });

    it('is still one card with a corner the design system names', () => {
      expect(styleOf(loggedTodayTestID).backgroundColor).toBe(colour.card);
      expect(styleOf(loggedTodayTestID).borderRadius).toBe(radius.xl);
    });
  });

  describe('a section she has not earned yet', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheOpens('todayEmptyBody'));
      await sheIsLookingAtTheTodayScreen('todayEmptyBody');
    });

    for (const section of waitingSections) {
      it(`draws ${section} as one card with a tile, one sentence and the count Emi read`, () => {
        const tile = styleOf(sectionWaitingTileTestID(section));

        expect(styleOf(sectionWaitingTestID(section)).backgroundColor).toBeUndefined();
        expect(tile.borderRadius).toBe(radius.DEFAULT);
        expect(screen.getByTestId(sectionWaitingNeedsTestID(section))).toBeTruthy();
        expect(screen.getByTestId(sectionWaitingReadTestID(section))).toBeTruthy();
      });
    }

    it('draws no chart, no strip and no row in any of the three', () => {
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      expect(screen.queryByTestId(loggedTodayTestID)).toBeNull();
    });
  });

  describe('the lock she comes back through', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheOpens('lock'));
      await sheIsLookingAtTheTodayScreen('lock');
    });

    it('carries the wordmark, the disc under it, then the two lines', () => {
      const disc = styleOf(lockDiscTestID);

      expect(screen.getByTestId(lockWordmarkTestID)).toBeTruthy();
      expect(disc.backgroundColor).toBe(colour.card);
      expect(disc.width).toBe(disc.height);
      expect(Number(disc.borderRadius)).toBeGreaterThanOrEqual(Number(disc.width) / 2);
      expect(screen.getByTestId(lockTitleTestID)).toBeTruthy();
      expect(screen.getByTestId(lockLineTestID)).toBeTruthy();
    });

    it('asks again with one button, drawn as the capsule the prototype draws', () => {
      const action = styleOf(unlockTestID);

      expect(action.backgroundColor).toBe(colour.accent);
      expect(action.borderRadius).toBe(radius.full);
      expect(Number(action.minHeight)).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });
  });

  describe('the two drawings nothing on the glass answers', () => {
    it('keeps the second design of the same route in the stage and holds no screen to it', () => {
      const second = thePartsOfTheSecondDesign();

      expect(theSecondDesignOfTheRoute).toBe('today');
      expect(second.filter((name) => name === 'RoundAction')).toHaveLength(4);
      expect(second.indexOf('NextPeriod')).toBeLessThan(second.indexOf('RoundAction'));
      expect(theTodayDrawings).not.toContain(theSecondDesignOfTheRoute);
    });

    it('keeps the reminder in the stage and says nothing is built under its one part', () => {
      const reminder = thePartsOfTheReminderDrawing();

      expect(theDrawingNothingIsBuiltFor).toBe('notification');
      expect(reminder.map((part) => part.name)).toEqual(['ReminderNotification']);
      expect(reminder.every((part) => part.builtUnder.length === 0)).toBe(true);
    });
  });
});
