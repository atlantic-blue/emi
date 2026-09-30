import { type IconName, MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * One round action under the ring: a disc carrying a drawing, and the name of the action under it.
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

/** Points. The disc is wider than the floor a touch needs, so the drawing inside it has room. */
const theDiscIsThisWide = 64;

/** Points. The drawing inside the disc, which the mockup draws slightly above the set's size. */
const theDrawingInTheDisc = 26;

interface Props {
  readonly action: RoundActionName;
  readonly icon: IconName;
  readonly label: string;
  readonly onPress: () => void;
}

export function RoundAction({ action, icon, label, onPress }: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
      testID={roundActionTestID(action)}
    >
      <View style={styles.disc}>
        <Icon colour={colour.onPrimaryFixed} name={icon} size={theDrawingInTheDisc} />
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
  disc: {
    alignItems: 'center',
    backgroundColor: colour.primaryFixed,
    borderRadius: radius.full,
    height: theDiscIsThisWide,
    justifyContent: 'center',
    width: theDiscIsThisWide,
  },
  label: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-md'),
  },
});
