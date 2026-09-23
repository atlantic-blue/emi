import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

/**
 * One word she turns on and off. The quickest control in the product, and the smallest, so the
 * tap floor of contract SEE-3 decides its height and the padding only pushes a longer word past it.
 *
 * A chosen chip steps its ground up and takes the accent as its border, so the two states differ
 * by a line as well as by a fill.
 */

interface Props {
  readonly label: string;
  readonly isChosen: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

export function Chip({ label, isChosen, onPress, testID }: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isChosen }}
      onPress={onPress}
      style={isChosen ? [styles.chip, styles.chosen] : styles.chip}
      testID={testID}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainer,
    borderColor: colour.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
  },
  chosen: {
    backgroundColor: colour.surfaceContainerHigh,
    borderColor: colour.primaryContainer,
  },
  label: {
    color: colour.onSurface,
    ...textStyle('body-sm'),
  },
});
