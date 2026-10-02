import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

/**
 * The three ways Emi asks her to do something: the affirmative action, the one beside it, and the
 * quiet one that is a sentence rather than a box.
 *
 * Each is a capsule or no box at all, so the three differ by fill and by height as well as by
 * colour: the affirmative action is the only one filled with the colour that acts, it stands four
 * points taller than the one beside it, and the quiet action carries no ground. Every one of them
 * clears the forty four points contract SEE-3 fixes.
 */

interface ActionProps {
  readonly label: string;
  /** Left out where the action is always available. A spent button takes no press. */
  readonly isReady?: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

/** Points. The affirmative action stands taller than the one beside it, which is how they differ. */
const AFFIRMATIVE_HEIGHT = 52;

/** Points. The action beside it, four points shorter, and still above the tap floor. */
const QUIETER_HEIGHT = 48;

/**
 * Points. The capsule of the affirmative action is padded past every other control in the set,
 * because a capsule reads as a capsule only when its ends are clear of the word inside it.
 */
const AFFIRMATIVE_SIDES = 40;

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
          ? [
              styles.capsule,
              styles.affirmativeSize,
              styles.affirmative,
              heldDown ? styles.affirmativeHeldDown : null,
            ]
          : [styles.capsule, styles.affirmativeSize, styles.spent]
      }
      testID={testID}
    >
      <Text style={isReady ? styles.affirmativeLabel : styles.spentLabel}>{label}</Text>
    </Pressable>
  );
}

/** The action beside the affirmative one. It sits in the recessed ground and carries no fill. */
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
          ? [styles.capsule, styles.quieter, heldDown ? styles.quieterHeldDown : null]
          : [styles.capsule, styles.quieter, styles.spent]
      }
      testID={testID}
    >
      <Text style={isReady ? styles.quieterLabel : styles.spentLabel}>{label}</Text>
    </Pressable>
  );
}

/** The quiet action. Words in the colour that acts, and nothing drawn around or under them. */
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  affirmative: { backgroundColor: colour.accent },
  affirmativeHeldDown: { backgroundColor: colour.accent },
  affirmativeLabel: {
    color: colour.onAccent,
    ...textStyle('button-lg'),
  },
  // Carried by the spent state too, so a screen does not move when the answer she is missing
  // arrives.
  affirmativeSize: {
    minHeight: AFFIRMATIVE_HEIGHT,
    paddingHorizontal: AFFIRMATIVE_SIDES,
  },
  capsule: {
    alignItems: 'center',
    borderRadius: radius.full,
    justifyContent: 'center',
    minHeight: QUIETER_HEIGHT,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.marginMd,
  },
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceSm,
  },
  linkLabel: {
    color: colour.accent,
    ...textStyle('button-md'),
  },
  quieter: { backgroundColor: colour.field },
  // Its ready ground is already the recessed one, so a press has nowhere quieter to go inside a
  // closed palette.
  quieterHeldDown: { backgroundColor: colour.field },
  quieterLabel: {
    color: colour.text,
    ...textStyle('button-md'),
  },
  // A spent action keeps a measured pair rather than fading: an opacity nobody measured is a
  // contrast ratio nobody knows, and contract TOKEN-2 exists to stop exactly that. The hairline is
  // what says unavailable without colour, since the ground is the one a ready quieter action has.
  spent: {
    backgroundColor: colour.field,
    borderColor: colour.line,
    borderWidth: stroke.hairline,
  },
  spentLabel: {
    color: colour.secondaryText,
    ...textStyle('button-md'),
  },
});
