import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  type TheFreeMonth,
  type WhichPlan,
  thePaywallSaid,
  theLineUnderThePriceOf,
  thePlanNameOf,
  thePriceOf,
} from './copy';

/**
 * One plan she can pick, as the board draws it: a ring, the name of the plan, the price with its
 * period, and the line that says what is taken and when.
 *
 * The free month belongs to the yearly plan and to nothing else, so the chip above the price and
 * the sentence under it are drawn on that row alone. A monthly row that borrowed either one would
 * promise a month the App Store will not give her, and so would a yearly row drawn for a woman
 * who has spent hers.
 */

export function planRowTestID(which: WhichPlan): string {
  return `paywall-plan-${which}`;
}

export function planRingTestID(which: WhichPlan): string {
  return `${planRowTestID(which)}-ring`;
}

export function planNameTestID(which: WhichPlan): string {
  return `${planRowTestID(which)}-name`;
}

export function planOfferTestID(which: WhichPlan): string {
  return `${planRowTestID(which)}-offer`;
}

export function planPriceTestID(which: WhichPlan): string {
  return `${planRowTestID(which)}-price`;
}

export function planLineTestID(which: WhichPlan): string {
  return `${planRowTestID(which)}-line`;
}

/** Points. The ring at the head of the row, and the dot that fills it once the row is hers. */
const RING_SIZE = 22;
const DOT_SIZE = 10;

/**
 * Points. The board draws the chosen row twice as thick as the rule under a list, which is between
 * the hairline of a rule and the stroke of a drawing, so it is neither token and it is named here.
 */
const CHOSEN_EDGE = 2;

export function PlanRow({
  which,
  price,
  isChosen,
  month = 'hers',
  onPress,
}: {
  readonly which: WhichPlan;
  /** The figure the store quoted, in her own currency. */
  readonly price: string;
  readonly isChosen: boolean;
  /** Whether the free month is still hers, which the row draws the chip and its line from. */
  readonly month?: TheFreeMonth;
  readonly onPress: () => void;
}): ReactNode {
  const said = thePaywallSaid();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isChosen }}
      onPress={onPress}
      style={[styles.row, isChosen ? styles.chosenRow : styles.quietRow]}
      testID={planRowTestID(which)}
    >
      <View
        style={[styles.ring, isChosen ? styles.chosenRing : styles.quietRing]}
        testID={planRingTestID(which)}
      >
        {isChosen ? <View style={styles.dot} /> : null}
      </View>
      <View style={styles.words}>
        <View style={styles.heading}>
          <Text style={styles.name} testID={planNameTestID(which)}>
            {thePlanNameOf(which)}
          </Text>
          {which === 'yearly' && month === 'hers' ? (
            <Text style={styles.offer} testID={planOfferTestID(which)}>
              {said.offer}
            </Text>
          ) : null}
        </View>
        <Text style={styles.price} testID={planPriceTestID(which)}>
          {thePriceOf(which, price)}
        </Text>
        <Text style={styles.line} testID={planLineTestID(which)}>
          {theLineUnderThePriceOf(which, price, month)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chosenRing: { borderColor: colour.accent, borderStyle: 'solid', borderWidth: CHOSEN_EDGE },
  chosenRow: { borderColor: colour.accent, borderStyle: 'solid', borderWidth: CHOSEN_EDGE },
  dot: {
    backgroundColor: colour.accent,
    borderRadius: radius.full,
    height: DOT_SIZE,
    width: DOT_SIZE,
  },
  heading: {
    alignItems: 'center',
    columnGap: space.spaceSm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.spaceXs,
  },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  name: { color: colour.text, ...textStyle('choice-lg') },
  offer: {
    backgroundColor: colour.washWarm,
    borderRadius: radius.full,
    color: colour.ovulationInk,
    overflow: 'hidden',
    paddingHorizontal: space.spaceSm,
    paddingVertical: space.spaceXs,
    ...textStyle('label-sm'),
  },
  price: { color: colour.text, ...textStyle('choice-sm') },
  quietRing: { borderColor: colour.uncheckedRing, borderStyle: 'solid', borderWidth: CHOSEN_EDGE },
  quietRow: { borderColor: colour.line, borderStyle: 'solid', borderWidth: stroke.hairline },
  ring: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: RING_SIZE,
    justifyContent: 'center',
    width: RING_SIZE,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    columnGap: space.spaceLg,
    flexDirection: 'row',
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceMd,
  },
  words: { flexShrink: 1, rowGap: space.spaceXs },
});
