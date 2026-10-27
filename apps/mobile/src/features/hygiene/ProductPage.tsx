import { colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';
import Svg, { Path } from 'react-native-svg';

import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { words } from '../../language';
import { HygieneHeader } from './HygieneHeader';
import { ProductDrawing } from './ProductDrawing';
import type { Product } from './products';

/**
 * The page of one product, from the hygieneCup board (issue 304): its drawing, its name and one
 * line about it, then who it suits, its advantages, its disadvantages, and how to use it as short
 * written steps. One component draws all eight products.
 */

export const productPageTestID = 'product-page';
export const productPageBackTestID = 'product-page-back';
export const productPageNameTestID = 'product-page-name';
export const productPageSummaryTestID = 'product-page-summary';
export const productPageNoteTestID = 'product-page-note';

export type ProductSection = 'suits' | 'advantages' | 'disadvantages' | 'steps';

export function productSectionTestID(section: ProductSection): string {
  return `product-page-${section}`;
}

export function productLineTestID(section: ProductSection, index: number): string {
  return `product-page-${section}-${String(index)}`;
}

/** Points, from the board. */
const TILE = 76;
const TILE_CORNER = 22;
const DRAWING = 38;
const DOT = 6;
const MARK = 18;
const MARK_STROKE = 2.2;
const STEP_BADGE = 26;

type Marker = 'dot' | 'tick' | 'dash';

function MarkerOf({ marker }: { readonly marker: Marker }): ReactNode {
  if (marker === 'dot') {
    return <View style={styles.dot} />;
  }

  return (
    <Svg
      fill="none"
      height={MARK}
      stroke={marker === 'tick' ? colour.ovulationInk : colour.accent}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={MARK_STROKE}
      style={styles.mark}
      viewBox="0 0 24 24"
      width={MARK}
    >
      <Path d={marker === 'tick' ? 'M5 12.5l4.5 4.5L19 7.5' : 'M6 12h12'} />
    </Svg>
  );
}

interface ListProps {
  readonly section: Exclude<ProductSection, 'steps'>;
  readonly title: string;
  readonly lines: readonly string[];
  readonly marker: Marker;
}

function ListCard({ section, title, lines, marker }: ListProps): ReactNode {
  return (
    <Card testID={productSectionTestID(section)}>
      <View style={styles.list}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {lines.map((line, index) => (
          <View key={line} style={styles.line}>
            <MarkerOf marker={marker} />
            <Text style={styles.lineText} testID={productLineTestID(section, index)}>
              {line}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

interface Props {
  readonly product: Product;
  readonly onBack: () => void;
}

export function ProductPage({ product, onBack }: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={productPageTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <HygieneHeader backTestID={productPageBackTestID} onBack={onBack} />

        <View style={styles.intro}>
          <View style={styles.tile}>
            <ProductDrawing colour={colour.ovulationInk} size={DRAWING} slug={product.slug} />
          </View>
          <Text accessibilityRole="header" style={styles.name} testID={productPageNameTestID}>
            {product.name}
          </Text>
          <Text style={styles.summary} testID={productPageSummaryTestID}>
            {product.summary}
          </Text>
        </View>

        <ListCard
          lines={product.suits}
          marker="dot"
          section="suits"
          title={words('hygiene.section.suits')}
        />
        <ListCard
          lines={product.advantages}
          marker="tick"
          section="advantages"
          title={words('hygiene.section.advantages')}
        />
        <ListCard
          lines={product.disadvantages}
          marker="dash"
          section="disadvantages"
          title={words('hygiene.section.disadvantages')}
        />

        <Card testID={productSectionTestID('steps')}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{words('hygiene.section.howTo')}</Text>
            {product.steps.map((step, index) => (
              <View key={step} style={styles.line}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{String(index + 1)}</Text>
                </View>
                <Text style={styles.lineText} testID={productLineTestID('steps', index)}>
                  {step}
                </Text>
              </View>
            ))}
            <Text style={styles.note} testID={productPageNoteTestID}>
              {product.note}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colour.accentSoft,
    borderRadius: radius.full,
    height: STEP_BADGE,
    justifyContent: 'center',
    width: STEP_BADGE,
  },
  badgeText: { color: colour.accent, ...textStyle('label-md') },
  body: { gap: space.spaceLg, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  dot: {
    backgroundColor: colour.accent,
    borderRadius: radius.full,
    height: DOT,
    marginTop: space.spaceSm + 1,
    width: DOT,
  },
  intro: { gap: space.spaceMd },
  line: { alignItems: 'flex-start', flexDirection: 'row', gap: space.spaceMd },
  list: { gap: space.spaceSm },
  lineText: { color: colour.text, flex: 1, ...textStyle('body-lg') },
  mark: { marginTop: 3 },
  name: { color: colour.text, ...textStyle('headline-lg') },
  note: { color: colour.secondaryText, ...textStyle('body-sm') },
  section: { gap: space.spaceMd },
  sectionTitle: {
    color: colour.secondaryText,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  summary: { color: colour.secondaryText, ...textStyle('body-lg') },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: TILE_CORNER,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
});
