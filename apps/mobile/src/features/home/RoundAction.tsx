import { type IconName, MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, floatingShadow, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/**
 * One round action under the ring: a disc carrying a drawing, and the name of the action under it.
 *
 * A filled disc reads as switched on, so only the Period action is ever filled, and only on a day
 * of the period phase, as the todayPeriodButton board draws it. On every other day all three are
 * paper: they take the card, with the drop and the heart in the accent and the phase drawing in
 * the ink of the phase card. Reading the state needs no colour vision: the disc is filled or not,
 * and a reader hears it as selected.
 *
 * The name is a word contract SCREEN-2 holds to 14 points, so it takes the label role and never a
 * body role. A stranger beside her reads nothing at that size.
 */

/** The actions the todayPhases board places under the ring, in the order it places them. */
export const roundActions = ['sex', 'period', 'phase'] as const;

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
 * The disc itself, which is filled on the period action on a period day and white otherwise.
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

/** Points. The board gives each action this width, so a two word label stays on one line. */
const theActionIsThisWide = 88;

interface Paint {
  readonly ground: string;
  readonly ink: string;
}

/** The ground each disc is drawn on, and the one ink the palette measured on that ground. */
const thePaintOf: Readonly<Record<RoundActionName, Paint>> = {
  sex: { ground: colour.card, ink: colour.accent },
  period: { ground: colour.card, ink: colour.accent },
  phase: { ground: colour.card, ink: colour.ovulationInk },
};

/** An action that is on fills its disc with the accent, and the drawing takes the ink for it. */
const thePaintWhenOn: Paint = { ground: colour.accent, ink: colour.onAccent };

interface Props {
  readonly action: RoundActionName;
  readonly icon: IconName;
  readonly label: string;
  readonly onPress: () => void;
  /** True while the thing the action names is happening today: the Period action on a period day. */
  readonly isOn?: boolean;
}

export function RoundAction({ action, icon, label, onPress, isOn = false }: Props): ReactNode {
  const paint = isOn ? thePaintWhenOn : thePaintOf[action];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isOn }}
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
    width: theActionIsThisWide,
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
    textAlign: 'center',
  },
});
