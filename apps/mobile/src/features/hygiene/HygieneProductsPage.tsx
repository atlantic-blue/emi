import { colour, space, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { WholeWordsText } from '../../components/WholeWordsText';
import { words } from '../../language';
import { HowToChoose } from './HowToChoose';
import { HygieneHeader } from './HygieneHeader';
import { ProductDrawing } from './ProductDrawing';
import { QuizCard } from './QuizCard';
import { type ProductSlug, productOf, productOrder } from './products';

/**
 * The Hygiene products page, from the hygieneProducts board (issue 304): the eight products in a
 * grid of four columns, a quarter of the width each, each one the way to its own page, and the
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

/**
 * A product name in Russian holds a word too wide for a quarter of the smallest iPhone even at
 * the smallest size a label takes. The grid then lays the products three to a row, so the word
 * stays whole.
 */
export const NARROW_COLUMNS = 3;

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
  const [columns, setColumns] = useState(BOARD_COLUMNS);

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
                style={[styles.cell, { width: `${100 / columns}%` }]}
                testID={productTileTestID(slug)}
              >
                <View style={styles.tile}>
                  <ProductDrawing colour={colour.ovulationInk} size={DRAWING} slug={slug} />
                </View>
                <WholeWordsText
                  label={name}
                  onWordCutAtTheFloor={() => setColumns(NARROW_COLUMNS)}
                  style={styles.label}
                  testID={productTileNameTestID(slug)}
                />
              </Pressable>
            );
          })}
        </View>

        <HowToChoose />

        <QuizCard onOpen={onQuiz} />
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
