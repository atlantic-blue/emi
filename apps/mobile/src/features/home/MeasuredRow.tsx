import type { PublishedMeasurement } from '@emi/cycle';
import { colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusPill, type PillTone } from '../../components/StatusPill';
import { type FigureStanding, type MeasuredNumber, howHerNumberSits } from './herNumbers';
import { herNumberReads, homeCopy, measurementName, publishedFigureReads } from './copy';

/**
 * One measurement of hers, with the figure a paper reports for the same measurement under it.
 *
 * Her own number and the published one sit on one row rather than in two columns, and the published
 * one carries its own label, because a number with no owner is a number she has to guess at.
 *
 * The pill says where her figure sits against the published one and nothing more. It never says
 * which of the two is right, and it never names her: a tracker that prints a verdict over a number
 * has turned arithmetic on her own days into a statement about her body.
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

/**
 * The tone each answer is painted in. Every pair here is one the contrast test measures, which is
 * why the answer that runs wide takes the accent pair rather than the prototype's own warm ink: no
 * palette entry carries that ink, and a pill may only draw a pair somebody measured.
 */
const theToneOf: Readonly<Record<FigureStanding, PillTone>> = {
  noFigure: 'quiet',
  within: 'apricot',
  wider: 'accent',
};

export function MeasuredRow({
  number,
  publishedLabel,
  separated = false,
}: {
  readonly number: MeasuredNumber;
  /** What the published figure is called, so the row names the owner of the second number. */
  readonly publishedLabel: string;
  /** A rule under the row, which every row but the last one carries. */
  readonly separated?: boolean;
}): ReactNode {
  const standing = howHerNumberSits(number.hers, number.published.value);

  return (
    <View
      style={separated ? [styles.row, styles.separated] : styles.row}
      testID={measuredRowTestID(number.measures)}
    >
      <View style={styles.what}>
        <Text style={styles.measurement}>{measurementName[number.measures]}</Text>
        <StatusPill
          label={homeCopy.numbers.standing[standing]}
          testID={measuredPillTestID(number.measures)}
          tone={theToneOf[standing]}
        />
      </View>

      <View style={styles.figures}>
        <Text style={styles.mine} testID={herNumberTestID(number.measures)}>
          {herNumberReads(number)}
        </Text>
        <View style={styles.published}>
          <Text style={styles.theirsLabel}>{publishedLabel}</Text>
          <Text style={styles.theirs} testID={publishedNumberTestID(number.measures)}>
            {publishedFigureReads(number.published)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Her numbers under one heading, in the order the one list of published figures holds them.
 *
 * Every word here is drawn at the small sizes of the scale. Contract SCREEN-2 holds the word period
 * on this screen to 14 points, and the row that carries it is one of these three, so her own figure
 * stays at the label size rather than taking the large one the prototype draws it at.
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
      <Text accessibilityRole="header" style={styles.heading} testID={homeNumbersHeadingTestID}>
        {headings.hers}
      </Text>

      {numbers.map((number, at) => (
        <MeasuredRow
          key={number.measures}
          number={number}
          publishedLabel={headings.published}
          separated={at < numbers.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Her own number takes the ink of the surface and the published one takes the quieter partner, so
  // the figure she came to read is the one that carries the weight.
  figures: {
    alignItems: 'baseline',
    columnGap: space.spaceSm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Contract SCREEN-2 holds every word of this section to 14 points, so the heading takes the
  // label size rather than the heading size the prototype draws it at: a stranger at arm's length
  // reads nothing on this screen, and a heading is the easiest thing on it to read from a distance.
  heading: {
    color: colour.text,
    ...textStyle('label-md'),
    marginBottom: space.spaceSm,
  },
  measurement: {
    color: colour.secondaryText,
    ...textStyle('label-md'),
  },
  mine: {
    color: colour.text,
    ...textStyle('label-md'),
  },
  numbers: {
    alignSelf: 'stretch',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    marginTop: space.spaceLg,
    padding: space.spaceLg,
  },
  row: {
    paddingVertical: space.spaceMd,
    rowGap: space.spaceXs,
  },
  // The rule divides one row from the next, so three rows read as three readings rather than as one
  // block of six numbers.
  separated: {
    borderBottomColor: colour.line,
    borderBottomWidth: stroke.hairline,
  },
  // The label and the figure are two runs rather than one sentence, so a reader of the figure
  // alone gets the figure the paper reports and nothing wrapped around it.
  published: {
    alignItems: 'baseline',
    columnGap: space.spaceXs,
    flexDirection: 'row',
    flexShrink: 1,
  },
  theirs: {
    color: colour.text,
    ...textStyle('body-sm'),
    flexShrink: 1,
    textAlign: 'right',
  },
  theirsLabel: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  // The measurement and the pill sit at either end of the row above her figures, which is where the
  // drawing of this section places them.
  what: {
    alignItems: 'center',
    columnGap: space.spaceSm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
