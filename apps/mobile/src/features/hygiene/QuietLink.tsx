import { MINIMUM_TAP_TARGET, colour, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { CappedText as Text } from '@emi/ui';

/**
 * The grey action under the main button of the quiz and of the sheet on the Sex page: "Back",
 * "Answer again" and "Not now". The boards draw it in the secondary text colour with no box, as the
 * forecast sheet draws its "Not now".
 */

interface Props {
  readonly label: string;
  readonly onPress: () => void;
  readonly testID: string;
}

export function QuietLink({ label, onPress, testID }: Props): ReactNode {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link} testID={testID}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { color: colour.secondaryText, ...textStyle('button-md') },
  link: { alignItems: 'center', justifyContent: 'center', minHeight: MINIMUM_TAP_TARGET },
});
