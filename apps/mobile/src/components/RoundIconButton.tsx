import { type IconName, MINIMUM_TAP_TARGET, colour, radius } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

/**
 * An action that carries a drawing and no words: the way back out of a screen, and the way into one.
 *
 * It shows nothing to read, so the accessibility label is required rather than optional. A reader
 * who cannot see the drawing has only that sentence. The disc is drawn at exactly the tap floor of
 * contract SEE-3, because it holds one drawing and has no word to make room for.
 *
 * The approved prototype paints the disc in white at seven tenths, and a translucent value has no
 * contrast ratio anything can measure, so the disc takes the opaque surface instead.
 */

interface Props {
  readonly icon: IconName;
  /** Required, because the control shows no words. */
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly testID?: string;
}

/** Points. The drawing inside the disc, which the prototype draws two points under the set's size. */
const THE_DRAWING_IN_THE_DISC = 22;

export function RoundIconButton({ icon, accessibilityLabel, onPress, testID }: Props): ReactNode {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.disc}
      testID={testID}
    >
      <Icon colour={colour.text} name={icon} size={THE_DRAWING_IN_THE_DISC} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
});
