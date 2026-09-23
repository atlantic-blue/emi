import { fireEvent, screen } from '@testing-library/react-native';

import { longerTestID } from '../../src/features/onboarding/CycleLength';
import { nameFieldTestID } from '../../src/features/onboarding/HerName';
import { dayTestID } from '../../src/features/onboarding/LastPeriod';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { yearTestID } from '../../src/features/onboarding/YearOfBirth';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';

export interface HerAnswers {
  readonly periodStartedOn: string;
  /** Left out where the walk does not care, and then the number the screen offers is kept. */
  readonly cycleLengthDays?: number;
  /** Left out where she skips the question, which is what a walk that is about something else does. */
  readonly name?: string;
  readonly birthYear?: number;
}

/**
 * Every question of the first run, answered, which leaves her looking at the hold.
 *
 * The first run grows a screen at a time through feature 11, so the walk lives here rather than in
 * each test that has to get past it. A test about the questions themselves drives them itself.
 *
 * A question she is not given an answer for is skipped, because only the last period is required
 * and a walk that presses on without answering would be left standing on the screen.
 */
export async function sheAnswersEveryQuestion(answers: HerAnswers): Promise<void> {
  await fireEvent.press(screen.getByTestId(onboardingActionTestID));

  if (answers.name === undefined) {
    await fireEvent.press(screen.getByTestId(onboardingSkipTestID));
  } else {
    await fireEvent.changeText(screen.getByTestId(nameFieldTestID), answers.name);
    await fireEvent.press(screen.getByTestId(onboardingActionTestID));
  }

  if (answers.birthYear === undefined) {
    await fireEvent.press(screen.getByTestId(onboardingSkipTestID));
  } else {
    await fireEvent.press(screen.getByTestId(yearTestID(answers.birthYear)));
    await fireEvent.press(screen.getByTestId(onboardingActionTestID));
  }

  await fireEvent.press(screen.getByTestId(dayTestID(answers.periodStartedOn)));
  await fireEvent.press(screen.getByTestId(onboardingActionTestID));

  const asked = answers.cycleLengthDays ?? defaultCycleLengthDays;
  for (let pressed = defaultCycleLengthDays; pressed < asked; pressed += 1) {
    await fireEvent.press(screen.getByTestId(longerTestID));
  }

  await fireEvent.press(screen.getByTestId(onboardingActionTestID));
}
