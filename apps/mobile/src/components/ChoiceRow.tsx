import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * The two rows she picks from: one of a set, or any number of a set.
 *
 * Both draw the whole row as the target rather than the small control at the end of it, and both
 * mark the answer she gave twice over: the row fills with the one colour that acts, and it carries
 * a check on a white disc. Colour is never the only cue.
 *
 * A row she may answer more than once keeps an empty ring until she answers it, because a column of
 * rows with nothing at the end of them does not say that more than one of them can be hers.
 */

interface Props {
  readonly label: string;
  readonly isChosen: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

/** Points. The document draws the row at this height, well above the tap floor of SEE-3. */
const ROW_HEIGHT = 56;

/** Points. The disc a chosen row carries the check on. */
const DISC_SIZE = 22;

/** Points. The check inside that disc, on the twenty four point grid the icon set is drawn on. */
const CHECK_SIZE = 14;

/** Points. The ring of an answer she has not given, where more than one answer can be hers. */
const RING_SIZE = 20;

/**
 * Points. The outline of that ring. The document draws it between the hairline of a rule and the
 * stroke of a drawing, so it is neither token and it is named here.
 */
const RING_WIDTH = 1.5;

/** The disc that says a row is chosen, named so a test can read the ground it is drawn on. */
export function rowDiscTestID(testID: string): string {
  return `${testID}-disc`;
}

/** The check inside that disc, named so a test can read the colour it is drawn in. */
export function rowCheckTestID(testID: string): string {
  return `${testID}-check`;
}

/** The empty ring of an answer she has not given, where she may give more than one. */
export function rowRingTestID(testID: string): string {
  return `${testID}-ring`;
}

/** The mark of a chosen row, which both row kinds draw the same way. */
function ChosenMark({ testID }: { readonly testID?: string }): ReactNode {
  return (
    <View style={styles.disc} testID={testID === undefined ? undefined : rowDiscTestID(testID)}>
      <Icon
        colour={colour.accent}
        name="check"
        size={CHECK_SIZE}
        testID={testID === undefined ? undefined : rowCheckTestID(testID)}
      />
    </View>
  );
}

/** One of a set. Pressing a chosen row does nothing, the way a radio control behaves anywhere. */
export function SingleChoiceRow({ label, isChosen, onPress, testID }: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isChosen }}
      onPress={onPress}
      style={isChosen ? [styles.row, styles.rowChosen] : styles.row}
      testID={testID}
    >
      <Text style={isChosen ? styles.labelChosen : styles.label}>{label}</Text>
      {isChosen ? <ChosenMark testID={testID} /> : null}
    </Pressable>
  );
}

/** Any number of a set. The check is a drawing from the icon set rather than a written character. */
export function MultiChoiceRow({ label, isChosen, onPress, testID }: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChosen }}
      onPress={onPress}
      style={isChosen ? [styles.row, styles.rowChosen] : styles.row}
      testID={testID}
    >
      <Text style={isChosen ? styles.labelChosen : styles.label}>{label}</Text>
      {isChosen ? (
        <ChosenMark testID={testID} />
      ) : (
        <View
          style={styles.ring}
          testID={testID === undefined ? undefined : rowRingTestID(testID)}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    backgroundColor: colour.onAccent,
    borderRadius: radius.full,
    height: DISC_SIZE,
    justifyContent: 'center',
    width: DISC_SIZE,
  },
  label: {
    color: colour.text,
    flexShrink: 1,
    ...textStyle('choice-lg'),
  },
  labelChosen: {
    color: colour.onAccent,
    flexShrink: 1,
    ...textStyle('choice-lg'),
  },
  ring: {
    borderColor: colour.disabledLabel,
    borderRadius: radius.full,
    borderWidth: RING_WIDTH,
    height: RING_SIZE,
    width: RING_SIZE,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colour.field,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.spaceMd,
    justifyContent: 'space-between',
    minHeight: ROW_HEIGHT,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceMd,
  },
  rowChosen: { backgroundColor: colour.accent },
});
