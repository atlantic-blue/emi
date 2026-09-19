import type { ColourName } from './colour';

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

/** Which pair each phase takes. Section 9.3 of the design measured every one of them. */
export const phasePalette: Readonly<Record<PhaseName, PhasePalette>> = {
  period: { fill: 'primaryContainer', ink: 'onPrimaryFixedVariant' },
  follicular: { fill: 'secondaryContainer', ink: 'onSecondaryContainer' },
  ovulation: { fill: 'primary', ink: 'onPrimaryFixedVariant' },
  luteal: { fill: 'tertiaryContainer', ink: 'onTertiaryFixedVariant' },
};

/** The name the ring writes inside the track, which is the cue colour cannot carry. */
export const phaseLabel: Readonly<Record<PhaseName, string>> = {
  period: 'Period',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
};

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
/** Today sits on the track as a filled bead of this radius, in points. */
export const BEAD_RADIUS = 9;
/** Ground drawn around the bead, in points, so it reads against whichever phase is behind it. */
export const BEAD_HALO_WIDTH = 2;

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
  /** Where today's bead sits, in degrees clockwise from the top. */
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
