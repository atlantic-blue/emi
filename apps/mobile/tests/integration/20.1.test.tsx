import { fireEvent, render, screen, within } from '@testing-library/react-native';

import {
  onboardingActionTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { ThreePeriods } from '../../src/features/onboarding/ThreePeriods';
import { pastPeriodsListTestID } from '../../src/features/pastPeriods/PastPeriodsList';
import { pastPeriodsCopy } from '../../src/features/pastPeriods/copy';
import type { PastPeriod } from '../../src/features/pastPeriods/pastPeriods';
import { wordKeys } from '../../src/language';
import { type Control, controlsTooSmallToPress } from '../fixtures/tapTargets';
import { theIdentifiersDrawn } from '../fixtures/theMockupScreen';
import { OnAPhone } from '../fixtures/theSafeArea';

/** Well away from any summer time change, so the grid reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

let sheWasTakenOn = 0;

async function sheReadsTheQuestion(periods: readonly PastPeriod[] = []): Promise<void> {
  await render(
    <OnAPhone>
      <ThreePeriods
        now={whenSheOpensIt}
        onBack={() => undefined}
        onContinue={() => undefined}
        onGive={() => undefined}
        onRemove={() => undefined}
        onWayPast={() => {
          sheWasTakenOn += 1;
        }}
        periods={periods}
      />
    </OnAPhone>,
  );
}

function theWayPast(): Control {
  return screen.getByTestId(onboardingWayPastTestID) as unknown as Control;
}

describe('she says she remembers none of her last periods and the first run moves on', () => {
  beforeEach(() => {
    sheWasTakenOn = 0;
  });

  describe('the question she is left looking at', () => {
    beforeEach(async () => {
      await sheReadsTheQuestion();
    });

    it('offers the way past under the action, where the board draws it', () => {
      const drawn = theIdentifiersDrawn();

      expect(drawn.indexOf(onboardingWayPastTestID)).toBeGreaterThan(
        drawn.indexOf(pastPeriodsListTestID),
      );
      expect(drawn.indexOf(onboardingWayPastTestID)).toBeGreaterThan(
        drawn.indexOf(onboardingActionTestID),
      );
    });

    it('says the words the board writes', () => {
      expect(
        within(screen.getByTestId(onboardingWayPastTestID)).getByText(pastPeriodsCopy.wayPast),
      ).toBeTruthy();
      expect(pastPeriodsCopy.wayPast).toBe('Skip, I will log as I go');
    });

    it('offers a way past she can hit, at 44 points on both axes', () => {
      expect(controlsTooSmallToPress([theWayPast()])).toEqual([]);
    });

    it('takes her on when she presses it, without a period', async () => {
      await fireEvent.press(screen.getByTestId(onboardingWayPastTestID));

      expect(sheWasTakenOn).toBe(1);
    });

    it('still waits on the action while she has given no period', () => {
      expect(screen.getByTestId(onboardingActionTestID).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });
  });

  describe('a woman who gave one period', () => {
    it('can go on with the action, and the way past is still there', async () => {
      await sheReadsTheQuestion([{ startedOn: '2026-05-09', lengthDays: 5 }]);

      expect(screen.getByTestId(onboardingActionTestID).props.accessibilityState).toMatchObject({
        disabled: false,
      });
      expect(screen.getByTestId(onboardingWayPastTestID)).toBeTruthy();
    });
  });

  describe('the words of the way past', () => {
    it('are one sentence under one key, and the old "I do not remember" key is gone', () => {
      expect(wordKeys).toContain('pastPeriods.wayPast');
      expect(wordKeys).not.toContain('onboarding.periodBefore.skip');
      expect(wordKeys).not.toContain('onboarding.lastPeriod.wayPast');
    });
  });
});
