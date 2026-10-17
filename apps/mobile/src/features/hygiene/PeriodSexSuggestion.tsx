import { colour, radius, space, textStyle } from '@emi/tokens';
import { type ReactNode, useMemo } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../components/Button';
import { words } from '../../language';
import { isASwipeDown } from '../ovulation/OvulationPopup';
import { ProductDrawing } from './ProductDrawing';
import { QuietLink } from './QuietLink';
import { Chevron } from './QuizCard';
import { type ProductSlug, productOf } from './products';

/**
 * The sheet over the Sex page after she records sex on a day of her period, from the
 * sexPeriodSuggestion board (issue 306): the menstrual disc and the sponge, each opening its page.
 * "Not now", a swipe down and a press above the sheet all close it.
 *
 * The sheet is drawn on the card colour, as the forecast sheet is, because only the screen frame
 * paints the ground. The two products sit on the field colour so they still read as two tiles.
 */

export const periodSexSuggestionTestID = 'period-sex-suggestion';
export const periodSexSuggestionEyebrowTestID = 'period-sex-suggestion-eyebrow';
export const periodSexSuggestionSeeAllTestID = 'period-sex-suggestion-see-all';
export const periodSexSuggestionNotNowTestID = 'period-sex-suggestion-not-now';
export const periodSexSuggestionShadeTestID = 'period-sex-suggestion-shade';

export function periodSexProductTestID(slug: ProductSlug): string {
  return `period-sex-suggestion-${slug}`;
}

export const periodSexProducts: readonly ProductSlug[] = ['menstrual-disc', 'sponge'];

/** Points, from the board. */
const HANDLE_WIDTH = 40;
const HANDLE_HEIGHT = 5;
const TILE = 52;
const TILE_CORNER = 16;
const DRAWING = 28;

/** The page under the sheet is dimmed with the ink of the text, at this much of its strength. */
const SHADE = 0.42;

interface Props {
  /** The day of her period the sheet is about, counted from one. */
  readonly periodDay: number;
  readonly onOpen: (slug: ProductSlug) => void;
  readonly onSeeAll: () => void;
  readonly onNotNow: () => void;
}

export function PeriodSexSuggestion({ periodDay, onOpen, onSeeAll, onNotNow }: Props): ReactNode {
  const insets = useSafeAreaInsets();
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, drag) => drag.dy > Math.abs(drag.dx) && drag.dy > 8,
        onPanResponderRelease: (_, drag) => {
          if (isASwipeDown(drag)) {
            onNotNow();
          }
        },
      }),
    [onNotNow],
  );
  const notNow = words('sex.periodSuggestion.notNow');

  return (
    <Modal animationType="slide" onRequestClose={onNotNow} transparent visible>
      <View style={styles.scrim}>
        <View pointerEvents="none" style={styles.shade} />
        <Pressable
          accessibilityLabel={notNow}
          onPress={onNotNow}
          style={styles.above}
          testID={periodSexSuggestionShadeTestID}
        />
        <View
          {...swipe.panHandlers}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + space.spaceLg }]}
          testID={periodSexSuggestionTestID}
        >
          <View style={styles.handle} />
          <Text style={styles.eyebrow} testID={periodSexSuggestionEyebrowTestID}>
            {words('sex.periodSuggestion.eyebrow', undefined, { day: periodDay })}
          </Text>
          <Text accessibilityRole="header" style={styles.title}>
            {words('sex.periodSuggestion.title')}
          </Text>
          <Text style={styles.line}>{words('sex.periodSuggestion.line')}</Text>
          <View style={styles.tiles}>
            {periodSexProducts.map((slug) => (
              <ProductTile key={slug} onOpen={onOpen} slug={slug} />
            ))}
          </View>
          <PrimaryButton
            label={words('sex.periodSuggestion.seeAll')}
            onPress={onSeeAll}
            testID={periodSexSuggestionSeeAllTestID}
          />
          <QuietLink label={notNow} onPress={onNotNow} testID={periodSexSuggestionNotNowTestID} />
        </View>
      </View>
    </Modal>
  );
}

function ProductTile(props: {
  readonly slug: ProductSlug;
  readonly onOpen: (slug: ProductSlug) => void;
}): ReactNode {
  const name = productOf(props.slug).name;

  return (
    <Pressable
      accessibilityLabel={name}
      accessibilityRole="button"
      onPress={() => props.onOpen(props.slug)}
      style={styles.product}
      testID={periodSexProductTestID(props.slug)}
    >
      <View style={styles.tile}>
        <ProductDrawing colour={colour.ovulationInk} size={DRAWING} slug={props.slug} />
      </View>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{name}</Text>
        <Chevron />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  above: { flex: 1 },
  eyebrow: { color: colour.accent, textTransform: 'uppercase', ...textStyle('label-md') },
  handle: {
    alignSelf: 'center',
    backgroundColor: colour.line,
    borderRadius: radius.full,
    height: HANDLE_HEIGHT,
    width: HANDLE_WIDTH,
  },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  name: { color: colour.text, flexShrink: 1, ...textStyle('button-md') },
  nameRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  product: {
    backgroundColor: colour.field,
    borderRadius: radius.xl,
    flex: 1,
    gap: space.spaceSm,
    padding: space.spaceMd,
  },
  scrim: { flex: 1 },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: colour.text, opacity: SHADE },
  sheet: {
    backgroundColor: colour.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    gap: space.spaceMd,
    paddingHorizontal: space.margin,
    paddingTop: space.spaceMd,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: TILE_CORNER,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
  tiles: { flexDirection: 'row', gap: space.spaceSm },
  title: { color: colour.text, ...textStyle('headline-md') },
});
