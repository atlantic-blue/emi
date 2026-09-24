import type { Regularity } from '@emi/crypto';
import type { ForecastResult, Learning as LearningState } from '@emi/cycle';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NextPeriod } from './NextPeriod';
import {
  cyclesWantedSentence,
  forecastCopy,
  learningCopy,
  rangeSentence,
  statedLengthSentence,
} from './copy';

/**
 * What Emi says before two cycles are complete. It knows one thing about her rhythm, the length she
 * gave during the first run, so it counts the next period from that, says it is still learning, and
 * names how many more cycles it wants.
 *
 * The two days are named rather than withheld, because a woman who said when her last period
 * started has been told nothing by a screen that will not say when the next one is due. They are a
 * range and never a date, and the sentence under them says the length they were counted from.
 *
 * Nothing here renders a confidence, which is the error contract CYCLE-3 states. A confidence is a
 * statement about the spread of her own cycle lengths, and fewer than two cycles have no spread.
 */

export const learningTestID = 'learning';
export const learningRangeTestID = 'learning-range';
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
      {learning.start === undefined ? null : (
        <>
          <Text style={styles.label}>{forecastCopy.nextPeriod}</Text>
          <Text style={styles.range} testID={learningRangeTestID}>
            {rangeSentence(learning.start)}
          </Text>
        </>
      )}
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
  /**
   * How steady she said her cycle is, which the forecast reads and the learning state does not.
   * There is no range to explain the width of before two cycles are complete.
   */
  readonly regularity?: Regularity;
}

/**
 * The one place the two states are chosen between, so a screen never decides for itself whether it
 * has enough cycles to draw a date. The arithmetic already answered that question in `kind`.
 */
export function NextPeriodOrLearning({ result, cycleLengthDays, regularity }: Props): ReactNode {
  if (result.kind === 'learning') {
    return <Learning cycleLengthDays={cycleLengthDays} learning={result} />;
  }

  return <NextPeriod forecast={result} regularity={regularity} />;
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: space.spaceLg, paddingVertical: space.spaceMd },
  // The same size and colour the settled forecast draws its range at, because the two ends mean
  // the same thing on both screens and only the sentence under them changes.
  range: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
    marginBottom: space.spaceSm,
  },
  label: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
    marginBottom: space.spaceXs,
  },
  length: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  // The learning state is quieter than the forecast it will become: the sentence takes the body
  // size rather than the heading size the two days carry, because there is no date to lead with.
  wanted: {
    color: colour.onSurface,
    ...textStyle('body-lg'),
    marginBottom: space.spaceXs,
  },
});
