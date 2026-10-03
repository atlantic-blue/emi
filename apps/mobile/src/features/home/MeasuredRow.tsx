import type { PublishedMeasurement } from '@emi/cycle';
import { colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MeasuredNumber } from './herNumbers';
import { herNumberReads, measurementName, publishedFigureReads } from './copy';

/**
 * One measurement of hers, beside the figure a paper reports for the same measurement.
 *
 * Two columns and a heading over each of them, because a number with no owner is a number she has
 * to guess at. Nothing on the row says which of the two is right.
 */

export const homeNumbersTestID = 'home-numbers';

/** The heading over the three rows, which names whose numbers they are. */
export const homeNumbersHeadingTestID = 'home-numbers-heading';

export function measuredRowTestID(measures: PublishedMeasurement): string {
  return `home-measured-${measures}`;
}

/** The pill on one row, which says where her figure sits against the published one. */
export function measuredPillTestID(measures: PublishedMeasurement): string {
  return `${measuredRowTestID(measures)}-pill`;
}

export function herNumberTestID(measures: PublishedMeasurement): string {
  return `${measuredRowTestID(measures)}-hers`;
}

export function publishedNumberTestID(measures: PublishedMeasurement): string {
  return `${measuredRowTestID(measures)}-published`;
}

export function MeasuredRow({ number }: { readonly number: MeasuredNumber }): ReactNode {
  return (
    <View style={styles.row} testID={measuredRowTestID(number.measures)}>
      <Text style={styles.what}>{measurementName[number.measures]}</Text>
      <Text style={styles.mine} testID={herNumberTestID(number.measures)}>
        {herNumberReads(number)}
      </Text>
      <Text style={styles.theirs} testID={publishedNumberTestID(number.measures)}>
        {publishedFigureReads(number.published)}
      </Text>
    </View>
  );
}

/**
 * Her numbers under the two headings, in the order the one list of published figures holds them.
 *
 * Every word here is drawn at the small sizes of the scale. Contract SCREEN-2 holds the word
 * period on this screen to 14 points, and the row that carries it is one of these three.
 */
export function MeasuredRows({
  numbers,
  headings,
}: {
  readonly numbers: readonly MeasuredNumber[];
  readonly headings: { readonly hers: string; readonly published: string };
}): ReactNode {
  return (
    <View style={styles.numbers} testID={homeNumbersTestID}>
      <View style={styles.row}>
        <View style={styles.what} />
        <Text style={styles.head}>{headings.hers}</Text>
        <Text style={styles.head}>{headings.published}</Text>
      </View>

      {numbers.map((number) => (
        <MeasuredRow key={number.measures} number={number} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    color: colour.secondaryText,
    flex: 3,
    ...textStyle('label-sm'),
  },
  // Her own number takes the ink of the surface and the published one takes the quieter partner,
  // so the column she came to read is the one that carries the weight.
  mine: {
    color: colour.text,
    flex: 3,
    ...textStyle('label-md'),
  },
  numbers: {
    alignSelf: 'stretch',
    backgroundColor: colour.card,
    borderRadius: radius.md,
    marginTop: space.spaceLg,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
    rowGap: space.spaceXs,
  },
  row: {
    alignItems: 'center',
    columnGap: space.spaceSm,
    flexDirection: 'row',
  },
  theirs: {
    color: colour.secondaryText,
    flex: 4,
    ...textStyle('body-sm'),
  },
  what: {
    color: colour.secondaryText,
    flex: 4,
    ...textStyle('body-sm'),
  },
});
