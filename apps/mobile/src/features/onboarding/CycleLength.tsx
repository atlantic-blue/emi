import type { ReactNode } from 'react';

import { NumberWheel } from '../../components/NumberWheel';
import { OnboardingScreen } from './OnboardingScreen';
import { cycleLengthFromHerDates, cycleLengthDaysLabel, firstRunCopy } from './copy';
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
  /**
   * Her usual length worked out from the periods she gave, or nothing where she gave fewer than
   * two. The wheel opens on it and Done is ready, because the number comes from her own dates.
   */
  readonly fromHerDates: number | undefined;
  readonly onChoose: (days: number) => void;
  readonly onDone: () => void;
  readonly onBack: () => void;
}

/**
 * How long her cycle runs, roughly, picked on a wheel that holds every length Emi accepts.
 *
 * The wheel opens on 28 days, but that is a place to start and not an answer: Done waits until she
 * turns the wheel or taps a length, so Emi never keeps a length she did not give. Where her own
 * dates give a length, the wheel opens on it and Done keeps it.
 */
export function CycleLength({ chosen, fromHerDates, onChoose, onDone, onBack }: Props): ReactNode {
  const shown = chosen ?? fromHerDates;
  const done = (): void => {
    if (chosen === undefined && fromHerDates !== undefined) {
      onChoose(fromHerDates);
    }
    onDone();
  };

  return (
    <OnboardingScreen
      actionIsReady={shown !== undefined}
      actionLabel={firstRunCopy.cycleLength.action}
      lines={firstRunCopy.cycleLength.lines}
      linesAlign="center"
      onAction={done}
      onBack={onBack}
      question={fromHerDates === undefined ? undefined : cycleLengthFromHerDates(fromHerDates)}
      screen="cycleLength"
      title={firstRunCopy.cycleLength.title}
    >
      <NumberWheel
        chosen={shown}
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
