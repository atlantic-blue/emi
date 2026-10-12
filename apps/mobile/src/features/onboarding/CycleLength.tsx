import type { ReactNode } from 'react';

import { NumberWheel } from '../../components/NumberWheel';
import { OnboardingScreen } from './OnboardingScreen';
import { cycleLengthDaysLabel, firstRunCopy } from './copy';
import { cycleLengthsOffered, defaultCycleLengthDays } from './firstRun';

export const cycleLengthWheelTestID = 'cycle-length-wheel';
export const cycleLengthPillTestID = 'cycle-length-pill';

/** The row for one length, named so a test presses the length rather than a place on the wheel. */
export function cycleLengthDaysTestID(days: number): string {
  return `cycle-length-${days}`;
}

interface Props {
  /** Nothing at all until she turns the wheel or taps a length. */
  readonly chosen: number | undefined;
  readonly onChoose: (days: number) => void;
  readonly onDone: () => void;
  readonly onBack: () => void;
}

/**
 * How long her cycle runs, roughly, picked on a wheel that holds every length Emi accepts.
 *
 * The wheel opens on 28 days, but that is a place to start and not an answer: Done waits until she
 * turns the wheel or taps a length, so Emi never keeps a length she did not give.
 */
export function CycleLength({ chosen, onChoose, onDone, onBack }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.cycleLength.action}
      lines={firstRunCopy.cycleLength.lines}
      linesAlign="center"
      onAction={onDone}
      onBack={onBack}
      screen="cycleLength"
      title={firstRunCopy.cycleLength.title}
    >
      <NumberWheel
        chosen={chosen}
        labelOf={cycleLengthDaysLabel}
        onChoose={onChoose}
        opensOn={defaultCycleLengthDays}
        pillTestID={cycleLengthPillTestID}
        testID={cycleLengthWheelTestID}
        testIDOf={cycleLengthDaysTestID}
        values={cycleLengthsOffered}
      />
    </OnboardingScreen>
  );
}
