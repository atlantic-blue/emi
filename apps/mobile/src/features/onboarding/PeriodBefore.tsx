import { addDays, daysBetween } from '@emi/cycle';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Calendar } from './Calendar';
import { OnboardingScreen } from './OnboardingScreen';
import { daysBetweenSentence, firstRunCopy } from './copy';
import { localDay } from './days';
import { defaultCycleLengthDays, maximumCycleLengthDays, periodBeforeIsInRange } from './firstRun';

export const periodBeforeGapTestID = 'period-before-gap';
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
 * The period before the one she just gave. Two starts are one cycle she lived, and a cycle she
 * lived is worth more to the first forecast than the length she estimates on the next screen.
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
      onAction={onAdd}
      onBack={onBack}
      onSkip={onSkip}
      screen="periodBefore"
      skipLabel={firstRunCopy.periodBefore.skip}
      title={firstRunCopy.periodBefore.title}
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

      {chosen !== undefined && isInRange ? (
        <Text style={styles.gap} testID={periodBeforeGapTestID}>
          {daysBetweenSentence(daysBetween(chosen, lastPeriodStartedOn))}
        </Text>
      ) : null}

      {chosen !== undefined && !isInRange ? (
        <Text style={styles.refused} testID={periodBeforeRefusedTestID}>
          {firstRunCopy.periodBefore.outOfRange}
        </Text>
      ) : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  // The cycle she lived, said back to her the moment she picks the day, because that number is
  // the whole reason the question is asked.
  gap: {
    color: colour.onSurface,
    marginTop: space.spaceMd,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  refused: {
    color: colour.error,
    marginTop: space.spaceMd,
    ...textStyle('body-sm'),
    textAlign: 'center',
  },
});
