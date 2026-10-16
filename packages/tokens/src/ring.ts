import type { ColourName } from './colour';
import type { TypeRoleName } from './type';

/**
 * The ring of design section 9.5. One continuous circular track, divided into four arcs sized by
 * the days of her own cycle, with a gap of ground at every boundary.
 *
 * The arithmetic lives here rather than in the screen that draws it, so the geometry can be
 * measured without rendering anything, and so the picture in brand/ring and the component on the
 * phone draw the same shapes from one source.
 */

/** The four phases of a cycle, in the order they run and the order the ring draws them. */
export type PhaseName = 'period' | 'follicular' | 'ovulation' | 'luteal';

/** The order the four phases run in, which is also the order they are drawn in. */
export const phaseNames: readonly PhaseName[] = ['period', 'follicular', 'ovulation', 'luteal'];

/** The pair a phase is drawn in: one colour for the arc, one for the words about it. */
export interface PhasePalette {
  /** The arc. Section 9.3 forbids this colour carrying text. */
  readonly fill: ColourName;
  /** The partner that carries the written phase name, measured above the contrast floor. */
  readonly ink: ColourName;
}

/**
 * Which pair each phase takes. Each phase has a fill and an ink of its own in the palette, so a
 * phase colour can no longer be mistaken for a button or a container.
 *
 * Measured against the canvas: the inks read at 11.94, 9.48, 9.95 and 11.21 to 1. On their own
 * fill they read at 4.24, 4.85, 4.13 and 3.47, and three of those are under the floor, so an ink
 * never carries a word on a fill. The one word a fill carries is its own phase name on the ring
 * of Today, in the colour `phaseNameInk` gives it, which contract SEE-2 measures.
 */
export const phasePalette: Readonly<Record<PhaseName, PhasePalette>> = {
  period: { fill: 'period', ink: 'periodInk' },
  follicular: { fill: 'follicular', ink: 'follicularInk' },
  ovulation: { fill: 'ovulation', ink: 'ovulationInk' },
  luteal: { fill: 'luteal', ink: 'lutealInk' },
};

/** The name the ring writes inside the track, which is the cue colour cannot carry. */
export const phaseLabel: Readonly<Record<PhaseName, string>> = {
  period: 'Period',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
};

/**
 * The role the written phase name takes. It is a label rather than a headline because contract
 * SCREEN-2 keeps the four words a stranger could read under 14 points, and the export writes it
 * uppercase at the label size inside the ring.
 */
export const PHASE_NAME_ROLE: TypeRoleName = 'label-sm';

/** The role the cycle day takes, which is the monospaced face the design system gives a figure. */
export const CYCLE_DAY_ROLE: TypeRoleName = 'data-lg';

/**
 * The role the length of the cycle takes, on the line under the day. It says what the figure above
 * it is counted out of, so it is read after the figure and never instead of it.
 */
export const CYCLE_LENGTH_ROLE: TypeRoleName = 'body-sm';

/** A whole turn of the ring, which the arcs and the gaps between them share. */
export const FULL_TURN_DEGREES = 360;

/**
 * The ground between two arcs. It is the cue that carries the boundary for a person who cannot
 * separate the four fills, which section 3 of the design measured, so it is never decoration.
 */
export const GAP_DEGREES = 3;

/** Days she has not reached yet, at a fifth of the strength of the days she has. */
export const DAYS_AHEAD_STRENGTH = 0.2;

/** Section 9.5. The ring moves once, when the screen opens, and never again. */
export const RING_OPEN_MILLISECONDS = 600;

/** How wide the ring is drawn, in points, on the phone and in the brand picture alike. */
export const RING_DIAMETER = 240;
/** How thick the track is, in points. The arcs and the ground between them share it. */
export const RING_TRACK_WIDTH = 16;
/**
 * The colours of the pointer that marks today, option C of the todayMarker board. A dark casing
 * with a white core crosses the band, and an accent head with a white edge points in at it from
 * outside. The casing and the core read against the pale arcs, and the white core and edge read
 * against the dark ones, so the pointer is seen on every phase colour.
 *
 * They are named here because the phone and the brand picture both draw this pointer, and a
 * colour written at each of the two places is a colour that can disagree with itself.
 */
export const todayPointerPalette: Readonly<
  Record<'casing' | 'core' | 'head' | 'headEdge', ColourName>
> = {
  casing: 'text',
  core: 'card',
  head: 'accent',
  headEdge: 'card',
};

