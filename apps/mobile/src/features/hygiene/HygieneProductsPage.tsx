import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { FluidGrid } from '../../components/FluidGrid';
import { Screen } from '../../components/Screen';
import { words } from '../../language';
import { HowToChoose } from './HowToChoose';
import { HygieneHeader } from './HygieneHeader';
import { ProductDrawing } from './ProductDrawing';
import { QuizCard } from './QuizCard';
import { type ProductSlug, productOf, productOrder } from './products';

/**
 * The Hygiene products page, from the hygieneProducts board (issue 304): the eight products in a
 * grid of up to four columns, each one the way to its own page, and the
 * board's "How to choose" card under the grid (issue 305), and the card that opens "Find a
 * product to try" under that (issue 306).
 */

export const hygienePageTestID = 'hygiene-page';
export const hygienePageBackTestID = 'hygiene-page-back';
export const hygienePageHeadingTestID = 'hygiene-page-heading';
export const hygienePageProductsTestID = 'hygiene-page-products';

export function productTileTestID(slug: ProductSlug): string {
  return `hygiene-product-${slug}`;
}

export function productTileNameTestID(slug: ProductSlug): string {
  return `hygiene-name-${slug}`;
}

/** The board lays the products four to a row. */
export const BOARD_COLUMNS = 4;

/** Points, from the board: the tile, its corner and the drawing inside it. */
const TILE = 68;
const TILE_CORNER = 20;
const DRAWING = 32;

interface Props {
  readonly onBack: () => void;
  readonly onOpen: (slug: ProductSlug) => void;
  readonly onQuiz: () => void;
}

export function HygieneProductsPage({ onBack, onOpen, onQuiz }: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={hygienePageTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <HygieneHeader backTestID={hygienePageBackTestID} onBack={onBack} />

        <Text style={styles.heading} testID={hygienePageHeadingTestID}>
          {words('hygiene.heading')}
        </Text>

        <FluidGrid
          cellAtLeast={TILE}
          labelStyle={styles.label}
          labels={productOrder.map((slug) => productOf(slug).name)}
          most={BOARD_COLUMNS}
          rowGap={space.spaceLg}
          testID={hygienePageProductsTestID}
        >
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
                <Text style={styles.label} testID={productTileNameTestID(slug)}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </FluidGrid>

        <HowToChoose />

        <QuizCard onOpen={onQuiz} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.spaceLg, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  cell: { alignItems: 'center', gap: space.spaceSm },
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
