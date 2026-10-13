import { fireEvent, screen } from '@testing-library/react-native';

import { cycleLengthDaysTestID } from '../../../src/features/onboarding/CycleLength';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../../src/features/onboarding/OnboardingScreen';

import { sheGivesAPeriod } from '../../fixtures/thePastPeriods';

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/**
 * The welcome, the day her last period started, a cycle of 28 days, every other question passed
 * by, and the first day she logs passed by too. It leaves her looking at the reminder.
 */
export async function sheReachesTheReminder(periodStartedOn: string): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await sheGivesAPeriod(0, periodStartedOn);
  await shePresses(onboardingActionTestID);
  await shePresses(cycleLengthDaysTestID(28));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingWayPastTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}
