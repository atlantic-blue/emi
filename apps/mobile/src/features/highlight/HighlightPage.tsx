import { MINIMUM_TAP_TARGET, colour, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
import { words } from '../../language';
import type { Reading } from './highlights';

/**
 * The page a highlight opens: its drawing, its title and a few short paragraphs. One component
 * draws every highlight, so a new one is a new entry in the list and never a new screen.
 */

export const highlightPageTestID = 'highlight-page';
export const highlightPageBackTestID = 'highlight-page-back';
export const highlightPageTitleTestID = 'highlight-page-title';

export function highlightParagraphTestID(index: number): string {
  return `highlight-page-paragraph-${index}`;
}

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/** Points. The drawing beside the title. */
const DRAWING = 28;
const TILE = 56;

interface Props {
  readonly highlight: Reading;
  readonly onBack: () => void;
}

export function HighlightPage({ highlight, onBack }: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={highlightPageTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={styles.backMark}>
            <RoundIconButton
              accessibilityLabel={words('highlight.back')}
              icon="chevron"
              onPress={onBack}
              testID={highlightPageBackTestID}
            />
          </View>
          <View style={styles.evenUp} />
        </View>

        <View style={[styles.tile, { backgroundColor: colour[highlight.tile] }]}>
          <Icon colour={colour[highlight.ink]} name={highlight.icon} size={DRAWING} />
        </View>

        <Text accessibilityRole="header" style={styles.title} testID={highlightPageTitleTestID}>
          {highlight.title}
        </Text>

        {highlight.paragraphs.map((paragraph, index) => (
          <Text key={paragraph} style={styles.paragraph} testID={highlightParagraphTestID(index)}>
            {paragraph}
          </Text>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backMark: { transform: TURNED_AROUND },
  body: { gap: space.spaceLg, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  evenUp: { width: MINIMUM_TAP_TARGET },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  paragraph: { color: colour.text, ...textStyle('body-lg') },
  tile: {
    alignItems: 'center',
    borderRadius: TILE / 2,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
  title: { color: colour.text, ...textStyle('headline-lg') },
});
