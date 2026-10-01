import type { ColourName } from './colour';
import type { PhaseName } from './ring';

/**
 * The wash: the soft gradient across the top of every screen, tinted by the phase of today.
 *
 * Nothing is decided here yet. The four washes, their stops and their shape are what the step
 * builds; this is the surface the tests of it are written against.
 */

/** The four washes the design document names. */
export type WashName = 'soft' | 'period' | 'ovulation' | 'luteal';

/** The four washes as data, in the order the design document lists them. */
export const washNames: readonly WashName[] = ['soft', 'period', 'ovulation', 'luteal'];

/** One of the two tints a wash carries: an ellipse reaching in from a corner, fading to nothing. */
export interface WashTint {
  readonly colour: ColourName;
  readonly widthPercent: number;
  readonly heightPercent: number;
  readonly acrossPercent: number;
  readonly downPercent: number;
  readonly fadedByPercent: number;
}

/** One wash: two tints over a field that falls to the ground the rest of the screen sits on. */
export interface Wash {
  readonly tints: readonly [WashTint, WashTint];
  readonly from: ColourName;
  readonly to: ColourName;
}

const nothing: WashTint = {
  colour: 'ground',
  widthPercent: 0,
  heightPercent: 0,
  acrossPercent: 0,
  downPercent: 0,
  fadedByPercent: 0,
};

const undecided: Wash = { tints: [nothing, nothing], from: 'ground', to: 'ground' };

/** The four washes. None of them carries its colours yet. */
export const washes: Readonly<Record<WashName, Wash>> = {
  soft: undecided,
  period: undecided,
  ovulation: undecided,
  luteal: undecided,
};

/** Which wash each phase takes. */
export const washOfPhase: Readonly<Record<PhaseName, WashName>> = {
  period: 'soft',
  follicular: 'soft',
  ovulation: 'soft',
  luteal: 'soft',
};

/** The wash of the phase she is in, or the soft one where there is no cycle to read a phase from. */
export function washFor(phase?: PhaseName): Wash {
  return washes[phase === undefined ? 'soft' : washOfPhase[phase]];
}

/** The four colours a wash runs through, in the order the design document lists them. */
export function washStops(_wash: Wash): readonly ColourName[] {
  return [];
}

/** How tall the wash is drawn, in points. */
export const WASH_HEIGHT = 0;
