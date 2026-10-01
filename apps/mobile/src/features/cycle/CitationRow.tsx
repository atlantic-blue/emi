import type { PublishedFigure, PublishedMeasurement } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { publishedFigureReads } from '../home/copy';
import { figuresCopy, publishedMeasurementName } from './copy';

/**
 * Where each published figure comes from, one row for each figure.
 *
 * A figure she cannot check is a figure she has to trust. Emi prints a published number beside her
 * own, so the paper that reports it, and the identifier of that paper, are one press away.
 *
 * Nothing here holds a number or a paper of its own. Every row is drawn from a figure the
 * arithmetic package hands it, and the figure is worded by the same function the section on the
 * screen she opens uses, so the two places she meets a published number cannot disagree.
 *
 * The page carries nothing she wrote, which is why the address reaches it without asking whether
 * her first run is done. Three papers and three ranges are the whole of it.
 */

export const figuresScreenTestID = 'figures-screen';
export const figuresHeaderTestID = 'figures-header';
export const figuresBackTestID = 'figures-back';
export const figuresTitleTestID = 'figures-title';
export const figuresLeaveTestID = 'figures-leave';
export const citationRowsTestID = 'figures-citations';
export const figuresQuotedTestID = 'figures-quoted';
export const figuresPrintedTestID = 'figures-printed';

/** Points. The arrow is read at the size every other way back is read at. */
const BACK_MARK_SIZE = 22;

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

export function citationRowTestID(measures: PublishedMeasurement): string {
  return `figures-citation-${measures}`;
}

export function citationFigureTestID(measures: PublishedMeasurement): string {
  return `${citationRowTestID(measures)}-figure`;
}

export function citationPaperTestID(measures: PublishedMeasurement): string {
  return `${citationRowTestID(measures)}-paper`;
}

export function citationIdentifierTestID(measures: PublishedMeasurement): string {
  return `${citationRowTestID(measures)}-identifier`;
}

/**
 * One published figure: what it measures, what the paper says, the paper, and its identifier.
 *
 * The identifier sits on the row rather than in a list at the foot, because two of the three
 * figures come from one paper and a list of identifiers leaves her matching them up herself.
 */
export function CitationRow({
  figure,
  separated = false,
}: {
  readonly figure: PublishedFigure;
  /** A rule above the row, which every row but the first one carries. */
  readonly separated?: boolean;
}): ReactNode {
  return (
    <View
      style={separated ? [styles.row, styles.separated] : styles.row}
      testID={citationRowTestID(figure.measures)}
    >
      <View style={styles.lead}>
        <Text style={styles.what}>{publishedMeasurementName[figure.measures]}</Text>
        <Text style={styles.figure} testID={citationFigureTestID(figure.measures)}>
          {publishedFigureReads(figure)}
        </Text>
      </View>

      <Text style={styles.paper} testID={citationPaperTestID(figure.measures)}>
        {figure.citation.source}
      </Text>
      <Text style={styles.identifier} testID={citationIdentifierTestID(figure.measures)}>
        {figure.citation.doi}
      </Text>
    </View>
  );
}

interface Props {
  /** The published figures, in the order the arithmetic package holds them. */
  readonly figures: readonly PublishedFigure[];
  readonly onBack: () => void;
}

export function FiguresScreen({ figures, onBack }: Props): ReactNode {
  return (
    <Screen testID={figuresScreenTestID}>
      <View style={styles.header} testID={figuresHeaderTestID}>
        <Pressable
          accessibilityLabel={figuresCopy.back}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.back}
          testID={figuresBackTestID}
        >
          <View style={styles.backMark}>
            <Icon colour={colour.text} name="chevron" size={BACK_MARK_SIZE} />
          </View>
        </Pressable>

        <Text accessibilityRole="header" style={styles.title} testID={figuresTitleTestID}>
          {figuresCopy.title}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.leave}
          testID={figuresLeaveTestID}
        >
          <Text style={styles.leaveLabel}>{figuresCopy.back}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <View style={styles.rows} testID={citationRowsTestID}>
          {figures.map((figure, at) => (
            <CitationRow figure={figure} key={figure.measures} separated={at > 0} />
          ))}
        </View>

        <Text style={styles.quoted} testID={figuresQuotedTestID}>
          {figuresCopy.quoted}
        </Text>
        <Text style={styles.printed} testID={figuresPrintedTestID}>
          {figuresCopy.printed}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  backMark: { transform: TURNED_AROUND },
  body: {
    flexGrow: 1,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.margin,
    paddingTop: space.spaceMd,
  },
  // The figure the paper reports takes the ink of the surface, because it is the number she came
  // to check. Everything around it on the row is quieter than it.
  figure: {
    color: colour.text,
    ...textStyle('label-md'),
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceSm,
    paddingTop: space.spaceSm,
  },
  identifier: {
    color: colour.quietIcon,
    ...textStyle('label-sm'),
  },
  // The measurement and the figure sit on one line with room between them, so the column of
  // figures reads down the page and she can compare three papers without reading three sentences.
  lead: {
    alignItems: 'baseline',
    columnGap: space.spaceSm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leave: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceSm,
  },
  leaveLabel: {
    color: colour.accent,
    ...textStyle('label-md'),
  },
  // The paper is quoted at the small size, because SCREEN-2 holds the word bleeding to 14 points
  // and the title of the System 1 paper carries it twice.
  paper: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  printed: {
    color: colour.quietIcon,
    ...textStyle('label-sm'),
    marginTop: space.spaceSm,
  },
  quoted: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
    marginTop: space.spaceLg,
  },
  row: {
    paddingVertical: space.spaceMd,
    rowGap: space.spaceXs,
  },
  separated: {
    borderTopColor: colour.line,
    borderTopWidth: stroke.hairline,
  },
  rows: {
    backgroundColor: colour.card,
    borderRadius: radius.md,
    paddingHorizontal: space.spaceMd,
  },
  scroll: { flex: 1 },
  title: {
    color: colour.text,
    ...textStyle('label-md'),
  },
  what: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
});
