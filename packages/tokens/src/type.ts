/**
 * The three faces of the design system, and the thirteen roles it names for them. The roles keep
 * the names the design system gives them, so a reader can hold the two open side by side and a test
 * can read one against the other.
 *
 * The design system is `docs/design/prototype-design-system.md`.
 */
export type FaceName = 'display' | 'text' | 'data';

/**
 * One family for each job. A serif carries the editorial voice, a geometric sans carries what she
 * reads at length, and monospaced figures hold their place as a number changes.
 */
export const face: Readonly<Record<FaceName, string>> = {
  display: 'Newsreader',
  text: 'Plus Jakarta Sans',
  data: 'JetBrains Mono',
};

/** The three weights the design system asks for. Every one of them has a file in this repository. */
export type TypeWeight = 400 | 500 | 600;

/** The thirteen roles the design system names, in its own words. */
export type TypeRoleName =
  | 'display-lg'
  | 'display-lg-mobile'
  | 'headline-lg'
  | 'headline-md'
  | 'headline-sm'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'label-md'
  | 'label-sm'
  | 'data-lg'
  | 'data-md'
  | 'data-sm';

/**
 * A role never travels without its line height, its tracking and its weight, because each of those
 * chosen at the call site is one that drifts.
 */
export interface TypeRole {
  readonly face: FaceName;
  /** Points. */
  readonly size: number;
  /** Points. */
  readonly lineHeight: number;
  /** The design system measures tracking in em, which is a multiple of the size. */
  readonly letterSpacingEm: number;
  readonly weight: TypeWeight;
}

/**
 * The thirteen roles, copied from the design system's own front matter. A role that drifts from it
 * fails `packages/tokens/tests/designSystem.test.ts`, which reads the document. The document
 * measures in rem for a browser and a screen measures in points, so every size here is its rem at
 * sixteen points.
 */
export const typeScale: Readonly<Record<TypeRoleName, TypeRole>> = {
  'display-lg': { face: 'display', size: 48, lineHeight: 56, letterSpacingEm: -0.02, weight: 400 },
  'display-lg-mobile': {
    face: 'display',
    size: 36,
    lineHeight: 44,
    letterSpacingEm: -0.015,
    weight: 400,
  },
  'headline-lg': { face: 'display', size: 32, lineHeight: 40, letterSpacingEm: -0.01, weight: 400 },
  'headline-md': { face: 'display', size: 24, lineHeight: 32, letterSpacingEm: 0, weight: 500 },
  'headline-sm': { face: 'display', size: 20, lineHeight: 28, letterSpacingEm: 0, weight: 500 },
  'body-lg': { face: 'text', size: 18, lineHeight: 28, letterSpacingEm: 0, weight: 400 },
  'body-md': { face: 'text', size: 16, lineHeight: 24, letterSpacingEm: 0, weight: 400 },
  'body-sm': { face: 'text', size: 14, lineHeight: 20, letterSpacingEm: 0, weight: 400 },
  'label-md': { face: 'text', size: 14, lineHeight: 20, letterSpacingEm: 0.01, weight: 600 },
  'label-sm': { face: 'text', size: 12, lineHeight: 16, letterSpacingEm: 0.02, weight: 600 },
  'data-lg': { face: 'data', size: 28, lineHeight: 36, letterSpacingEm: -0.03, weight: 500 },
  'data-md': { face: 'data', size: 16, lineHeight: 24, letterSpacingEm: -0.02, weight: 400 },
  'data-sm': { face: 'data', size: 12, lineHeight: 16, letterSpacingEm: 0.02, weight: 500 },
};

/** The roles as data, in the order the design system prints them. */
export const typeRoleNames: readonly TypeRoleName[] = [
  'display-lg',
  'display-lg-mobile',
  'headline-lg',
  'headline-md',
  'headline-sm',
  'body-lg',
  'body-md',
  'body-sm',
  'label-md',
  'label-sm',
  'data-lg',
  'data-md',
  'data-sm',
];

/**
 * A multiple of the size. Under this a line sits too close to the one beneath it, and the running
 * text is where it is felt first. Contract TOKEN-3 fixes the number.
 */
export const LINE_HEIGHT_FLOOR = 1.2;

/**
 * The one role that sits under the floor, written out rather than allowed as a class.
 *
 * `display-lg` is 48 points over 56, which is 1.167. The design system front matter is read from
 * the prototype and is the one place a value is written, and contract TOKEN-3 fixes the floor at
 * 1.2, so the two disagree and neither side is this step's to move. The same disagreement is in the
 * original design, where the display role is 34 over 40, which is 1.176.
 *
 * It is recorded here one role at a time, the way the corners are recorded in
 * `tools/pipeline/prototype.ts`, so a move on either side reddens the check that reads them. The
 * decision is the operator's.
 */
export const lineHeightsNobodyHasDecided: readonly TypeRoleName[] = ['display-lg'];

/**
 * React Native measures letter spacing in points and the design system measures it in em, which is
 * a multiple of the size. Two decimal places, because a third is below what a screen can draw.
 */
export function letterSpacingOf(size: number, em: number): number {
  return Math.round(size * em * 100) / 100;
}
