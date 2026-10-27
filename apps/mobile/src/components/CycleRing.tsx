import {
  type ArcStrength,
  CYCLE_DAY_ROLE,
  CYCLE_LENGTH_ROLE,
  DAYS_AHEAD_STRENGTH,
  NAMED_RING_DIAMETER,
  NAMED_RING_RADIUS,
  NAMED_RING_TRACK_WIDTH,
  PHASE_NAME_ON_ARC_POINTS,
  PHASE_NAME_ON_ARC_SPACING,
  PHASE_NAME_ON_ARC_WEIGHT,
  PHASE_NAME_ROLE,
  type PhaseName,
  type PhaseSpan,
  type Point,
  type RingArc,
  RING_DIAMETER,
  RING_OPEN_MILLISECONDS,
  RING_TRACK_WIDTH,
  arcAtPoint,
  arcPath,
  colour,
  fontNameFor,
  namePath,
  paintedArcs,
  phaseNameInk,
  phaseNameOnArc,
  phaseLabel,
  phasePalette,
  ringGeometry,
  sweepForName,
  textStyle,
  todayPointer,
  todayPointerPalette,
} from '@emi/tokens';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Text as SvgText, TextPath } from 'react-native-svg';

import {
  phaseFullName,
  phaseName,
  ringAboutLengthWords,
  ringCycleLengthWords,
  ringDayNumberWords,
  ringDayWord,
  ringSpokenLabel,
} from '../features/cycle/copy';

/**
 * The ring of design section 9.5, drawn from the days of her own cycle. It carries the meaning so
 * the words can stay small, which is what lets her open Emi with somebody sitting beside her.
 *
 * The four phase boundaries are given to it rather than worked out here. The arithmetic that
 * derives them from her forecast is feature 3, and the ring draws whatever it is handed.
 */

export const cycleRingTestID = 'cycle-ring';
/** The pointer that marks today: its casing, its white core and its head. */
export const ringPointerTestID = 'ring-pointer';
export const ringPointerCasingTestID = 'ring-pointer-casing';
export const ringPointerCoreTestID = 'ring-pointer-core';
export const ringPointerHeadTestID = 'ring-pointer-head';
export const ringTrackTestID = 'ring-track';

export type { ArcStrength };

export function ringArcTestID(phase: PhaseName, strength: ArcStrength): string {
  return `ring-arc-${phase}-${strength}`;
}

/** One arc of the ring of Today, which is painted whole rather than in two strengths. */
export function ringWholeArcTestID(phase: PhaseName): string {
  return `ring-arc-${phase}-whole`;
}

export function ringNameTestID(phase: PhaseName): string {
  return `ring-name-${phase}`;
}

export const ringArcsPressTestID = 'ring-arcs-press';
export const ringCentrePhaseTestID = 'ring-centre-phase';
export const ringCentreDayTestID = 'ring-centre-day';
export const ringCentreLengthTestID = 'ring-centre-length';

interface Props {
  readonly cycleLengthDays: number;
  /** The day she is on, counting from one. */
  readonly day: number;
  readonly phases: readonly PhaseSpan[];
  readonly diameter?: number;
  /** Faded marks the days still to come. A ring drawn for nobody has none to come, so it is full. */
  readonly daysAhead?: 'faded' | 'full';
  /** What the word over the day names. A ring drawn for nobody has no phase of hers to name. */
  readonly centreWord?: 'phase' | 'day';
  /**
   * The ring of Today writes the four phase names along a thicker band, draws every arc at full
   * strength so each name is measured on its own fill, and says the day as "Day N". The small ring
   * of the log carries no words inside it, because the line beside it says the day and the phase.
   */
  readonly look?: 'plain' | 'named' | 'small';
  readonly onPressArc?: (arc: RingArc) => void;
}

/** The small ring of the log takes the same floors as the ring of Today, so both draw one shape. */
export function namedArcFloors(): Readonly<Record<PhaseName, number>> {
  const floorOf = (phase: PhaseName): number => sweepForName(phaseName(phase));

  return {
    period: floorOf('period'),
    follicular: floorOf('follicular'),
    ovulation: floorOf('ovulation'),
    luteal: floorOf('luteal'),
  };
}

