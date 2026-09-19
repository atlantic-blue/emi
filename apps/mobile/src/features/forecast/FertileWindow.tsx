import type { Forecast } from '@emi/cycle';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fertileWindowSentence, forecastCopy, rangeSentence } from './copy';

/**
 * The fertile window, as the two ends of a range and the sentence that says what it is worth.
 *
 * The window runs from five days before the estimated ovulation day through one day after it, so it
 * is seven days wide whatever her cycles look like and it can never collapse into the single date
 * the forecast contract refuses. The ovulation day itself is never rendered: it is a median and a
 * fixed luteal length, and a woman given one day plans around a day the arithmetic cannot promise.
 */

export const fertileWindowTestID = 'fertile-window';
export const fertileWindowRangeTestID = 'fertile-window-range';
export const fertileWindowEstimateTestID = 'fertile-window-estimate';

interface Props {
  readonly forecast: Forecast;
}

export function FertileWindow({ forecast }: Props): ReactNode {
  return (
    <View accessible style={styles.block} testID={fertileWindowTestID}>
      <Text style={styles.label}>{forecastCopy.fertileWindow}</Text>
      <Text style={styles.range} testID={fertileWindowRangeTestID}>
        {rangeSentence(forecast.fertileWindow)}
      </Text>
      <Text style={styles.estimate} testID={fertileWindowEstimateTestID}>
        {fertileWindowSentence(forecast)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: space.base, paddingVertical: space.snug },
  estimate: {
    color: colour.muted,
    ...textStyle('body-sm'),
  },
  label: {
    color: colour.muted,
    ...textStyle('label-sm'),
    marginBottom: space.hair,
  },
  // The window is the quieter of the two blocks, so it takes the body size and the ring's own
  // ovulation ink rather than the heading size the next period carries.
  range: {
    color: colour.ovulationInk,
    ...textStyle('body-lg'),
    marginBottom: space.hair,
  },
});
