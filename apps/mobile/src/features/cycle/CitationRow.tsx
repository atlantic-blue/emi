import type { PublishedFigure, PublishedMeasurement } from '@emi/cycle';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '../../components/Screen';

/**
 * Where each published figure comes from, one row for each figure.
 *
 * A figure she cannot check is a figure she has to trust. Emi prints a published number beside her
 * own, so the paper that reports it, and the identifier of that paper, are one press away.
 *
 * Nothing here holds a number or a paper of its own. Every row is drawn from a figure the
 * arithmetic package hands it, so this page and the section on the screen she opens cannot
 * disagree about what a paper reports.
 */

export const figuresScreenTestID = 'figures-screen';
export const figuresHeaderTestID = 'figures-header';
export const figuresBackTestID = 'figures-back';
export const figuresTitleTestID = 'figures-title';
export const figuresLeaveTestID = 'figures-leave';
export const citationRowsTestID = 'figures-citations';
export const figuresQuotedTestID = 'figures-quoted';
export const figuresPrintedTestID = 'figures-printed';

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

export function CitationRow({ figure }: { readonly figure: PublishedFigure }): ReactNode {
  return <View testID={citationRowTestID(figure.measures)} />;
}

interface Props {
  /** The published figures, in the order the arithmetic package holds them. */
  readonly figures: readonly PublishedFigure[];
  readonly onBack: () => void;
}

export function FiguresScreen({ figures, onBack }: Props): ReactNode {
  return (
    <Screen testID={figuresScreenTestID}>
      <Pressable accessibilityRole="button" onPress={onBack} testID={figuresBackTestID} />
      <View testID={citationRowsTestID}>
        {figures.map((figure) => (
          <CitationRow figure={figure} key={figure.measures} />
        ))}
      </View>
    </Screen>
  );
}
