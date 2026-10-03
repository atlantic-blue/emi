import { type IconName, MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, floatingShadow } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * One round action under the ring: a disc carrying a drawing, and the name of the action under it.
 *
 * The two are told apart by their fill rather than by their words. Logging a period is the press
 * she makes most, so it takes the accent and the drawing takes the one ink the palette measured on
 * the accent. Symptoms is paper, so it takes the card and the ink of the card. Reading the pair
 * needs no colour vision: one is filled and the other is not.
 *
 * The name is a word contract SCREEN-2 holds to 14 points, so it takes the label role and never a
 * body role. A stranger beside her reads nothing at that size.
 */

/** The actions the drawing places under the ring, in the order it places them. */
export const roundActions = ['period', 'symptoms'] as const;

export type RoundActionName = (typeof roundActions)[number];

/**
 * What every round action is drawn under, which is how a reader finds all of them at once.
 * Nothing inside an action carries an identifier of its own, so a reader matching on this stem
 * counts the actions and never the parts of one.
 */
export const roundActionStem = 'home-round-action-';

export function roundActionTestID(name: RoundActionName): string {
  return `${roundActionStem}${name}`;
}

/**
 * The disc itself, which is filled on the period action and white on the symptoms one.
 *
 * It is named away from the stem above on purpose. A reader counting the actions matches on that
 * stem, so a part inside an action that carried it would be counted as an action of its own.
 */
export function roundActionDiscTestID(name: RoundActionName): string {
  return `home-round-disc-${name}`;
}

/** The drawing inside the disc, which takes the one ink the palette measured on that disc. */
export function roundActionDrawingTestID(name: RoundActionName): string {
  return `home-round-drawing-${name}`;
}

/** Points. The disc is wider than the floor a touch needs, so the drawing inside it has room. */
const theDiscIsThisWide = 60;

/** Points. The drawing inside the disc, which the mockup draws slightly above the set's size. */
const theDrawingInTheDisc = 26;

/** The ground each disc is drawn on, and the one ink the palette measured on that ground. */
const thePaintOf: Readonly<Record<RoundActionName, { ground: string; ink: string }>> = {
  period: { ground: colour.accent, ink: colour.onAccent },
  symptoms: { ground: colour.card, ink: colour.text },
};

interface Props {
  readonly action: RoundActionName;
  readonly icon: IconName;
  readonly label: string;
  readonly onPress: () => void;
}

export function RoundAction({ action, icon, label, onPress }: Props): ReactNode {
  const paint = thePaintOf[action];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
      testID={roundActionTestID(action)}
    >
      <View
        style={[styles.disc, { backgroundColor: paint.ground }]}
        testID={roundActionDiscTestID(action)}
      >
        <Icon
          colour={paint.ink}
          name={icon}
          size={theDrawingInTheDisc}
          testID={roundActionDrawingTestID(action)}
        />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    gap: space.spaceSm,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  // The disc lifts off the ground by the one shadow the design document allows, so the pair reads
  // as two things to press rather than as two circles printed on the paper behind them.
  disc: {
    alignItems: 'center',
    borderRadius: radius.full,
    boxShadow: floatingShadow,
    height: theDiscIsThisWide,
    justifyContent: 'center',
    width: theDiscIsThisWide,
  },
  label: {
    color: colour.text,
    ...textStyle('label-md'),
  },
});
