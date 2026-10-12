import { addDays } from '@emi/cycle';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Calendar } from './Calendar';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy } from './copy';
import { localDay } from './days';
import { defaultCycleLengthDays, maximumCycleLengthDays, periodBeforeIsInRange } from './firstRun';

export const periodBeforeRefusedTestID = 'period-before-refused';

interface Props {
  readonly now: Date;
  /** The day she gave on the question before this one, which every day here is measured from. */
  readonly lastPeriodStartedOn: string;
  readonly chosen: string | undefined;
  readonly onChoose: (day: string) => void;
  readonly onAdd: () => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
}

/**
 * The period before the one she just gave. Two starts are one complete cycle she lived, so a
 * forecast from her own cycles comes one cycle sooner. The first forecast itself is still counted
 * from her last start and the length she states on the next screen.
 *
 * Every square of the month takes a press, including the ones the answer cannot be, because a day
 * that does nothing when she presses it tells her nothing about why. She presses it and the screen
 * says what a cycle runs between.
 */
export function PeriodBefore({
  now,
  lastPeriodStartedOn,
  chosen,
  onChoose,
  onAdd,
  onBack,
  onSkip,
}: Props): ReactNode {
  const isInRange = chosen !== undefined && periodBeforeIsInRange(chosen, lastPeriodStartedOn);

  return (
    <OnboardingScreen
      actionIsReady={isInRange}
      actionLabel={firstRunCopy.periodBefore.action}
      lines={firstRunCopy.periodBefore.lines}
      linesAlign="center"
      onAction={onAdd}
      onBack={onBack}
      onWayPast={onSkip}
      question={firstRunCopy.periodBefore.question}
      screen="periodBefore"
      title={firstRunCopy.periodBefore.title}
      wayPastLabel={firstRunCopy.periodBefore.skip}
    >
      <Calendar
        canChoose={() => true}
        chosen={chosen}
        earliest={addDays(lastPeriodStartedOn, -maximumCycleLengthDays)}
        latest={lastPeriodStartedOn}
        onChoose={onChoose}
        opensOn={addDays(lastPeriodStartedOn, -defaultCycleLengthDays)}
        today={localDay(now)}
      />

      {chosen !== undefined && !isInRange ? (
        <Text style={styles.refused} testID={periodBeforeRefusedTestID}>
          {firstRunCopy.periodBefore.outOfRange}
        </Text>
      ) : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  refused: {
    color: colour.accent,
    marginTop: space.spaceMd,
    ...textStyle('body-sm'),
    textAlign: 'center',
  },
});