/**
 * Points, at the band of the ring of Today, which is 26 points wide. A ring with another band
 * draws the same pointer scaled by its own band width, so it keeps the same shape.
 */
const POINTER_AT_BAND = 26;
/** The stem runs this far each side of the middle of the band, so it crosses the band whole. */
const POINTER_STEM_REACH = 14;
const POINTER_CASING_WIDTH = 7;
const POINTER_CORE_WIDTH = 3.5;
/** The tip of the head, out from the middle of the band. */
const POINTER_TIP_OUT = 17;
/** The base of the head, out from the middle of the band. */
const POINTER_BASE_OUT = 31;
/** Half the width of the base of the head. */
const POINTER_HALF_BASE = 7;
const POINTER_EDGE_WIDTH = 1.5;

/** The pointer that marks today, in the coordinates of the ring it is drawn on. */
export interface TodayPointer {
  /** The two ends of the stem, the inner first. */
  readonly stemFrom: Point;
  readonly stemTo: Point;
  readonly casingWidth: number;
  readonly coreWidth: number;
  /** The head, as the `d` of a closed path, its tip towards the band. */
  readonly head: string;
  readonly edgeWidth: number;
  /** How far the head reaches from the centre of the ring, edge included. */
  readonly reach: number;
}

/** Where the pointer sits on a ring whose band has this middle radius and this width. */
export function todayPointer(
  centre: Point,
  band: { readonly radius: number; readonly width: number },
  degrees: number,
): TodayPointer {
  const scale = band.width / POINTER_AT_BAND;
  const at = (out: number, aside = 0): Point => {
    const middle = pointOnRing(centre, band.radius + out * scale, degrees);
    const across = ((degrees - 90) * Math.PI) / 180 + Math.PI / 2;
    return {
      x: middle.x + aside * scale * Math.cos(across),
      y: middle.y + aside * scale * Math.sin(across),
    };
  };
  const tip = at(POINTER_TIP_OUT);
  const left = at(POINTER_BASE_OUT, -POINTER_HALF_BASE);
  const right = at(POINTER_BASE_OUT, POINTER_HALF_BASE);
  const point = (p: Point): string => `${round(p.x)} ${round(p.y)}`;

  return {
    stemFrom: at(-POINTER_STEM_REACH),
    stemTo: at(POINTER_STEM_REACH),
    casingWidth: POINTER_CASING_WIDTH * scale,
    coreWidth: POINTER_CORE_WIDTH * scale,
    head: `M ${point(tip)} L ${point(left)} L ${point(right)} Z`,
    edgeWidth: POINTER_EDGE_WIDTH * scale,
    reach:
      band.radius + Math.hypot(POINTER_BASE_OUT, POINTER_HALF_BASE) * scale + POINTER_EDGE_WIDTH,
  };
}

/** How long one phase runs in the cycle being drawn, in whole days. */
export interface PhaseSpan {
  readonly phase: PhaseName;
  readonly days: number;
}

/** Why the ring refused to draw. Each one names a cycle that cannot be a cycle. */
export type RingRefusal =
  | 'the-phases-are-not-the-four-phases-in-order'
  | 'a-phase-runs-for-a-part-day-or-fewer-than-none'
  | 'the-phases-do-not-add-up-to-the-cycle'
  | 'the-cycle-has-no-days'
  | 'the-day-is-outside-the-cycle';

/** What ringGeometry throws. The refusal is the machine readable half of the message. */
export class RingError extends Error {
  readonly refusal: RingRefusal;

  constructor(refusal: RingRefusal, message: string) {
    super(message);
    this.name = 'RingError';
    this.refusal = refusal;
  }
}

/** One phase as the ring draws it: where it starts, how far it sweeps, and how much she reached. */
export interface RingArc {
  readonly phase: PhaseName;
  readonly days: number;
  /** The first cycle day this arc covers, counting from one. */
  readonly firstDay: number;
  /** Degrees clockwise from the top of the ring, where the cycle begins. */
  readonly startDegrees: number;
  readonly sweepDegrees: number;
  /** The days of this arc she has reached, today included. */
  readonly elapsedDays: number;
  /** How much of the sweep is drawn at full strength. The rest is drawn at a fifth. */
  readonly elapsedDegrees: number;
}

