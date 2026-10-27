import { colour, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { type HighlightSlug, highlights } from './highlights';

/**
 * The row of round tiles at the top of a page, each one the way to a short page of its own. A
 * page names the highlights it carries, and the row draws them in that order. The row scrolls
 * sideways, so a page can carry more highlights than the width of the phone holds.
 */

export function highlightTestID(slug: HighlightSlug): string {
  return `highlight-${slug}`;
}

/** Points, from the board: the tile, the ring around it, and the width of a tile with its words. */
const TILE = 68;
const RING_GAP = 2;
const RING = 2;
const COLUMN = 86;
const DRAWING = 28;
const ROW_GAP = 18;

interface Props {
  readonly slugs: readonly HighlightSlug[];
  readonly onOpen: (slug: HighlightSlug) => void;
  readonly testID?: string;
}

export function HighlightRow({ slugs, onOpen, testID }: Props): ReactNode {
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
    >
      {slugs.map((slug) => {
        const highlight = highlights[slug];

        return (
          <Pressable
            accessibilityLabel={highlight.title}
            accessibilityRole="button"
            key={slug}
            onPress={() => onOpen(slug)}
            style={styles.column}
            testID={highlightTestID(slug)}
          >
            <View style={[styles.ring, { borderColor: colour[highlight.ink] }]}>
              <View style={[styles.tile, { backgroundColor: colour[highlight.tile] }]}>
                <Icon colour={colour[highlight.ink]} name={highlight.icon} size={DRAWING} />
              </View>
            </View>
            <Text style={styles.label}>{highlight.title}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: space.spaceSm, width: COLUMN },
  label: { color: colour.text, textAlign: 'center', ...textStyle('label-sm') },
  ring: {
    alignItems: 'center',
    borderRadius: TILE,
    borderWidth: RING,
    justifyContent: 'center',
    padding: RING_GAP,
  },
  row: { flexDirection: 'row', gap: ROW_GAP },
  tile: {
    alignItems: 'center',
    borderRadius: TILE / 2,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
});
