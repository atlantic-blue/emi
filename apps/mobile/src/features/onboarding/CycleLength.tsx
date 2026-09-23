import { type ReactNode, useState } from 'react';

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
 * Screen three of three. The last answer she gives, and the one the first forecast is made from.
 *
 * The number is the largest thing on the screen because it is the answer, and it is set in the
 * monospaced face so a digit does not shift sideways as she presses.
 *
 * Done is the one control of the first run that writes, so it takes one press. It goes out as
 * she presses it and stays out. The home screen takes a moment to arrive, and her thumb is
 * already on the glass.
 */
export function CycleLength({ days, onChange, onDone }: Props): ReactNode {
  const [pressed, setPressed] = useState(false);

  return (
    <OnboardingScreen
      actionIsReady={!pressed}
      actionLabel={firstRunCopy.cycleLength.action}
      lines={firstRunCopy.cycleLength.lines}
      onAction={() => {
        setPressed(true);
        onDone();
      }}
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
