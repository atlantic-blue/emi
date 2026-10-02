import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * A number she moves one step at a time, held between a floor and a ceiling.
 *
 * The prototype draws every number question as the value she holds on a band of the soft tint, so
 * the number sits on that band at the size the prototype reads it, and the two buttons are circles
 * at the tap floor exactly, on the plain surface.
 *
 * A button at its boundary is spent rather than absent: it keeps its place, so the row does not
 * move under her thumb on the press that reaches the end.
 */

interface Props {
  /** The number as she reads it, which carries its unit. The value itself is never formatted here. */
  readonly reading: string;
  /** The word under the number. Left out where the reading already carries its unit. */
  readonly caption?: string;
  readonly canGoDown: boolean;
  readonly canGoUp: boolean;
  readonly onDown: () => void;
  readonly onUp: () => void;
  readonly downLabel: string;
  readonly upLabel: string;
  readonly testID?: string;
}

export function stepperDownTestID(testID: string): string {
  return `${testID}-down`;
}

export function stepperUpTestID(testID: string): string {
  return `${testID}-up`;
}

export function stepperReadingTestID(testID: string): string {
  return `${testID}-reading`;
}

/** The two marks, written rather than drawn, because the icon set holds no minus. */
const DOWN_MARK = '-';
const UP_MARK = '+';

/** Points. The height the document draws the band of a chosen value at. */
const BAND_HEIGHT = 58;

export function Stepper({
  reading,
  caption,
  canGoDown,
  canGoUp,
  onDown,
  onUp,
  downLabel,
  upLabel,
  testID = 'stepper',
}: Props): ReactNode {
  return (
    <View style={styles.well} testID={testID}>
      <Pressable
        accessibilityLabel={downLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canGoDown }}
        disabled={!canGoDown}
        onPress={onDown}
        style={canGoDown ? styles.step : [styles.step, styles.spent]}
        testID={stepperDownTestID(testID)}
      >
        <Text style={canGoDown ? styles.mark : styles.spentMark}>{DOWN_MARK}</Text>
      </Pressable>

      <View style={styles.middle}>
        <Text style={styles.reading} testID={stepperReadingTestID(testID)}>
          {reading}
        </Text>
        {caption === undefined ? null : <Text style={styles.caption}>{caption}</Text>}
      </View>

      <Pressable
        accessibilityLabel={upLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canGoUp }}
        disabled={!canGoUp}
        onPress={onUp}
        style={canGoUp ? styles.step : [styles.step, styles.spent]}
        testID={stepperUpTestID(testID)}
      >
        <Text style={canGoUp ? styles.mark : styles.spentMark}>{UP_MARK}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // The quiet grey of a caption falls under the contrast floor on the soft tint, so the word under
  // the number takes the ink measured against that tint.
  caption: {
    color: colour.accentSoftInk,
    ...textStyle('label-sm'),
  },
  mark: {
    color: colour.text,
    ...textStyle('headline-md'),
  },
  middle: { alignItems: 'center', gap: space.spaceXs },
  reading: {
    color: colour.text,
    ...textStyle('display-lg-mobile'),
  },
  spent: { backgroundColor: colour.field },
  spentMark: {
    color: colour.secondaryText,
    ...textStyle('headline-md'),
  },
  step: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  well: {
    alignItems: 'center',
    backgroundColor: colour.accentSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: BAND_HEIGHT,
    paddingHorizontal: space.spaceMd,
  },
});
