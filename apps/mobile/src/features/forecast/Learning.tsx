import type { ForecastResult, Learning as LearningState } from '@emi/cycle';
import { colour, space, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NextPeriod } from './NextPeriod';
import { cyclesWantedSentence, learningCopy, statedLengthSentence } from './copy';

/**
 * What Emi says before two cycles are complete. On the first day it knows one thing, the length she
 * gave during the first run, and a range drawn from that would be a forecast of her answer rather
 * than of her body. So it says it is still learning, says how many more cycles it wants, and names
 * the length it counts by until then.
 *
 * Nothing here renders a confidence, which is the error contract CYCLE-3 states. A confidence is a
 * statement about the spread of her own cycle lengths, and fewer than two cycles have no spread.
 */

export const learningTestID = 'learning';
export const learningCyclesWantedTestID = 'learning-cycles-wanted';
export const learningStatedLengthTestID = 'learning-stated-length';

interface LearningProps {
  readonly learning: LearningState;
  /** The length she gave at the first run, read from the settings by whoever draws the screen. */
  readonly cycleLengthDays: number;
}

export function Learning({ learning, cycleLengthDays }: LearningProps): ReactNode {
  return (
    <View accessible style={styles.block} testID={learningTestID}>
      <Text style={styles.label}>{learningCopy.stillLearning}</Text>
      <Text style={styles.wanted} testID={learningCyclesWantedTestID}>
        {cyclesWantedSentence(learning)}
      </Text>
      <Text style={styles.length} testID={learningStatedLengthTestID}>
        {statedLengthSentence(cycleLengthDays)}
      </Text>
    </View>
  );
}

interface Props {
  readonly result: ForecastResult;
  readonly cycleLengthDays: number;
}

/**
 * The one place the two states are chosen between, so a screen never decides for itself whether it
 * has enough cycles to draw a date. The arithmetic already answered that question in `kind`.
 */
export function NextPeriodOrLearning({ result, cycleLengthDays }: Props): ReactNode {
  if (result.kind === 'learning') {
    return <Learning cycleLengthDays={cycleLengthDays} learning={result} />;
  }

  return <NextPeriod forecast={result} />;
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: space.base, paddingVertical: space.snug },
  label: {
    color: colour.muted,
    fontSize: typeScale.label.size,
    letterSpacing: typeScale.label.letterSpacing,
    lineHeight: typeScale.label.lineHeight,
    marginBottom: space.hair,
  },
  length: {
    color: colour.muted,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
  // The learning state is quieter than the forecast it will become: the sentence takes the body
  // size rather than the heading size the two days carry, because there is no date to lead with.
  wanted: {
    color: colour.ink,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
    marginBottom: space.hair,
  },
});
