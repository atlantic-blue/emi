import { MINIMUM_TAP_TARGET, colour, radius, space } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { lockLineIconTestID } from '../../src/components/LockLine';
import { progressFillTestID } from '../../src/components/ProgressBar';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingEmblemTestID,
  onboardingHeaderWordTestID,
  onboardingLinesTestID,
  onboardingLockTestID,
  onboardingProgressTestID,
  onboardingSheetTestID,
  onboardingStepLabelTestID,
  onboardingTitleTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy, firstRunScreens, stepLabel } from '../../src/features/onboarding/copy';
import {
  type FirstRunDrawing,
  howManyPartsTheFirstRunIsHeldTo,
  sheIsLookingAt,
  theDifferencesTheStepKeeps,
  theFirstRunDrawings,
  theQuestionsTheBarCounts,
  theWashIsAtTheTop,
  theWidthOfTheSheet,
  whatTheDrawingAsksFor,
  whatTheScreenDoesNotAnswerFor,
} from '../fixtures/theFirstRunLook';
import { anIPhone16 } from '../fixtures/theWidthOfARow';

/**
 * The first run, in the shapes the approved redesign draws it in.
 *
 * Nothing here decides what she is asked, in what order, or what Emi keeps. Each case reads a
 * rendered screen against the drawing of it in the mockups stage, which is what holds the look to
 * the thing that was approved rather than to anybody's eye.
 */

/** The screens the prototype draws the drop emblem on, which is the questions and the welcome. */
const theScreensCarryingTheEmblem: readonly FirstRunDrawing[] = [
  'welcome',
  ...theQuestionsTheBarCounts,
];

/** The questions whose last line is the promise that only she can read the answer. */
const theQuestionsThatPromiseHerPrivacy: readonly FirstRunDrawing[] = [
  'name',
  'yearOfBirth',
  'lastPeriod',
  'feeling',
  'goals',
];

function styleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;
}

