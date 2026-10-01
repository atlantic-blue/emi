import { type IconName, MINIMUM_TAP_TARGET, colour } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

/**
 * An action that carries a drawing and no words: the way back out of a screen, and the way into
 * one.
 *
 * It shows nothing to read, so the accessibility label is required rather than optional. A reader
 * who cannot see the drawing has only that sentence.
 */

interface Props {
  readonly icon: IconName;
  /** Required, because the control shows no words. */
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly testID?: string;
}

export function RoundIconButton({ icon, accessibilityLabel, onPress, testID }: Props): ReactNode {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.disc}
      testID={testID}
    >
      <Icon colour={colour.text} name={icon} size={MINIMUM_TAP_TARGET} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
