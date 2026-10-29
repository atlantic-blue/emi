import type { Regularity } from '@emi/crypto';
import type { ForecastResult, Learning as LearningState } from '@emi/cycle';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { TextLink } from '../../components/Button';
import { NextPeriod } from './NextPeriod';
import {
  cyclesWantedSentence,
  forecastCopy,
  lateSentence,
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
export const learningLateTestID = 'learning-late';
export const learningItStartedTestID = 'learning-it-started';
export const learningCyclesWantedTestID = 'learning-cycles-wanted';
export const learningStatedLengthTestID = 'learning-stated-length';

interface LearningProps {
  readonly learning: LearningState;
  /** The length she gave at the first run, read from the settings by whoever draws the screen. */
  readonly cycleLengthDays: number;
  /** How many days the period is late, from `daysLate`, and nothing inside the range. */
  readonly daysLate?: number;
  readonly onItStarted?: () => void;
}

export function Learning({
  learning,
  cycleLengthDays,
  daysLate,
  onItStarted,
}: LearningProps): ReactNode {
  const offersTheLink = daysLate !== undefined && onItStarted !== undefined;

  return (
    <View accessible={!offersTheLink} style={styles.block} testID={learningTestID}>
      {learning.start === undefined ? null : (
        <>
          <Text style={styles.label}>{forecastCopy.nextPeriod}</Text>
          {daysLate === undefined ? (
            <Text style={styles.range} testID={learningRangeTestID}>
              {rangeSentence(learning.start)}
            </Text>
          ) : (
            <Text style={styles.range} testID={learningLateTestID}>
              {lateSentence(daysLate)}
            </Text>
          )}
          {offersTheLink ? (
            <View style={styles.itStarted}>
              <TextLink
                label={forecastCopy.itStarted}
                onPress={onItStarted}
                testID={learningItStartedTestID}
              />
            </View>
          ) : null}
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
  /** How many days the period is late, counted from the range of either state. */
  readonly daysLate?: number;
  /** The way to the period editor on today, offered under the late line. */
  readonly onItStarted?: () => void;
}

/**
 * The one place the two states are chosen between, so a screen never decides for itself whether it
 * has enough cycles to draw a date. The arithmetic already answered that question in `kind`.
 */
export function NextPeriodOrLearning({
  result,
  cycleLengthDays,
  regularity,
  daysLate,
  onItStarted,
}: Props): ReactNode {
  if (result.kind === 'learning') {
    return (
      <Learning
        cycleLengthDays={cycleLengthDays}
        daysLate={daysLate}
        learning={result}
        onItStarted={onItStarted}
      />
    );
  }

  return (
    <NextPeriod
      daysLate={daysLate}
      forecast={result}
      onItStarted={onItStarted}
      regularity={regularity}
    />
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: space.spaceLg, paddingVertical: space.spaceMd },
  itStarted: { alignSelf: 'flex-start', marginLeft: -space.spaceSm },
  // The same size and colour the settled forecast draws its range at, because the two ends mean
  // the same thing on both screens and only the sentence under them changes.
  range: {
    color: colour.text,
    ...textStyle('headline-md'),
    marginBottom: space.spaceSm,
  },
  label: {
    color: colour.secondaryText,
    ...textStyle('label-sm'),
    marginBottom: space.spaceXs,
  },
  length: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  // The learning state is quieter than the forecast it will become: the sentence takes the body
  // size rather than the heading size the two days carry, because there is no date to lead with.
  wanted: {
    color: colour.text,
    ...textStyle('body-lg'),
    marginBottom: space.spaceXs,
  },
});
