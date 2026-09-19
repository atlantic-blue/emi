import {
  BEAD_HALO_WIDTH,
  BEAD_RADIUS,
  DAYS_AHEAD_STRENGTH,
  type PhaseName,
  type PhaseSpan,
  RING_DIAMETER,
  RING_OPEN_MILLISECONDS,
  RING_TRACK_WIDTH,
  arcPath,
  colour,
  phaseLabel,
  phasePalette,
  pointOnRing,
  ringGeometry,
  textStyle,
} from '@emi/tokens';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The ring of design section 9.5, drawn from the days of her own cycle. It carries the meaning so
 * the words can stay small, which is what lets her open Emi with somebody sitting beside her.
 *
 * The four phase boundaries are given to it rather than worked out here. The arithmetic that
 * derives them from her forecast is feature 3, and the ring draws whatever it is handed.
 */

export const cycleRingTestID = 'cycle-ring';
export const ringBeadTestID = 'ring-bead';
export const ringTrackTestID = 'ring-track';

export type ArcStrength = 'elapsed' | 'ahead';

export function ringArcTestID(phase: PhaseName, strength: ArcStrength): string {
  return `ring-arc-${phase}-${strength}`;
}

interface Props {
  readonly cycleLengthDays: number;
  /** The day she is on, counting from one. */
  readonly day: number;
  readonly phases: readonly PhaseSpan[];
  readonly diameter?: number;
}

export function CycleRing({
  cycleLengthDays,
  day,
  phases,
  diameter = RING_DIAMETER,
}: Props): ReactNode {
  const geometry = ringGeometry({ cycleLengthDays, day, phases });
  const centre = { x: diameter / 2, y: diameter / 2 };
  const radius = (diameter - RING_TRACK_WIDTH) / 2;
  const bead = pointOnRing(centre, radius, geometry.beadDegrees);
  const opening = useOpeningMotion();

  const arcs: ReactNode[] = [];

  for (const arc of geometry.arcs) {
    const fill = colour[phasePalette[arc.phase].fill];
    const ahead = arc.sweepDegrees - arc.elapsedDegrees;

    if (ahead > 0) {
      arcs.push(
        <Path
          d={arcPath(centre, radius, arc.startDegrees + arc.elapsedDegrees, ahead)}
          fill="none"
          key={ringArcTestID(arc.phase, 'ahead')}
          opacity={DAYS_AHEAD_STRENGTH}
          stroke={fill}
          strokeWidth={RING_TRACK_WIDTH}
          testID={ringArcTestID(arc.phase, 'ahead')}
        />,
      );
    }
    if (arc.elapsedDegrees > 0) {
      arcs.push(
        <Path
          d={arcPath(centre, radius, arc.startDegrees, arc.elapsedDegrees)}
          fill="none"
          key={ringArcTestID(arc.phase, 'elapsed')}
          stroke={fill}
          strokeWidth={RING_TRACK_WIDTH}
          testID={ringArcTestID(arc.phase, 'elapsed')}
        />,
      );
    }
  }

  return (
    <View
      accessibilityLabel={`Day ${day} of ${cycleLengthDays}, ${phaseLabel[geometry.phase].toLowerCase()}`}
      accessibilityRole="image"
      accessible
      style={[styles.ring, { height: diameter, width: diameter }]}
      testID={cycleRingTestID}
    >
      <Animated.View
        style={{ opacity: opening.opacity, transform: [{ scale: opening.scale }] }}
        testID={ringTrackTestID}
      >
        <Svg height={diameter} width={diameter}>
          {arcs}
          <Circle
            cx={bead.x}
            cy={bead.y}
            fill={colour.ember}
            r={BEAD_RADIUS}
            stroke={colour.stone}
            strokeWidth={BEAD_HALO_WIDTH}
            testID={ringBeadTestID}
          />
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={styles.middle}>
        <Text style={styles.day}>{day}</Text>
        <Text style={[styles.phase, { color: colour[phasePalette[geometry.phase].ink] }]}>
          {phaseLabel[geometry.phase]}
        </Text>
      </View>
    </View>
  );
}

interface OpeningMotion {
  readonly opacity: Animated.Value;
  readonly scale: Animated.Value;
}

/**
 * The ring moves once, when the screen opens. A phone that asks for less motion is answered
 * before the first frame is drawn, so the ring arrives already open rather than stopping halfway.
 */
function useOpeningMotion(): OpeningMotion {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(OPENS_FROM));

  useEffect(() => {
    let watching = true;

    const arriveAtOnce = (): void => {
      opacity.setValue(1);
      scale.setValue(1);
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (!watching) {
          return;
        }
        if (reduced) {
          arriveAtOnce();
          return;
        }
        Animated.parallel([
          Animated.timing(opacity, {
            duration: RING_OPEN_MILLISECONDS,
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            duration: RING_OPEN_MILLISECONDS,
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      })
      // A phone that will not say leaves her looking at a ring that never arrived, so silence
      // is answered the same way reduced motion is.
      .catch(arriveAtOnce);

    return () => {
      watching = false;
    };
  }, [opacity, scale]);

  return { opacity, scale };
}

/** Small enough to read as the ring settling, large enough to be seen at all. */
const OPENS_FROM = 0.94;

const styles = StyleSheet.create({
  day: {
    color: colour.ink,
    ...textStyle('headline-xl'),
  },
  middle: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  // Contract SCREEN-2 refuses the four words of the cycle above 14 points, and the phase name is
  // one of them, so the ring writes it at the small size wherever it is drawn.
  phase: {
    ...textStyle('body-sm'),
  },
  ring: { alignItems: 'center', justifyContent: 'center' },
});
