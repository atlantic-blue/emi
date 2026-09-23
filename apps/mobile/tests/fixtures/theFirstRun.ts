import type { Regularity } from '@emi/crypto';
import { fireEvent, screen } from '@testing-library/react-native';

import { longerTestID } from '../../src/features/onboarding/CycleLength';
import { fewerDaysTestID, moreDaysTestID } from '../../src/features/onboarding/PeriodLength';
import { nameFieldTestID } from '../../src/features/onboarding/HerName';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { regularityTestID } from '../../src/features/onboarding/Regularity';
import { yearTestID } from '../../src/features/onboarding/YearOfBirth';
import {
  defaultCycleLengthDays,
  defaultPeriodLengthDays,
} from '../../src/features/onboarding/firstRun';

export interface HerAnswers {
  readonly periodStartedOn: string;
  /** Left out where she does not remember the period before, which is that question's Skip. */
  readonly periodBeforeStartedOn?: string;
  /** Left out where the walk does not care, and then the number the screen offers is kept. */
  readonly cycleLengthDays?: number;
  /** Left out where she answers that she is not sure, which is that question's way past it. */
  readonly periodLengthDays?: number;
  /** Left out where she skips the question, which leaves her profile carrying no answer for it. */
  readonly regularity?: Regularity;
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

  if (answers.periodBeforeStartedOn === undefined) {
    await fireEvent.press(screen.getByTestId(onboardingSkipTestID));
  } else {
    await fireEvent.press(screen.getByTestId(dayTestID(answers.periodBeforeStartedOn)));
    await fireEvent.press(screen.getByTestId(onboardingActionTestID));
  }

  const asked = answers.cycleLengthDays ?? defaultCycleLengthDays;
  for (let pressed = defaultCycleLengthDays; pressed < asked; pressed += 1) {
    await fireEvent.press(screen.getByTestId(longerTestID));
  }

  await fireEvent.press(screen.getByTestId(onboardingActionTestID));

  if (answers.periodLengthDays === undefined) {
    await fireEvent.press(screen.getByTestId(onboardingSkipTestID));
  } else {
    for (let pressed = defaultPeriodLengthDays; pressed < answers.periodLengthDays; pressed += 1) {
      await fireEvent.press(screen.getByTestId(moreDaysTestID));
    }
    for (let pressed = defaultPeriodLengthDays; pressed > answers.periodLengthDays; pressed -= 1) {
      await fireEvent.press(screen.getByTestId(fewerDaysTestID));
    }

    await fireEvent.press(screen.getByTestId(onboardingActionTestID));
  }

  if (answers.regularity === undefined) {
    await fireEvent.press(screen.getByTestId(onboardingSkipTestID));

    return;
  }

  await fireEvent.press(screen.getByTestId(regularityTestID(answers.regularity)));
  await fireEvent.press(screen.getByTestId(onboardingActionTestID));
}
