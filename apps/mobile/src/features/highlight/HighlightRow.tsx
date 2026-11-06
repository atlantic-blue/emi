import { colour, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FluidGrid } from '../../components/FluidGrid';
import { type HighlightSlug, highlights } from './highlights';

/**
 * The row of round tiles at the top of a page, each one the way to a short page of its own. A
 * page names the highlights it carries, and the row draws them in that order. When a word of a
 * title does not fit its column, the row takes fewer columns and wraps onto more lines.
 */

export function highlightTestID(slug: HighlightSlug): string {
  return `highlight-${slug}`;
}

export function highlightTitleTestID(slug: HighlightSlug): string {
  return `highlight-title-${slug}`;
}

export function highlightGridTestID(testID: string | undefined): string {
  return `${testID ?? 'highlights'}-grid`;
}

/** Points, from the board: the tile, the ring around it, and the width of a tile with its words. */
const TILE = 68;
const RING_GAP = 2;
const RING = 2;
const COLUMN = 86;
const DRAWING = 28;
const ROW_GAP = 18;

const TILE_WITH_ITS_RING = TILE + 2 * (RING + RING_GAP);

interface Props {
  readonly slugs: readonly HighlightSlug[];
  readonly onOpen: (slug: HighlightSlug) => void;
  readonly testID?: string;
}

export function HighlightRow({ slugs, onOpen, testID }: Props): ReactNode {
  return (
    <View style={styles.row} testID={testID}>
      <View style={{ maxWidth: slugs.length * (COLUMN + ROW_GAP) }}>
        <FluidGrid
          cellAtLeast={TILE_WITH_ITS_RING}
          labelStyle={styles.label}
          labels={slugs.map((slug) => highlights[slug].title)}
          most={slugs.length}
          rowGap={ROW_GAP}
          testID={highlightGridTestID(testID)}
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
                <Text style={styles.label} testID={highlightTitleTestID(slug)}>
                  {highlight.title}
                </Text>
              </Pressable>
            );
          })}
        </FluidGrid>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: space.spaceSm },
  label: { color: colour.text, textAlign: 'center', ...textStyle('label-sm') },
  ring: {
    alignItems: 'center',
    borderRadius: TILE,
    borderWidth: RING,
    justifyContent: 'center',
    padding: RING_GAP,
  },
  row: { marginHorizontal: -ROW_GAP / 2 },
  tile: {
    alignItems: 'center',
    borderRadius: TILE / 2,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
});