/** Everything a screen needs to draw the ring, with no arithmetic left to do. */
export interface RingGeometry {
  readonly cycleLengthDays: number;
  readonly day: number;
  /** The phase today sits in, which the ring also writes in words inside the track. */
  readonly phase: PhaseName;
  /** One arc for each phase that runs for a day or more. A phase of no days draws nothing. */
  readonly arcs: readonly RingArc[];
  readonly gapDegrees: number;
  readonly gapCount: number;
  /** Where today's marker sits, in degrees clockwise from the top. */
  readonly beadDegrees: number;
}

/** One cycle, as the ring is asked to draw it. */
export interface RingInput {
  readonly cycleLengthDays: number;
  /** The day she is on, counting from one. */
  readonly day: number;
  readonly phases: readonly PhaseSpan[];
}

function readPhases(phases: readonly PhaseSpan[]): readonly PhaseSpan[] {
  const named = phases.map((span) => span.phase);

  if (named.length !== phaseNames.length || named.some((name, at) => name !== phaseNames[at])) {
    throw new RingError(
      'the-phases-are-not-the-four-phases-in-order',
      `the ring is drawn from ${phaseNames.join(', ')}, and it was given ${named.join(', ') || 'nothing'}`,
    );
  }

  for (const span of phases) {
    if (!Number.isInteger(span.days) || span.days < 0) {
      throw new RingError(
        'a-phase-runs-for-a-part-day-or-fewer-than-none',
        `${span.phase} runs for ${span.days} days, and a phase runs for a whole number of days or none`,
      );
    }
  }

  return phases;
}

/**
 * The ring, measured rather than drawn. It refuses a cycle it cannot draw honestly: phases that are
 * not the four in order, a part day, days that do not add up to the cycle, or a day outside it.
 */
export function ringGeometry({ cycleLengthDays, day, phases }: RingInput): RingGeometry {
  const spans = readPhases(phases);
  const counted = spans.reduce((total, span) => total + span.days, 0);

  if (cycleLengthDays < 1) {
    throw new RingError(
      'the-cycle-has-no-days',
      `a cycle of ${cycleLengthDays} days has nothing to draw`,
    );
  }
  if (counted !== cycleLengthDays) {
    throw new RingError(
      'the-phases-do-not-add-up-to-the-cycle',
      `the four phases run for ${counted} days and the cycle runs for ${cycleLengthDays}`,
    );
  }
  if (!Number.isInteger(day) || day < 1 || day > cycleLengthDays) {
    throw new RingError(
      'the-day-is-outside-the-cycle',
      `day ${day} is outside a cycle of ${cycleLengthDays} days`,
    );
  }

  const drawn = spans.filter((span) => span.days > 0);
  // A single arc has no neighbour, so it has no boundary to carry and it takes the whole turn.
  const gapCount = drawn.length > 1 ? drawn.length : 0;
  const forArcs = FULL_TURN_DEGREES - gapCount * GAP_DEGREES;

  const arcs: RingArc[] = [];
  let firstDay = 1;
  let cursor = 0;

  for (const span of drawn) {
    const sweepDegrees = (forArcs * span.days) / cycleLengthDays;
    const reached = day - firstDay + 1;
    const elapsedDays = Math.min(Math.max(reached, 0), span.days);

    arcs.push({
      phase: span.phase,
      days: span.days,
      firstDay,
      startDegrees: cursor,
      sweepDegrees,
      elapsedDays,
      elapsedDegrees: (sweepDegrees * elapsedDays) / span.days,
    });

    firstDay += span.days;
    cursor += sweepDegrees + (gapCount > 0 ? GAP_DEGREES : 0);
  }

  const today = arcs.find((arc) => day >= arc.firstDay && day < arc.firstDay + arc.days);

  if (today === undefined) {
    throw new RingError(
      'the-day-is-outside-the-cycle',
      `day ${day} falls in no phase of a cycle of ${cycleLengthDays} days`,
    );
  }

  return {
    cycleLengthDays,
    day,
    phase: today.phase,
    arcs,
    gapDegrees: GAP_DEGREES,
    gapCount,
    // The bead sits in the middle of its own day rather than on the boundary in front of it, so
    // day one and the last day both sit inside the track.
    beadDegrees:
      today.startDegrees + ((day - today.firstDay + 0.5) / today.days) * today.sweepDegrees,
  };
}

/** The two strengths one phase is painted in: the days she has lived, and the days ahead of her. */
export type ArcStrength = 'elapsed' | 'ahead';