export function CycleRing({
  cycleLengthDays,
  day,
  phases,
  diameter = RING_DIAMETER,
  daysAhead = 'faded',
  centreWord = 'phase',
  look = 'plain',
  onPressArc,
}: Props): ReactNode {
  if (look === 'small') {
    return <SmallRing cycleLengthDays={cycleLengthDays} day={day} phases={phases} />;
  }

  return look === 'named' ? (
    <NamedRing
      cycleLengthDays={cycleLengthDays}
      day={day}
      onPressArc={onPressArc}
      phases={phases}
    />
  ) : (
    <PlainRing
      centreWord={centreWord}
      cycleLengthDays={cycleLengthDays}
      day={day}
      daysAhead={daysAhead}
      diameter={diameter}
      phases={phases}
    />
  );
}

/** The ring of the tour and the log: a thin track, with the days ahead of her faded. */
function PlainRing({
  cycleLengthDays,
  day,
  phases,
  diameter,
  daysAhead,
  centreWord,
}: Required<Omit<Props, 'look' | 'onPressArc'>>): ReactNode {
  const geometry = ringGeometry({ cycleLengthDays, day, phases });
  const centre = { x: diameter / 2, y: diameter / 2 };
  const radius = (diameter - RING_TRACK_WIDTH) / 2;
  const opening = useOpeningMotion();

  const arcs = paintedArcs(geometry, radius).map((painted) => (
    <Path
      d={arcPath(centre, radius, painted.startDegrees, painted.sweepDegrees)}
      fill="none"
      key={ringArcTestID(painted.phase, painted.strength)}
      opacity={
        painted.strength === 'ahead' && daysAhead === 'faded' ? DAYS_AHEAD_STRENGTH : undefined
      }
      stroke={colour[phasePalette[painted.phase].fill]}
      strokeLinecap={painted.roundEnds ? 'round' : 'butt'}
      strokeWidth={RING_TRACK_WIDTH}
      testID={ringArcTestID(painted.phase, painted.strength)}
    />
  ));

  return (
    <View
      accessibilityLabel={ringSpokenLabel(day, cycleLengthDays, phaseLabel[geometry.phase])}
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
        </Svg>
        <TodayPointerDrawing
          band={{ radius, width: RING_TRACK_WIDTH }}
          centre={centre}
          degrees={geometry.beadDegrees}
          diameter={diameter}
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.middle}>
        {centreWord === 'day' ? (
          <Text style={styles.dayWord}>{ringDayWord()}</Text>
        ) : (
          <Text style={[styles.phase, { color: colour[phasePalette[geometry.phase].ink] }]}>
            {phaseLabel[geometry.phase]}
          </Text>
        )}
        <Text style={centreWord === 'day' ? styles.dayAsTheSubject : styles.day}>{day}</Text>
        <Text style={styles.cycleLength}>{ringCycleLengthWords(cycleLengthDays)}</Text>
      </View>
    </View>
  );
}

