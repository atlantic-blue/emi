import type { ColourName } from './colour';
import type { PhaseName } from './ring';

/**
 * The wash: the soft gradient across the top of every screen, tinted by the phase of today.
 *
 * It is the quietest cue Emi has. It carries no word, so a stranger at arm's length reads warmth
 * and nothing else, which is the first principle of the design working in her favour.
 *
 * The shape lives here with the colours, the way the ring's arithmetic lives beside its palette, so
 * a wash can be measured without drawing it and the component that draws it holds no number of its
 * own. Every value below is read off the fifty two screens of the prototype rather than chosen.
 */

/** The four washes the design document names. */
export type WashName = 'soft' | 'period' | 'ovulation' | 'luteal';

/** The four washes as data, in the order the design document lists them. */
export const washNames: readonly WashName[] = ['soft', 'period', 'ovulation', 'luteal'];

/**
 * One of the two tints a wash carries: an ellipse reaching in from a corner and fading to nothing.
 *
 * The prototype writes its size and its centre as a share of the wash it fills rather than in
 * pixels, so they stay shares here and a wash drawn at any height keeps the shape it was drawn at.
 */
export interface WashTint {
  readonly colour: ColourName;
  /** How wide the ellipse is, as a percentage of the width of the wash. */
  readonly widthPercent: number;
  /** How tall it is, as a percentage of the height of the wash. */
  readonly heightPercent: number;
  /** Where its centre sits, as a percentage across the wash. */
  readonly acrossPercent: number;
  /** Where its centre sits, as a percentage down the wash. */
  readonly downPercent: number;
  /**
   * How far along its own radius it has faded to nothing. Past this it is transparent, so the tint
   * leaves no edge anywhere on the screen.
   */
  readonly fadedByPercent: number;
}

/** One wash: two tints over a field that falls to the ground the rest of the screen sits on. */
export interface Wash {
  /** The two tints, in the order the prototype stacks them, the topmost one first. */
  readonly tints: readonly [WashTint, WashTint];
  /** The top of the field the tints sit on. */
  readonly from: ColourName;
  /** What it reaches at the bottom, which is the ground the rest of the screen sits on. */
  readonly to: ColourName;
}

/**
 * The shape of the wash on the thirty seven screens that name no phase. It differs from the one
 * below, so the neutral wash is a shape as well as a set of colours.
 */
const soft = [
  { widthPercent: 110, heightPercent: 70, acrossPercent: 90, downPercent: 0, fadedByPercent: 60 },
  { widthPercent: 90, heightPercent: 60, acrossPercent: 0, downPercent: 0, fadedByPercent: 70 },
] as const;

/** The shape the fourteen screens that paint a tint all share, whichever phase they are in. */
const tinted = [
  { widthPercent: 120, heightPercent: 70, acrossPercent: 85, downPercent: 0, fadedByPercent: 60 },
  { widthPercent: 90, heightPercent: 60, acrossPercent: 0, downPercent: 10, fadedByPercent: 70 },
] as const;

/**
 * The four washes, each one the colours the design document names for it, in the order the document
 * lists them. `tests/designSystem.test.ts` reads this against that document, so a stop that drifts
 * from it fails the run.
 */
export const washes: Readonly<Record<WashName, Wash>> = {
  /** Every screen that knows no phase, which is most of them. */
  soft: {
    tints: [
      { ...soft[0], colour: 'washWarm' },
      { ...soft[1], colour: 'accentSoft' },
    ],
    from: 'field',
    to: 'ground',
  },
  /** The days she bleeds. */
  period: {
    tints: [
      { ...tinted[0], colour: 'washAmber' },
      { ...tinted[1], colour: 'accentSoft' },
    ],
    from: 'accentSoft',
    to: 'ground',
  },
  /** The days around ovulation. */
  ovulation: {
    tints: [
      { ...tinted[0], colour: 'washAmber' },
      { ...tinted[1], colour: 'washWarm' },
    ],
    from: 'washWarm',
    to: 'ground',
  },
  /** The luteal days. */
  luteal: {
    tints: [
      { ...tinted[0], colour: 'accentSoft' },
      { ...tinted[1], colour: 'washRose' },
    ],
    from: 'washBlush',
    to: 'ground',
  },
};

/**
 * Which wash each phase takes. No screen of the prototype shows a follicular day, so nothing pins
 * a wash of its own to it, and it takes the neutral one every screen with no phase takes.
 */
export const washOfPhase: Readonly<Record<PhaseName, WashName>> = {
  period: 'period',
  follicular: 'soft',
  ovulation: 'ovulation',
  luteal: 'luteal',
};

/** The wash of the phase she is in, or the soft one where there is no cycle to read a phase from. */
export function washFor(phase?: PhaseName): Wash {
  return washes[phase === undefined ? 'soft' : washOfPhase[phase]];
}

/**
 * The four colours a wash runs through, in the order the design document lists them: the two tints,
 * the top of the field, then the ground.
 */
export function washStops(wash: Wash): readonly ColourName[] {
  return [wash.tints[0].colour, wash.tints[1].colour, wash.from, wash.to];
}

/**
 * How tall the wash is drawn, in points. The four home screens of the prototype all paint it at
 * this height; a screen that wants another passes its own, because the prototype paints ten.
 */
export const WASH_HEIGHT = 460;