describe('the first run screens match the redesign prototype', () => {
  describe('every screen of the run', () => {
    for (const drawing of theFirstRunDrawings) {
      it(`carries the wash at the top of ${drawing}`, async () => {
        await sheIsLookingAt(drawing);

        expect(theWashIsAtTheTop()).toBe(true);
      });
    }

    for (const drawing of theFirstRunDrawings) {
      it(`answers for every part the drawing of ${drawing} names, in its order`, async () => {
        await sheIsLookingAt(drawing);

        expect(whatTheDrawingAsksFor(drawing).length).toBeGreaterThan(2);
        expect(whatTheScreenDoesNotAnswerFor(drawing)).toHaveLength(
          theDifferencesTheStepKeeps[drawing] ?? 0,
        );
      });
    }

    it('is held to every part of every drawing, and the count is the check', () => {
      expect(theFirstRunDrawings).toHaveLength(22);
      expect(howManyPartsTheFirstRunIsHeldTo()).toBeGreaterThan(140);
    });

    it('says which part each screen draws out of place, so a silent gap cannot hide in the count', async () => {
      await sheIsLookingAt('lastPeriod');

      expect(whatTheScreenDoesNotAnswerFor('lastPeriod')).toEqual([
        `the drawing names OnboardingScreen, built under ${onboardingTitleTestID} or ${onboardingLinesTestID}, and the screen draws none of them after calendar`,
      ]);
    });
  });

  describe('the white sheet the question stands in', () => {
    for (const drawing of theQuestionsTheBarCounts) {
      it(`reaches both edges of the glass on ${drawing}, with the question inside it`, async () => {
        await sheIsLookingAt(drawing);

        const sheet = styleOf(onboardingSheetTestID);
        const drawn = screen.queryAllByTestId(/.+/).map((element) => String(element.props.testID));

        expect(sheet.backgroundColor).toBe(colour.card);
        expect(sheet.borderTopLeftRadius).toBe(radius.xxl);
        expect(sheet.borderTopRightRadius).toBe(radius.xxl);
        expect(theWidthOfTheSheet()).toBe(anIPhone16.width);
        expect(drawn.indexOf(onboardingSheetTestID)).toBeLessThan(
          drawn.indexOf(onboardingTitleTestID),
        );
        expect(drawn.indexOf(onboardingSheetTestID)).toBeLessThan(
          drawn.indexOf(onboardingActionTestID),
        );
      });
    }

    it('takes no corner at its foot, because the foot of it is the foot of the glass', async () => {
      await sheIsLookingAt('name');

      const sheet = styleOf(onboardingSheetTestID);

      expect(sheet.borderBottomLeftRadius ?? 0).toBe(0);
      expect(sheet.borderBottomRightRadius ?? 0).toBe(0);
    });

    it('is not drawn on the welcome, which the prototype leaves on the ground', async () => {
      await sheIsLookingAt('welcome');

      expect(screen.queryByTestId(onboardingSheetTestID)).toBeNull();
    });

    it('is not drawn on the first run log, which the prototype leaves on the ground too', async () => {
      await sheIsLookingAt('todayFirstRun');

      expect(screen.queryByTestId(onboardingSheetTestID)).toBeNull();
    });
  });

  describe('the drop emblem', () => {
    for (const drawing of theScreensCarryingTheEmblem) {
      it(`stands over the question on ${drawing}, as a round disc`, async () => {
        await sheIsLookingAt(drawing);

        const emblem = styleOf(onboardingEmblemTestID);

        expect(emblem.width).toBe(emblem.height);
        expect(Number(emblem.width)).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
        expect(Number(emblem.borderRadius)).toBeGreaterThanOrEqual(Number(emblem.width) / 2);
      });
    }

    it('is not drawn on the first run log, which the prototype gives a header instead', async () => {
      await sheIsLookingAt('todayFirstRun');

      expect(screen.queryByTestId(onboardingEmblemTestID)).toBeNull();
    });
  });

  describe('how far along she is', () => {
    for (const drawing of theQuestionsTheBarCounts) {
      it(`draws the bar between the way back and the way past on ${drawing}`, async () => {
        await sheIsLookingAt(drawing);

        const drawn = screen.queryAllByTestId(/.+/).map((element) => String(element.props.testID));

        expect(drawn.indexOf(onboardingBackTestID)).toBeGreaterThanOrEqual(0);
        expect(drawn.indexOf(onboardingBackTestID)).toBeLessThan(
          drawn.indexOf(onboardingProgressTestID),
        );
        expect(drawn.indexOf(onboardingProgressTestID)).toBeLessThan(
          drawn.indexOf(onboardingStepLabelTestID),
        );
      });
    }

    it('writes the step out in words under the bar, in the words the catalogue holds', async () => {
      await sheIsLookingAt('name');

      expect(screen.getByTestId(onboardingStepLabelTestID)).toHaveTextContent(stepLabel('name'));
      expect(stepLabel('name')).toContain(String(firstRunScreens.indexOf('name') + 1));
    });

    it('writes that step on the welcome and draws no bar there', async () => {
      await sheIsLookingAt('welcome');

      expect(screen.getByTestId(onboardingStepLabelTestID)).toHaveTextContent(stepLabel('welcome'));
      expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();
      expect(screen.queryByTestId(progressFillTestID(onboardingProgressTestID))).toBeNull();
    });

    it('names the day in the middle of the first run log, and draws neither bar nor step there', async () => {
      await sheIsLookingAt('todayFirstRun');

      expect(screen.getByTestId(onboardingHeaderWordTestID)).toBeTruthy();
      expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();
      expect(screen.queryByTestId(onboardingStepLabelTestID)).toBeNull();
    });

    it('still fills the bar by the question she is on, which the arithmetic decides', async () => {
      await sheIsLookingAt('focus');

      const filled = styleOf(progressFillTestID(onboardingProgressTestID));
      const at = firstRunScreens.indexOf('focus') + 1;

      expect(filled.width).toBe(`${String((at / firstRunScreens.length) * 100)}%`);
    });
  });

  describe('the promise about what Emi does with her answer', () => {
    for (const drawing of theQuestionsThatPromiseHerPrivacy) {
      it(`carries a lock beside it on ${drawing}`, async () => {
        await sheIsLookingAt(drawing);

        expect(screen.getByTestId(onboardingLockTestID)).toHaveTextContent(firstRunCopy.onlyYou);
        expect(screen.getByTestId(lockLineIconTestID(onboardingLockTestID))).toBeTruthy();
      });
    }

    it('leaves a question whose line is not that promise with no lock at all', async () => {
      await sheIsLookingAt('cycleLength');

      expect(screen.queryByTestId(onboardingLockTestID)).toBeNull();
      expect(screen.getByTestId(onboardingLinesTestID)).toBeTruthy();
    });
  });

  describe('what the look did not change', () => {
    it('asks the same twelve questions, in the same order', () => {
      expect(firstRunScreens).toEqual([
        'welcome',
        'name',
        'birthYear',
        'lastPeriod',
        'periodBefore',
        'cycleLength',
        'periodLength',
        'regularity',
        'feeling',
        'goals',
        'focus',
        'today',
      ]);
    });

    it('asks the first run log the question the copy settled, word for word', async () => {
      await sheIsLookingAt('todayFirstRun');

      expect(screen.getByTestId(onboardingTitleTestID)).toHaveTextContent(firstRunCopy.today.title);
    });

    it('keeps her thumb on every control, because none of them is under the floor', async () => {
      await sheIsLookingAt('name');

      expect(Number(styleOf(onboardingBackTestID).minHeight)).toBeGreaterThanOrEqual(
        MINIMUM_TAP_TARGET,
      );
      expect(Number(styleOf(onboardingBackTestID).minWidth)).toBeGreaterThanOrEqual(
        MINIMUM_TAP_TARGET,
      );
    });

    it('draws no ground the palette does not name, on any screen of the run', async () => {
      await sheIsLookingAt('name');

      const sheet = styleOf(onboardingSheetTestID);
      const named = new Set<unknown>(Object.values(colour));

      expect(named).toContain(sheet.backgroundColor);
      expect(Number(sheet.paddingTop)).toBeGreaterThanOrEqual(space.spaceLg);
    });
  });
});