/** The ring of Today: the four names along a thick band, and the day in the middle in words. */
function NamedRing({
  cycleLengthDays,
  day,
  phases,
  onPressArc,
}: Pick<Props, 'cycleLengthDays' | 'day' | 'phases' | 'onPressArc'>): ReactNode {
  const geometry = ringGeometry({
    cycleLengthDays,
    day,
    phases,
    minimumSweepDegrees: namedArcFloors(),
  });
  const diameter = NAMED_RING_DIAMETER;
  const centre = { x: diameter / 2, y: diameter / 2 };
  const opening = useOpeningMotion();
  const today = phaseName(geometry.phase);

  // Each arc is painted once, whole and at full strength, with square ends as the board draws
  // them, so every name is read against its own fill and nothing else.
  const arcs = geometry.arcs.map((arc) => (
    <Path
      d={arcPath(centre, NAMED_RING_RADIUS, arc.startDegrees, arc.sweepDegrees)}
      fill="none"
      key={ringWholeArcTestID(arc.phase)}
      stroke={colour[phasePalette[arc.phase].fill]}
      strokeLinecap="butt"
      strokeWidth={NAMED_RING_TRACK_WIDTH}
      testID={ringWholeArcTestID(arc.phase)}
    />
  ));

  const names = geometry.arcs.map((arc) => ({
    arc,
    ...phaseNameOnArc(arc, phaseName(arc.phase)),
  }));

  return (
    <View
      accessibilityLabel={ringSpokenLabel(day, cycleLengthDays, today)}
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
          <Defs>
            {names.map(({ arc }) => (
              <Path
                d={namePath(centre, NAMED_RING_RADIUS, arc)}
                id={namePathID(arc.phase)}
                key={namePathID(arc.phase)}
              />
            ))}
          </Defs>
          {arcs}
          {names
            .filter((name) => name.fit !== 'none')
            .map(({ arc, written }) => (
              <SvgText
                alignmentBaseline="central"
                fill={colour[phaseNameInk[arc.phase]]}
                fontFamily={fontNameFor('text', PHASE_NAME_ON_ARC_WEIGHT)}
                fontSize={PHASE_NAME_ON_ARC_POINTS}
                key={ringNameTestID(arc.phase)}
                letterSpacing={PHASE_NAME_ON_ARC_SPACING}
                testID={ringNameTestID(arc.phase)}
                textAnchor="middle"
              >
                <TextPath href={`#${namePathID(arc.phase)}`} startOffset="50%">
                  {written}
                </TextPath>
              </SvgText>
            ))}
        </Svg>
        <TodayPointerDrawing
          band={{ radius: NAMED_RING_RADIUS, width: NAMED_RING_TRACK_WIDTH }}
          centre={centre}
          degrees={geometry.beadDegrees}
          diameter={diameter}
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.middle}>
        <Text
          style={[styles.phase, { color: colour[phasePalette[geometry.phase].ink] }]}
          testID={ringCentrePhaseTestID}
        >
          {phaseFullName(geometry.phase)}
        </Text>
        <Text style={styles.dayAsTheSubject} testID={ringCentreDayTestID}>
          {ringDayNumberWords(day)}
        </Text>
        <Text style={styles.cycleLength} testID={ringCentreLengthTestID}>
          {ringAboutLengthWords(cycleLengthDays)}
        </Text>
      </View>
      {onPressArc === undefined ? null : (
        <Pressable
          onPress={(event) => {
            const arc = arcAtPoint(
              geometry,
              { centre, radius: NAMED_RING_RADIUS, reach: NAMED_RING_TRACK_WIDTH },
              { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
            );
            if (arc !== undefined) {
              onPressArc(arc);
            }
          }}
          style={StyleSheet.absoluteFill}
          testID={ringArcsPressTestID}
        />
      )}
    </View>
  );
}

/** Points. The small ring of the log board: its box, the radius of its arcs and their stroke. */
const SMALL_RING_DIAMETER = 64;
const SMALL_RING_RADIUS = 23;
const SMALL_RING_ARC_WIDTH = 6;
const SMALL_RING_TRACK_WIDTH = 14;

/** Degrees left open between two arcs, so the round ends of two phases do not run into one. */
const SMALL_RING_GAP_DEGREES = 3;

