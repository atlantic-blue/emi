import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * A number she moves one step at a time, held between a floor and a ceiling.
 *
 * The number is set in the monospaced face so a digit does not shift sideways as she presses, and
 * the two buttons are circles at the tap floor exactly, which is what the document draws.
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
  caption: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
  },
  mark: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
  },
  middle: { alignItems: 'center', gap: space.spaceXs },
  reading: {
    color: colour.onSurface,
    ...textStyle('data-lg'),
  },
  spent: { backgroundColor: colour.surfaceContainerHigh },
  spentMark: {
    color: colour.onSurfaceVariant,
    ...textStyle('headline-md'),
  },
  step: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainerLowest,
    borderRadius: radius.full,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  well: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainer,
    borderRadius: radius.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: space.spaceMd,
  },
});
