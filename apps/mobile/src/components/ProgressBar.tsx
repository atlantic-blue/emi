import { colour, radius } from '@emi/tokens';
import type { ReactNode } from 'react';
import type { DimensionValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

/**
 * How far along she is, as a track with a fill. The words beside it say the same thing, because a
 * bar alone cannot be read out and a bar alone is not a cue the design accepts.
 *
 * The bar is told a step and a total rather than a width, so the arithmetic has one home and a
 * screen cannot draw a fill that disagrees with the sentence beside it.
 */

interface Props {
  /** Which step she is on, counted from one. */
  readonly step: number;
  readonly total: number;
  /** What a screen reader says in place of the bar, since a fraction of a line reads as nothing. */
  readonly label: string;
  readonly testID?: string;
}

export function progressFillTestID(testID: string): string {
  return `${testID}-fill`;
}

/** Points. A bar rather than a line, so it reads from across a room. */
const TRACK_HEIGHT = 4;

/** A step outside the run is clamped, because a fill past the end of its track draws nothing. */
function widthOf(step: number, total: number): DimensionValue {
  const filled = total <= 0 ? 0 : Math.min(Math.max(step, 0), total) / total;

  return `${filled * 100}%`;
}

export function ProgressBar({ step, total, label, testID = 'progress' }: Props): ReactNode {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: total, min: 0, now: step }}
      style={styles.track}
      testID={testID}
    >
      <View
        style={[styles.fill, { width: widthOf(step, total) }]}
        testID={progressFillTestID(testID)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: colour.primaryContainer,
    borderRadius: radius.full,
    height: '100%',
  },
  track: {
    backgroundColor: colour.surfaceContainer,
    borderRadius: radius.full,
    height: TRACK_HEIGHT,
    overflow: 'hidden',
    width: '100%',
  },
});