/** One stroke of the track, as the renderer is asked to draw it. */
export interface PaintedArc {
  readonly phase: PhaseName;
  readonly strength: ArcStrength;
  /** Where the path starts, which is pulled in from the arc by the reach of a round end. */
  readonly startDegrees: number;
  readonly sweepDegrees: number;
  /** Whether the two ends are drawn round. A stroke with no room for two keeps them square. */
  readonly roundEnds: boolean;
}

/**
 * How far past its path a round end is painted, as an angle of the ring it is drawn on. A round
 * end is a half disc of half the track width, so it reaches that far along the track.
 */
export function roundEndDegrees(radius: number, trackWidth = RING_TRACK_WIDTH): number {
  return ((trackWidth / 2 / radius) * FULL_TURN_DEGREES) / (2 * Math.PI);
}

/**
 * One stroke, pulled in so that what is painted covers the degrees it stands for and no more.
 *
 * Two round ends across a gap of 3 degrees reach 16 points into 5.9 points of ground, which
 * closes the boundary contract SEE-1 holds the ring to. Pulling the path in by the reach of its
 * own end puts the ground back, and a stroke too short to carry two round ends keeps square ones
 * rather than painting itself wider than the day it stands for.
 */
function pulledIn(
  startDegrees: number,
  sweepDegrees: number,
  reach: number,
): Pick<PaintedArc, 'startDegrees' | 'sweepDegrees' | 'roundEnds'> {
  if (sweepDegrees <= reach * 2) {
    return { startDegrees, sweepDegrees, roundEnds: false };
  }

  return {
    startDegrees: startDegrees + reach,
    sweepDegrees: sweepDegrees - reach * 2,
    roundEnds: true,
  };
}

/**
 * The strokes one ring is painted with, in the order they are drawn.
 *
 * A phase with days ahead of her is painted once across the whole arc at a fifth, and the days
 * she has lived are painted over it at full strength. The two therefore never meet as two round
 * ends in the middle of a phase, which would open a notch there and read as a boundary that her
 * cycle does not have.
 */
export function paintedArcs(
  geometry: RingGeometry,
  radius: number,
  trackWidth = RING_TRACK_WIDTH,
): PaintedArc[] {
  const reach = roundEndDegrees(radius, trackWidth);
  const painted: PaintedArc[] = [];

  for (const arc of geometry.arcs) {
    if (arc.sweepDegrees - arc.elapsedDegrees > 0) {
      painted.push({
        phase: arc.phase,
        strength: 'ahead',
        ...pulledIn(arc.startDegrees, arc.sweepDegrees, reach),
      });
    }
    if (arc.elapsedDegrees > 0) {
      painted.push({
        phase: arc.phase,
        strength: 'elapsed',
        ...pulledIn(arc.startDegrees, arc.elapsedDegrees, reach),
      });
    }
  }

  return painted;
}

/** Every degree the ring covers: the arcs it draws plus the ground it leaves between them. */
export function coveredDegrees(geometry: RingGeometry): number {
  const arcs = geometry.arcs.reduce((total, arc) => total + arc.sweepDegrees, 0);

  return arcs + geometry.gapCount * geometry.gapDegrees;
}

/** A place on the canvas the ring is drawn on, in points from its top left corner. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Degrees run clockwise from the top, because the cycle starts at twelve o'clock. */
export function pointOnRing(centre: Point, radius: number, degrees: number): Point {
  const turned = ((degrees - 90) * Math.PI) / 180;

  return {
    x: centre.x + radius * Math.cos(turned),
    y: centre.y + radius * Math.sin(turned),
  };
}

/**
 * One arc of the track, as the `d` of a path. A sweep of a whole turn is drawn as two halves,
 * because an arc that ends where it starts draws nothing at all.
 */
export function arcPath(
  centre: Point,
  radius: number,
  startDegrees: number,
  sweepDegrees: number,
): string {
  if (sweepDegrees <= 0) {
    return '';
  }
  if (sweepDegrees >= FULL_TURN_DEGREES) {
    const half = FULL_TURN_DEGREES / 2;

    return [
      arcPath(centre, radius, startDegrees, half),
      arcPath(centre, radius, startDegrees + half, half),
    ].join(' ');
  }

  const from = pointOnRing(centre, radius, startDegrees);
  const to = pointOnRing(centre, radius, startDegrees + sweepDegrees);
  const overHalf = sweepDegrees > FULL_TURN_DEGREES / 2 ? 1 : 0;

  return `M ${round(from.x)} ${round(from.y)} A ${round(radius)} ${round(radius)} 0 ${overHalf} 1 ${round(to.x)} ${round(to.y)}`;
}

