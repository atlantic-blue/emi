import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

/**
 * One word she turns on and off. The quickest control in the product, and the smallest, so the
 * tap floor of contract SEE-3 decides its height and the padding only pushes a longer word past it.
 *
 * A chip she has not turned on is an outline on the plain surface, and one she has turned on fills
 * with the one colour that acts. So a row of them reads as a row of words until she picks from it,
 * and what she picked is the only thing filled in.
 */

interface Props {
  readonly label: string;
  readonly isChosen: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

/**
 * Points. The outline of a chip. The document draws it between the hairline of a rule and the
 * stroke of a drawing, so it is neither token and it is named here.
 */
const CHIP_BORDER = 1.5;

export function Chip({ label, isChosen, onPress, testID }: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isChosen }}
      onPress={onPress}
      style={isChosen ? [styles.chip, styles.chosen] : styles.chip}
      testID={testID}
    >
      <Text style={isChosen ? styles.labelChosen : styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderColor: colour.line,
    borderRadius: radius.full,
    borderWidth: CHIP_BORDER,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceSm,
  },
  chosen: {
    backgroundColor: colour.accent,
    borderColor: colour.accent,
  },
  label: {
    color: colour.text,
    ...textStyle('choice-lg'),
  },
  labelChosen: {
    color: colour.onAccent,
    ...textStyle('choice-lg'),
  },
});
