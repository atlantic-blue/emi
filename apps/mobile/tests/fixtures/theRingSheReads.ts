import { FULL_TURN_DEGREES, type PhaseName, RING_TRACK_WIDTH, phaseNames } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { cycleRingTestID, ringArcTestID, ringBeadTestID } from '../../src/components/CycleRing';

import { textIn } from './renderedText';

/**
 * The ring as she sees it, read off the paint the renderer put on the glass.
 *
 * Everything here measures what is painted and never what was computed, so a reading cannot agree
 * with the arithmetic by being the same arithmetic twice. The scenario and the integration tests
 * both read the ring from here, which is why a round end is accounted for in one place: a round
 * end is painted half the width of the track past the point the path stops at, so a reader of the
 * path alone would answer that the ground between two phases is wider than she sees it.
 */

/** One arc of the track, as it was painted, in degrees clockwise from twelve o'clock. */
export interface DrawnArc {
  readonly phase: PhaseName;
  readonly startDegrees: number;
  readonly sweepDegrees: number;
}

/** The two strengths one phase is painted in, in the order the ring draws them. */
const theStrengths = ['elapsed', 'ahead'] as const;

interface Painted {
  readonly props: Record<string, unknown>;
}

/** The ring is square, so the canvas it was drawn on gives its centre and its radius. */
export function theRingCanvas(): { centre: number; radius: number } {
  const style = StyleSheet.flatten(screen.getByTestId(cycleRingTestID).props.style) ?? {};
  const diameter = Number((style as { height?: unknown }).height);

  return { centre: diameter / 2, radius: (diameter - RING_TRACK_WIDTH) / 2 };
}

/** Where a point on the drawing sits on the ring, clockwise from twelve o'clock. */
export function degreesAt(x: number, y: number): number {
  const { centre } = theRingCanvas();
  const turned = (Math.atan2(y - centre, x - centre) * 180) / Math.PI + 90;

  return (turned + FULL_TURN_DEGREES) % FULL_TURN_DEGREES;
}

/** The two ends of one drawn path, read off the `d` the renderer put on the glass. */
export function endsOf(path: string): { from: number; to: number } {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g) ?? [];

  if (numbers.length < 9) {
    throw new Error(`${JSON.stringify(path)} is not an arc this ring drew`);
  }

  return {
    from: degreesAt(Number(numbers[0]), Number(numbers[1])),
    to: degreesAt(Number(numbers[7]), Number(numbers[8])),
  };
}

/**
 * How far past its path one end of a stroke is painted. A round end reaches half the width of the
 * track, and a square end reaches nothing at all.
 */
function theReachOfTheEndsOf(stroke: Painted): number {
  if (stroke.props['strokeLinecap'] !== 'round') {
    return 0;
  }

  const width = Number(stroke.props['strokeWidth']);

  return ((width / 2 / theRingCanvas().radius) * FULL_TURN_DEGREES) / (2 * Math.PI);
}

/** Where one stroke is painted, which is its path plus whatever its two ends reach past it. */
function thePaintOf(stroke: Painted): { from: number; to: number } {
  const path = endsOf(String(stroke.props['d']));
  const reach = theReachOfTheEndsOf(stroke);

  return { from: path.from - reach, to: path.to + reach };
}

/** Every stroke the ring painted for one phase, which is one, two, or none at all. */
function theStrokesOf(phase: PhaseName): Painted[] {
  return theStrengths
    .map((strength) => screen.queryByTestId(ringArcTestID(phase, strength)))
    .filter((stroke) => stroke !== null)
    .map((stroke) => stroke as unknown as Painted);
}

/**
 * The arcs the ring actually painted. A phase paints the days she has lived, the days ahead of
 * her, or both, and the ground it leaves is what every one of them is painted between.
 */
export function theArcsOnTheRing(): DrawnArc[] {
  const drawn: DrawnArc[] = [];

  for (const phase of phaseNames) {
    const painted = theStrokesOf(phase).map(thePaintOf);

    if (painted.length === 0) {
      continue;
    }

    const from = Math.min(...painted.map((stroke) => stroke.from));
    const to = Math.max(...painted.map((stroke) => stroke.to));

    drawn.push({
      phase,
      startDegrees: from,
      sweepDegrees: (to - from + FULL_TURN_DEGREES) % FULL_TURN_DEGREES,
    });
  }

  return drawn.sort((one, other) => one.startDegrees - other.startDegrees);
}

/** The ground between one arc and the next, and between the last arc and the first. */
export function theGroundBetweenTheArcs(): number[] {
  const arcs = theArcsOnTheRing();

  return arcs.map((arc, at) => {
    const next = arcs[(at + 1) % arcs.length] as DrawnArc;
    const ends = arc.startDegrees + arc.sweepDegrees;

    return (next.startDegrees - ends + FULL_TURN_DEGREES) % FULL_TURN_DEGREES;
  });
}

/** How each end of every stroke of the ring is drawn, one answer for each stroke. */
export function theEndsOfTheArcs(): string[] {
  return phaseNames
    .flatMap(theStrokesOf)
    .map((stroke) => String(stroke.props['strokeLinecap'] ?? 'butt'));
}

/** Where the bead sits on the ring, read off the circle the renderer drew. */
export function theBeadDegrees(): number {
  const bead = screen.getByTestId(ringBeadTestID);

  return degreesAt(Number(bead.props.cx), Number(bead.props.cy));
}

/**
 * A colour the drawing was given, as the hex the token holds. The platform passes a colour down
 * as a packed integer, so a reader that compared the two directly would compare a number with a
 * name and never fail.
 */
export function theColourDrawn(given: unknown): string {
  const packed = (given as { payload?: unknown }).payload;

  if (typeof packed !== 'number') {
    throw new Error(`${JSON.stringify(given)} is not a colour the drawing was given`);
  }

  return `#${(packed & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;
}

/** The disc on today: what fills it, and the line drawn around it. */
export function theBeadSheSees(): { readonly fill: string; readonly line: string } {
  const bead = screen.getByTestId(ringBeadTestID);

  return { fill: theColourDrawn(bead.props.fill), line: theColourDrawn(bead.props.stroke) };
}

/** What the middle of the ring says, in the order she reads it down the middle. */
export function theMiddleOfTheRing(): string[] {
  return textIn(screen.getByTestId(cycleRingTestID));
}
