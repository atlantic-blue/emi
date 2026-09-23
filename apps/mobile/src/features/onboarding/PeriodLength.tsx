import type { ReactNode } from 'react';

import {
  Stepper,
  stepperDownTestID,
  stepperReadingTestID,
  stepperUpTestID,
} from '../../components/Stepper';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, periodLengthDaysLabel } from './copy';
import { maximumPeriodLengthDays, minimumPeriodLengthDays } from './firstRun';

export const periodLengthStepperTestID = 'period-length';
export const fewerDaysTestID = stepperDownTestID(periodLengthStepperTestID);
export const moreDaysTestID = stepperUpTestID(periodLengthStepperTestID);
export const periodLengthTestID = stepperReadingTestID(periodLengthStepperTestID);

interface Props {
  readonly days: number;
  readonly onChange: (days: number) => void;
  readonly onDone: () => void;
  readonly onBack: () => void;
  /** She says she is not sure, and the answer is left off her profile rather than guessed at. */
  readonly onNotSure: () => void;
}

/**
 * How long her period runs, which is what the period arc on the ring is drawn at until she has
 * logged a period end of her own.
 *
 * The way past this question says what happens if she takes it, because "I am not sure" is a real
 * answer here and not a question left behind: the ring counts the days she logs instead.
 */
export function PeriodLength({ days, onChange, onDone, onBack, onNotSure }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionLabel={firstRunCopy.periodLength.action}
      lines={firstRunCopy.periodLength.lines}
      onAction={onDone}
      onBack={onBack}
      onSkip={onNotSure}
      screen="periodLength"
      skipLabel={firstRunCopy.periodLength.skip}
      title={firstRunCopy.periodLength.title}
    >
      <Stepper
        canGoDown={days > minimumPeriodLengthDays}
        canGoUp={days < maximumPeriodLengthDays}
        downLabel={firstRunCopy.fewerDays}
        onDown={() => {
          onChange(days - 1);
        }}
        onUp={() => {
          onChange(days + 1);
        }}
        reading={periodLengthDaysLabel(days)}
        testID={periodLengthStepperTestID}
        upLabel={firstRunCopy.moreDays}
      />
    </OnboardingScreen>
  );
}
