import type { Regularity } from '@emi/crypto';
import type { Forecast } from '@emi/cycle';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextLink } from '../../components/Button';
import { confidenceSentence, forecastCopy, lateSentence, rangeSentence } from './copy';

/**
 * The next period, as the two ends of a range and a word for how sure the arithmetic is. The
 * component takes a forecast and never a set of cycles, so the state before two cycles exist cannot
 * reach it: that state is a screen of its own, in step 3.5.
 */

export const nextPeriodTestID = 'next-period';
export const nextPeriodRangeTestID = 'next-period-range';
export const nextPeriodConfidenceTestID = 'next-period-confidence';
export const nextPeriodMovesTestID = 'next-period-moves';
export const nextPeriodLateTestID = 'next-period-late';
export const nextPeriodItStartedTestID = 'next-period-it-started';

interface Props {
  readonly forecast: Forecast;
  /**
   * How steady she said her cycle is, and nothing at all where she skipped the question. It is
   * read here and nowhere in the arithmetic above: the only thing it changes is the sentence at
   * the foot of this block.
   */
  readonly regularity?: Regularity;
  /**
   * How many days the period is late, from `daysLate`, and nothing inside the window. Where it is
   * given, the line says she is late in place of a range that has passed.
   */
  readonly daysLate?: number;
  /** The way to the period editor on today, which the link under the late line takes her by. */
  readonly onItStarted?: () => void;
}

export function NextPeriod({ forecast, regularity, daysLate, onItStarted }: Props): ReactNode {
  const offersTheLink = daysLate !== undefined && onItStarted !== undefined;

  return (
    // A block that holds a link cannot be one accessible element, because the link inside it would
    // not be reachable by itself.
    <View accessible={!offersTheLink} style={styles.block} testID={nextPeriodTestID}>
      <Text style={styles.label}>{forecastCopy.nextPeriod}</Text>
      {daysLate === undefined ? (
        <Text style={styles.range} testID={nextPeriodRangeTestID}>
          {rangeSentence(forecast.start)}
        </Text>
      ) : (
        <Text style={styles.range} testID={nextPeriodLateTestID}>
          {lateSentence(daysLate)}
        </Text>
      )}
      {offersTheLink ? (
        <View style={styles.itStarted}>
          <TextLink
            label={forecastCopy.itStarted}
            onPress={onItStarted}
            testID={nextPeriodItStartedTestID}
          />
        </View>
      ) : null}
      <Text style={styles.confidence} testID={nextPeriodConfidenceTestID}>
        {confidenceSentence(forecast)}
      </Text>
      {regularity === 'moves' ? (
        <Text style={styles.moves} testID={nextPeriodMovesTestID}>
          {forecastCopy.cycleMoves}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: space.spaceLg, paddingVertical: space.spaceMd },
  confidence: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  // The link lines up with the sentence above it. The link keeps its own padding so the tap target
  // stays full size, and the margin takes that padding back.
  itStarted: { alignSelf: 'flex-start', marginLeft: -space.spaceSm },
  label: {
    color: colour.secondaryText,
    ...textStyle('label-sm'),
    marginBottom: space.spaceXs,
  },
  // Under the confidence rather than beside the range, because it explains the width she is
  // reading and does not change it.
  moves: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
    marginTop: space.spaceXs,
  },
  range: {
    color: colour.text,
    ...textStyle('headline-md'),
    marginBottom: space.spaceXs,
  },
});
