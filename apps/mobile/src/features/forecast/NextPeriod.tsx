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

interface Props {
  readonly forecast: Forecast;
}

export function NextPeriod({ forecast }: Props): ReactNode {
  return (
    <View accessible style={styles.block} testID={nextPeriodTestID}>
      <Text style={styles.label}>{forecastCopy.nextPeriod}</Text>
      <Text style={styles.range} testID={nextPeriodRangeTestID}>
        {rangeSentence(forecast.start)}
      </Text>
      <Text style={styles.confidence} testID={nextPeriodConfidenceTestID}>
        {confidenceSentence(forecast)}
      </Text>
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
  range: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
    marginBottom: space.spaceXs,
  },
});
