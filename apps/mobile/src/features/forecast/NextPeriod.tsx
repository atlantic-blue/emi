import type { Regularity } from '@emi/crypto';
import type { Forecast } from '@emi/cycle';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { confidenceSentence, forecastCopy, rangeSentence } from './copy';

/**
 * The next period, as the two ends of a range and a word for how sure the arithmetic is. The
 * component takes a forecast and never a set of cycles, so the state before two cycles exist cannot
 * reach it: that state is a screen of its own, in step 3.5.
 */

export const nextPeriodTestID = 'next-period';
export const nextPeriodRangeTestID = 'next-period-range';
export const nextPeriodConfidenceTestID = 'next-period-confidence';
export const nextPeriodMovesTestID = 'next-period-moves';

interface Props {
  readonly forecast: Forecast;
  /**
   * How steady she said her cycle is, and nothing at all where she skipped the question. It is
   * read here and nowhere in the arithmetic above: the only thing it changes is the sentence at
   * the foot of this block.
   */
  readonly regularity?: Regularity;
}

export function NextPeriod({ forecast, regularity }: Props): ReactNode {
  return (
    <View accessible style={styles.block} testID={nextPeriodTestID}>
      <Text style={styles.label}>{forecastCopy.nextPeriod}</Text>
      <Text style={styles.range} testID={nextPeriodRangeTestID}>
        {rangeSentence(forecast.start)}
      </Text>
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
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  label: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
    marginBottom: space.spaceXs,
  },
  // Under the confidence rather than beside the range, because it explains the width she is
  // reading and does not change it.
  moves: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
    marginTop: space.spaceXs,
  },
  range: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
    marginBottom: space.spaceXs,
  },
});
