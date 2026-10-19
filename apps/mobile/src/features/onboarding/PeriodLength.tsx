import type { ReactNode } from 'react';

import { NumberWheel } from '../../components/NumberWheel';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, periodLengthFromHerDates, periodLengthDaysLabel } from './copy';
import { defaultPeriodLengthDays, periodLengthsOffered } from './firstRun';

export const periodLengthWheelTestID = 'period-length-wheel';
export const periodLengthPillTestID = 'period-length-pill';

/** The row for one length, named so a test presses the length rather than a place on the wheel. */
export function periodLengthDaysTestID(days: number): string {
  return `period-length-${days}`;
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
  /** She says she is not sure, and the answer is left off her profile rather than guessed at. */
  readonly onNotSure: () => void;
}

/**
 * How long her period runs, which is what the period arc on the ring is drawn at until she has
 * logged a period end of her own.
 *
 * The wheel opens on 5 days as a place to start. Done waits until she picks a length, and "I am not
 * sure" over it is the way past, which leaves the answer off her profile. Where her own dates give
 * a length, the wheel opens on it and Done keeps it.
 */
export function PeriodLength({
  chosen,
  fromHerDates,
  onChoose,
  onDone,
  onBack,
  onNotSure,
}: Props): ReactNode {
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
      actionLabel={firstRunCopy.periodLength.action}
      lines={firstRunCopy.periodLength.lines}
      linesAlign="center"
      onAction={done}
      onBack={onBack}
      onWayPast={onNotSure}
      question={fromHerDates === undefined ? undefined : periodLengthFromHerDates(fromHerDates)}
      screen="periodLength"
      title={firstRunCopy.periodLength.title}
      wayPastLabel={firstRunCopy.periodLength.skip}
    >
      <NumberWheel
        chosen={shown}
        labelOf={periodLengthDaysLabel}
        onChoose={onChoose}
        opensOn={defaultPeriodLengthDays}
        pillTestID={periodLengthPillTestID}
        testID={periodLengthWheelTestID}
        testIDOf={periodLengthDaysTestID}
        values={periodLengthsOffered}
      />
    </OnboardingScreen>
  );
}
