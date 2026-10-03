import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { calendarTestID, dayTestID } from '../../src/features/onboarding/Calendar';
import { LastPeriod } from '../../src/features/onboarding/LastPeriod';
import {
  onboardingActionTestID,
  onboardingLinesTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy } from '../../src/features/onboarding/copy';
import { wordKeys } from '../../src/language';
import { type Control, controlsTooSmallToPress } from '../fixtures/tapTargets';
import { partsMissing, theIdentifiersDrawn } from '../fixtures/theMockupScreen';
import { OnAPhone } from '../fixtures/theSafeArea';
import {
  theIdentifiersOfTheLastPeriodScreen,
  thePartsOfTheWayPastDrawing,
  thePartsTheScreenKeepsInOrder,
} from '../fixtures/theWayPastTheFirstDate';

/** Well away from any summer time change, so the grid reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const aDaySheCouldHaveNamed = '2026-05-09';

/**
 * The drawing places six parts. The count is written out so that a comparison which read nothing
 * cannot pass as a comparison every part answered.
 */
const theDrawingHasParts = 10;

let sheWasTakenOn = 0;

async function sheReadsTheQuestion(): Promise<void> {
  await render(
    <OnAPhone>
      <LastPeriod
        chosen={undefined}
        now={whenSheOpensIt}
        onBack={() => undefined}
        onChoose={() => undefined}
        onContinue={() => undefined}
        onWayPast={() => {
          sheWasTakenOn += 1;
        }}
      />
    </OnAPhone>,
  );
}

function theWayPast(): Control {
  return screen.getByTestId(onboardingWayPastTestID) as unknown as Control;
}

describe('she says she does not remember when her last period started and the first run moves on', () => {
  beforeEach(() => {
    sheWasTakenOn = 0;
  });

  describe('the drawing the comparison reads', () => {
    it('places a way past between the lines she reads and the action', () => {
      expect(thePartsOfTheWayPastDrawing().map((part) => part.name)).toEqual([
        'TextLink',
        'ProgressBar',
        'StepLabel',
        'DropEmblem',
        'QuestionSheet',
        'OnboardingScreen',
        'Calendar',
        'OnboardingScreen',
        'TextLink',
        'PrimaryButton',
      ]);
    });

    it('says what each of those parts is built under', () => {
      expect(thePartsOfTheWayPastDrawing().filter((part) => part.builtUnder.length === 0)).toEqual(
        [],
      );
    });

    it('is read whole, so the parts held in order are the drawing less its lines', () => {
      expect(thePartsOfTheWayPastDrawing()).toHaveLength(theDrawingHasParts);
      expect(thePartsTheScreenKeepsInOrder()).toHaveLength(theDrawingHasParts - 1);
    });
  });

  describe('the question she is left looking at', () => {
    beforeEach(async () => {
      await sheReadsTheQuestion();
    });

    it('draws the days, the way past and the action in the order the drawing places them', () => {
      expect(partsMissing(thePartsTheScreenKeepsInOrder(), theIdentifiersDrawn())).toEqual([]);
    });

    it('draws the lines above the days, which is the one place it differs from the drawing', () => {
      expect(partsMissing(thePartsOfTheWayPastDrawing(), theIdentifiersDrawn())).toEqual([
        `the drawing names OnboardingScreen, built under onboarding-title or ${onboardingLinesTestID}, and the screen draws none of them after ${calendarTestID}`,
      ]);
    });

    it('offers the way past under the days and above the action', () => {
      const drawn = theIdentifiersDrawn();

      expect(drawn.indexOf(onboardingWayPastTestID)).toBeGreaterThan(drawn.indexOf(calendarTestID));
      expect(drawn.indexOf(onboardingWayPastTestID)).toBeLessThan(
        drawn.indexOf(onboardingActionTestID),
      );
    });

    it('says the sentence the question about the period before already says', () => {
      expect(
        within(screen.getByTestId(onboardingWayPastTestID)).getByText(
          firstRunCopy.periodBefore.skip,
        ),
      ).toBeTruthy();
    });

    it('offers a way past she can hit, at 44 points on both axes', () => {
      expect(controlsTooSmallToPress([theWayPast()])).toEqual([]);
    });

    it('takes her on when she presses it, without a day', async () => {
      await fireEvent.press(screen.getByTestId(onboardingWayPastTestID));

      expect(sheWasTakenOn).toBe(1);
    });

    it('still waits on the action while she has neither picked a day nor pressed it', async () => {
      expect(screen.getByTestId(onboardingActionTestID).props.accessibilityState).toMatchObject({
        disabled: true,
      });

      await fireEvent.press(screen.getByTestId(onboardingWayPastTestID));

      expect(screen.getByTestId(onboardingActionTestID).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('is not pressed for her when she picks a day instead', async () => {
      await fireEvent.press(screen.getByTestId(dayTestID(aDaySheCouldHaveNamed)));

      expect(sheWasTakenOn).toBe(0);
    });
  });

  describe('a way past the screen does not draw', () => {
    beforeEach(async () => {
      await sheReadsTheQuestion();
    });

    it('is named, with what it is built under and where the comparison had reached', () => {
      const nowhere = {
        ...theIdentifiersOfTheLastPeriodScreen(),
        TextLink: ['a-link-nobody-drew'],
      };

      // The drawing places two links, the way back and the way past, so a record naming neither
      // of them is refused twice, and each refusal says where the walk had reached.
      expect(partsMissing(thePartsTheScreenKeepsInOrder(nowhere), theIdentifiersDrawn())).toEqual([
        'the drawing names TextLink, built under a-link-nobody-drew, and the screen draws none of them anywhere on the screen',
        `the drawing names TextLink, built under a-link-nobody-drew, and the screen draws none of them after ${calendarTestID}`,
      ]);
    });
  });

  describe('the words of the way past', () => {
    it('are one sentence under one key, so the two questions cannot drift apart', () => {
      expect(firstRunCopy.lastPeriod.wayPast).toBe(firstRunCopy.periodBefore.skip);
      expect(wordKeys).not.toContain('onboarding.lastPeriod.wayPast');
    });
  });
});
