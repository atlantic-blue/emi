import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { words } from '../../language';
import { HygieneHeader } from './HygieneHeader';
import { ProductDrawing } from './ProductDrawing';
import { type ProductSlug, productOf, productOrder } from './products';

/**
 * The Hygiene products page, from the hygieneProducts board (issue 304): the eight products in a
 * grid of four columns, a quarter of the width each, each one the way to its own page. The board's "How to choose" section goes
 * under the grid, and it belongs to issue 305.
 */

export const hygienePageTestID = 'hygiene-page';
export const hygienePageBackTestID = 'hygiene-page-back';
export const hygienePageHeadingTestID = 'hygiene-page-heading';
export const hygienePageProductsTestID = 'hygiene-page-products';

export function productTileTestID(slug: ProductSlug): string {
  return `hygiene-product-${slug}`;
}

/** Points, from the board: the tile, its corner and the drawing inside it. */
const TILE = 68;
const TILE_CORNER = 20;
const DRAWING = 32;

interface Props {
  readonly onBack: () => void;
  readonly onOpen: (slug: ProductSlug) => void;
}

export function HygieneProductsPage({ onBack, onOpen }: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={hygienePageTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <HygieneHeader backTestID={hygienePageBackTestID} onBack={onBack} />

        <Text style={styles.heading} testID={hygienePageHeadingTestID}>
          {words('hygiene.heading')}
        </Text>

        <View style={styles.grid} testID={hygienePageProductsTestID}>
          {productOrder.map((slug) => {
            const name = productOf(slug).name;

            return (
              <Pressable
                accessibilityLabel={name}
                accessibilityRole="button"
                key={slug}
                onPress={() => onOpen(slug)}
                style={styles.cell}
                testID={productTileTestID(slug)}
              >
                <View style={styles.tile}>
                  <ProductDrawing colour={colour.ovulationInk} size={DRAWING} slug={slug} />
                </View>
                <Text style={styles.label}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.spaceLg, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  cell: {
    alignItems: 'center',
    gap: space.spaceSm,
    paddingHorizontal: space.spaceXs,
    width: '25%',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.spaceLg },
  heading: { color: colour.text, ...textStyle('headline-md') },
  label: { color: colour.text, textAlign: 'center', ...textStyle('label-md') },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: TILE_CORNER,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
});
