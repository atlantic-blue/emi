import type { ReactNode } from 'react';

import {
  Stepper,
  stepperDownTestID,
  stepperReadingTestID,
  stepperUpTestID,
} from '../../components/Stepper';
import { OnboardingScreen } from './OnboardingScreen';
import { cycleLengthDaysLabel, firstRunCopy } from './copy';
import { maximumCycleLengthDays, minimumCycleLengthDays } from './firstRun';

export const cycleLengthStepperTestID = 'cycle-length';
export const shorterTestID = stepperDownTestID(cycleLengthStepperTestID);
export const longerTestID = stepperUpTestID(cycleLengthStepperTestID);
export const cycleLengthTestID = stepperReadingTestID(cycleLengthStepperTestID);

interface Props {
  readonly days: number;
  readonly onChange: (days: number) => void;
  readonly onDone: () => void;
}

/**
 * The last of the three questions, and the answer the first forecast is made from.
 *
 * The number is the largest thing on the screen because it is the answer, and it is set in the
 * monospaced face so a digit does not shift sideways as she presses.
 *
 * Done writes nothing. It carries her to the hold, which is the one moment the first run writes,
 * so Done stays available: she can come back to this question from the hold and go on again.
 */
export function CycleLength({ days, onChange, onDone }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionLabel={firstRunCopy.cycleLength.action}
      lines={firstRunCopy.cycleLength.lines}
      onAction={onDone}
      screen="cycleLength"
      title={firstRunCopy.cycleLength.title}
    >
      <Stepper
        canGoDown={days > minimumCycleLengthDays}
        canGoUp={days < maximumCycleLengthDays}
        downLabel={firstRunCopy.shorter}
        onDown={() => {
          onChange(days - 1);
        }}
        onUp={() => {
          onChange(days + 1);
        }}
        reading={cycleLengthDaysLabel(days)}
        testID={cycleLengthStepperTestID}
        upLabel={firstRunCopy.longer}
      />
    </OnboardingScreen>
  );
}