/** Enough places for a drawing measured in points, and few enough that two runs read the same. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * The colour each phase name is written in on its own arc, on the ring of Today. Contract SEE-2
 * holds each pair at or above the contrast floor: the white reads at 5.32 to 1 on the period
 * arc, and the text colour at 11.66, 7.10 and 4.83 on the other three.
 */
export const phaseNameInk: Readonly<Record<PhaseName, ColourName>> = {
  period: 'onAccent',
  follicular: 'text',
  ovulation: 'text',
  luteal: 'text',
};

/** The ring of Today, which writes the four names inside a thicker band. */
export const NAMED_RING_DIAMETER = 290;
/** The middle of the band, measured from the centre of the ring. */
export const NAMED_RING_RADIUS = 120;
/** Points. The width of the band the four names are written inside. */
export const NAMED_RING_TRACK_WIDTH = 26;
/** The size, the spacing and the weight of a phase name written along its arc. */
export const PHASE_NAME_ON_ARC_POINTS = 11;
/** Points between the letters of a phase name on its arc. */
export const PHASE_NAME_ON_ARC_SPACING = 1.1;
/** The weight of the face a phase name on its arc is written in. */
export const PHASE_NAME_ON_ARC_WEIGHT = 800;

/**
 * The width of one capital, as a share of the size. The widest capitals of the face at its
 * heaviest weight are under this share, so a name measured with it is never wider than drawn.
 */
export const CAPITAL_WIDTH_SHARE = 0.75;

/** Points left clear at each end of an arc, so a name never runs into the gap beside it. */
export const PHASE_NAME_END_ROOM = 6;

/** How a phase name is written on its arc: in full, as its first letter, or not at all. */
export type PhaseNameFit = 'name' | 'initial' | 'none';

/** The width a run of capitals takes along the band, in points. */
export function capitalsWidth(written: string): number {
  const letters = [...written].length;

  return (
    letters * PHASE_NAME_ON_ARC_POINTS * CAPITAL_WIDTH_SHARE +
    Math.max(0, letters - 1) * PHASE_NAME_ON_ARC_SPACING
  );
}

/** The length of the middle of one arc, less the room at its two ends, in points. */
export function roomAlongArc(arc: RingArc, radius = NAMED_RING_RADIUS): number {
  const length = (radius * arc.sweepDegrees * Math.PI) / (FULL_TURN_DEGREES / 2);

  return length - 2 * PHASE_NAME_END_ROOM;
}

/**
 * What is written on one arc. The whole name where it fits. Where it does not, the first letter,
 * so a short phase still carries a label. Where even one letter does not fit, nothing: the middle
 * of the ring and its spoken label still name the phase she is in.
 */
export function phaseNameOnArc(
  arc: RingArc,
  name: string,
  radius = NAMED_RING_RADIUS,
): { readonly fit: PhaseNameFit; readonly written: string } {
  const capitals = name.toLocaleUpperCase();
  const room = roomAlongArc(arc, radius);

  if (capitalsWidth(capitals) <= room) {
    return { fit: 'name', written: capitals };
  }

  const initial = [...capitals][0] ?? '';

  return capitalsWidth(initial) <= room && initial !== ''
    ? { fit: 'initial', written: initial }
    : { fit: 'none', written: '' };
}

/**
 * The path a name is written along. An arc in the lower half of the ring is followed backwards,
 * so the name reads left to right and the right way up wherever it sits.
 */
export function namePath(centre: Point, radius: number, arc: RingArc): string {
  const middle = arc.startDegrees + arc.sweepDegrees / 2;
  const from = pointOnRing(centre, radius, arc.startDegrees);
  const to = pointOnRing(centre, radius, arc.startDegrees + arc.sweepDegrees);
  const overHalf = arc.sweepDegrees > FULL_TURN_DEGREES / 2 ? 1 : 0;
  const isInTheLowerHalf = middle > 90 && middle < 270;
  const [start, end] = isInTheLowerHalf ? [to, from] : [from, to];
  const clockwise = isInTheLowerHalf ? 0 : 1;

  return `M ${round(start.x)} ${round(start.y)} A ${round(radius)} ${round(radius)} 0 ${overHalf} ${clockwise} ${round(end.x)} ${round(end.y)}`;
}
