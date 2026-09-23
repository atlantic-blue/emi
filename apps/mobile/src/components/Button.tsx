import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * The three ways Emi asks her to do something: the affirmative action, the one beside it, and the
 * quiet one that is a sentence rather than a box.
 *
 * Every one of them is at least forty eight points high, which is above the forty four contract
 * SEE-3 fixes, and none of them is a rectangle of colour alone: the secondary carries a hairline
 * and the link carries a rule, so a screen read without colour still shows three different things.
 */

interface ActionProps {
  readonly label: string;
  /** Left out where the action is always available. A spent button takes no press. */
  readonly isReady?: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

/** Points. The document asks for at least forty eight, which is four above the tap floor. */
const BUTTON_HEIGHT = 48;

/** Points. The rule of a text link sits this far under the words it belongs to. */
const UNDERLINE_GAP = 4;

/**
 * Whether her thumb is on this control, and the two handlers that say so.
 *
 * React Native offers the same answer through a style written as a function, and that answer is
 * unreachable under the test runner: nothing there can hold a finger down. The state is held here
 * instead, so the step the design system asks a button to make is a thing a test can see.
 */
function useHeldDown(): {
  readonly heldDown: boolean;
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
} {
  const [heldDown, setHeldDown] = useState(false);

  return {
    heldDown,
    onPressIn: () => {
      setHeldDown(true);
    },
    onPressOut: () => {
      setHeldDown(false);
    },
  };
}

/**
 * The affirmative action. It steps to the darker of the two primaries while her thumb is down, so
 * the press is answered by the button and not only by what happens next.
 */
export function PrimaryButton({ label, isReady = true, onPress, testID }: ActionProps): ReactNode {
  const { heldDown, onPressIn, onPressOut } = useHeldDown();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !isReady }}
      disabled={!isReady}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={
        isReady
          ? [styles.button, heldDown ? styles.primaryHeldDown : styles.primary]
          : [styles.button, styles.spent]
      }
      testID={testID}
    >
      <Text style={isReady ? styles.primaryLabel : styles.spentLabel}>{label}</Text>
    </Pressable>
  );
}

/** The action beside the affirmative one. A hairline holds it, because it carries no fill. */
export function SecondaryButton({
  label,
  isReady = true,
  onPress,
  testID,
}: ActionProps): ReactNode {
  const { heldDown, onPressIn, onPressOut } = useHeldDown();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !isReady }}
      disabled={!isReady}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={
        isReady
          ? [styles.button, styles.secondary, heldDown ? styles.secondaryHeldDown : null]
          : [styles.button, styles.spent]
      }
      testID={testID}
    >
      <Text style={isReady ? styles.secondaryLabel : styles.spentLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * The quiet action. The rule under the words is drawn rather than set as a text decoration,
 * because React Native offsets no underline and a rule against the letters is not the design.
 */
export function TextLink({ label, isReady = true, onPress, testID }: ActionProps): ReactNode {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ disabled: !isReady }}
      disabled={!isReady}
      onPress={onPress}
      style={styles.link}
      testID={testID}
    >
      <Text style={isReady ? styles.linkLabel : styles.spentLabel}>{label}</Text>
      <View style={isReady ? styles.rule : styles.spentRule} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: BUTTON_HEIGHT,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceSm,
  },
  linkLabel: {
    color: colour.onSurface,
    ...textStyle('label-md'),
  },
  primary: { backgroundColor: colour.primaryContainer },
  primaryHeldDown: { backgroundColor: colour.primary },
  primaryLabel: {
    color: colour.onPrimary,
    ...textStyle('label-md'),
  },
  rule: {
    backgroundColor: colour.onSurface,
    height: stroke.hairline,
    marginTop: UNDERLINE_GAP,
    width: '100%',
  },
  secondary: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderWidth: stroke.hairline,
  },
  secondaryHeldDown: { backgroundColor: colour.surfaceContainer },
  secondaryLabel: {
    color: colour.onSurface,
    ...textStyle('label-md'),
  },
  // A spent action keeps a measured pair rather than fading: an opacity nobody measured is a
  // contrast ratio nobody knows, and contract TOKEN-2 exists to stop exactly that.
  spent: {
    backgroundColor: colour.surfaceContainer,
    borderColor: colour.outlineVariant,
    borderWidth: stroke.hairline,
  },
  spentLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-md'),
  },
  spentRule: {
    backgroundColor: colour.onSurfaceVariant,
    height: stroke.hairline,
    marginTop: UNDERLINE_GAP,
    width: '100%',
  },
});