/** The small ring of the log: the four arcs whole, on a pale track, with the pointer and no words. */
function SmallRing({
  cycleLengthDays,
  day,
  phases,
}: Pick<Props, 'cycleLengthDays' | 'day' | 'phases'>): ReactNode {
  const geometry = ringGeometry({
    cycleLengthDays,
    day,
    phases,
    minimumSweepDegrees: namedArcFloors(),
  });
  const centre = { x: SMALL_RING_DIAMETER / 2, y: SMALL_RING_DIAMETER / 2 };

  return (
    <View
      accessibilityLabel={ringSpokenLabel(day, cycleLengthDays, phaseName(geometry.phase))}
      accessibilityRole="image"
      accessible
      style={[styles.ring, { height: SMALL_RING_DIAMETER, width: SMALL_RING_DIAMETER }]}
      testID={cycleRingTestID}
    >
      <Svg height={SMALL_RING_DIAMETER} width={SMALL_RING_DIAMETER}>
        <Circle
          cx={centre.x}
          cy={centre.y}
          fill="none"
          r={SMALL_RING_RADIUS}
          stroke={colour.card}
          strokeOpacity={0.6}
          strokeWidth={SMALL_RING_TRACK_WIDTH}
        />
        {geometry.arcs.map((arc) => (
          <Path
            d={arcPath(
              centre,
              SMALL_RING_RADIUS,
              arc.startDegrees + SMALL_RING_GAP_DEGREES / 2,
              Math.max(arc.sweepDegrees - SMALL_RING_GAP_DEGREES, 0),
            )}
            fill="none"
            key={ringWholeArcTestID(arc.phase)}
            stroke={colour[phasePalette[arc.phase].fill]}
            strokeLinecap="round"
            strokeWidth={SMALL_RING_ARC_WIDTH}
            testID={ringWholeArcTestID(arc.phase)}
          />
        ))}
      </Svg>
      <TodayPointerDrawing
        band={{ radius: SMALL_RING_RADIUS, width: SMALL_RING_TRACK_WIDTH }}
        centre={centre}
        degrees={geometry.beadDegrees}
        diameter={SMALL_RING_DIAMETER}
      />
    </View>
  );
}

interface PointerProps {
  readonly band: { readonly radius: number; readonly width: number };
  readonly centre: Point;
  readonly degrees: number;
  readonly diameter: number;
}

/**
 * The pointer that marks today, the same shape on every ring, scaled to the band it crosses. Its
 * head reaches past the box of the ring, so it is drawn on a larger sheet laid over the ring, in
 * the coordinates of the ring, and the ring keeps its own size in the layout.
 */
function TodayPointerDrawing({ band, centre, degrees, diameter }: PointerProps): ReactNode {
  const pointer = todayPointer(centre, band, degrees);
  const margin = Math.max(Math.ceil(pointer.reach - diameter / 2), 0);
  const sheet = diameter + 2 * margin;

  return (
    <View
      pointerEvents="none"
      style={{ height: sheet, left: -margin, position: 'absolute', top: -margin, width: sheet }}
      testID={ringPointerTestID}
    >
      <Svg height={sheet} viewBox={`${-margin} ${-margin} ${sheet} ${sheet}`} width={sheet}>
        <Line
          stroke={colour[todayPointerPalette.casing]}
          strokeLinecap="round"
          strokeWidth={pointer.casingWidth}
          testID={ringPointerCasingTestID}
          x1={pointer.stemFrom.x}
          x2={pointer.stemTo.x}
          y1={pointer.stemFrom.y}
          y2={pointer.stemTo.y}
        />
        <Line
          stroke={colour[todayPointerPalette.core]}
          strokeLinecap="round"
          strokeWidth={pointer.coreWidth}
          testID={ringPointerCoreTestID}
          x1={pointer.stemFrom.x}
          x2={pointer.stemTo.x}
          y1={pointer.stemFrom.y}
          y2={pointer.stemTo.y}
        />
        <Path
          d={pointer.head}
          fill={colour[todayPointerPalette.head]}
          stroke={colour[todayPointerPalette.headEdge]}
          strokeLinejoin="round"
          strokeWidth={pointer.edgeWidth}
          testID={ringPointerHeadTestID}
        />
      </Svg>
    </View>
  );
}

function namePathID(phase: PhaseName): string {
  return `phase-name-path-${phase}`;
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
  cycleLength: {
    color: colour.secondaryText,
    ...textStyle(CYCLE_LENGTH_ROLE),
  },
  day: {
    color: colour.text,
    ...textStyle(CYCLE_DAY_ROLE),
  },
  // Where the ring names the day rather than a phase, the day is what the ring is drawn to show, so
  // it takes the display size the design gives it.
  dayAsTheSubject: {
    color: colour.text,
    ...textStyle('display-lg'),
  },
  dayWord: {
    color: colour.secondaryText,
    ...textStyle(PHASE_NAME_ROLE),
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
  // one of them, so the ring writes it at the label size wherever it is drawn.
  phase: {
    ...textStyle(PHASE_NAME_ROLE),
    textTransform: 'uppercase',
  },
  ring: { alignItems: 'center', justifyContent: 'center' },
});
