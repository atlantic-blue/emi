import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * The two rows she picks from: one of a set, or any number of a set.
 *
 * Both draw the whole row as the target rather than the small control at the end of it, and both
 * mark a chosen row three ways: the ground steps up, the words go from the secondary colour to the
 * primary one, and the control fills. Colour is never the only cue.
 */

interface Props {
  readonly label: string;
  readonly isChosen: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

/** Points. The document draws the row at this height, well above the tap floor of SEE-3. */
const ROW_HEIGHT = 56;

/** Points. The control at the end of the row, which sits inside a target of the full floor. */
const CONTROL_SIZE = 20;

/** Points. The filled core of a chosen radio, inside the ring that holds it. */
const RADIO_CORE = 8;

/** Points. The tick inside a ticked box, on the twenty four point grid the set is drawn on. */
const TICK_SIZE = 16;

/** The tick inside a ticked box, named so a test can read the colour it is drawn in. */
export function checkboxMarkTestID(testID: string): string {
  return `${testID}-mark`;
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
      <View style={styles.target}>
        <View style={isChosen ? [styles.radio, styles.radioChosen] : styles.radio}>
          {isChosen ? <View style={styles.core} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Any number of a set. The tick is a drawing from the icon set rather than a written character. */
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
      <View style={styles.target}>
        <View style={isChosen ? [styles.box, styles.boxChosen] : styles.box}>
          {isChosen ? (
            <Icon
              colour={colour.primaryContainer}
              name="check"
              size={TICK_SIZE}
              testID={testID === undefined ? undefined : checkboxMarkTestID(testID)}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outline,
    borderRadius: radius.sm,
    borderWidth: stroke.hairline,
    height: CONTROL_SIZE,
    justifyContent: 'center',
    width: CONTROL_SIZE,
  },
  boxChosen: { borderColor: colour.primaryContainer },
  core: {
    backgroundColor: colour.surface,
    borderRadius: radius.full,
    height: RADIO_CORE,
    width: RADIO_CORE,
  },
  label: {
    color: colour.onSurfaceVariant,
    flexShrink: 1,
    ...textStyle('body-md'),
  },
  labelChosen: {
    color: colour.onSurface,
    flexShrink: 1,
    ...textStyle('body-md'),
  },
  radio: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outline,
    borderRadius: radius.full,
    borderWidth: stroke.hairline,
    height: CONTROL_SIZE,
    justifyContent: 'center',
    width: CONTROL_SIZE,
  },
  radioChosen: {
    backgroundColor: colour.primaryContainer,
    borderColor: colour.primaryContainer,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainerLow,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: ROW_HEIGHT,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
  },
  rowChosen: { backgroundColor: colour.surfaceContainerHigh },
  // The control is twenty points across and sits in a box of the full tap floor, so a press that
  // lands beside it still lands on it.
  target: {
    alignItems: 'center',
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
});
