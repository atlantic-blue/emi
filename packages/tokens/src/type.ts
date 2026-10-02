/**
 * The three faces of the design system, and the fifteen roles it names for them. The roles keep
 * the names the design system gives them, so a reader can hold the two open side by side and a test
 * can read one against the other.
 *
 * The design system is `docs/design/prototype-design-system.md`.
 */
export type FaceName = 'display' | 'text' | 'data';

/**
 * One face carries every word, and monospaced figures hold their place as a number changes. The
 * display face and the text face are the same family at different weights, so the two names stay
 * and the call sites that read them do not move.
 */
export const face: Readonly<Record<FaceName, string>> = {
  display: 'Figtree',
  text: 'Figtree',
  data: 'JetBrains Mono',
};

/** The weights the design system asks for. Every one of them has a file in this repository. */
export type TypeWeight = 400 | 500 | 600 | 700 | 800;

/** The fifteen roles the design system names, in its own words. */
export type TypeRoleName =
  | 'display-lg'
  | 'display-lg-mobile'
  | 'headline-lg'
  | 'headline-md'
  | 'headline-sm'
  | 'body-lg'
  | 'body-sm'
  | 'button-lg'
  | 'button-md'
  | 'choice-lg'
  | 'choice-sm'
  | 'label-md'
  | 'label-sm'
  | 'data-lg'
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
 * The fifteen roles, copied from the design system's own front matter. A role that drifts from it
 * fails `packages/tokens/tests/designSystem.test.ts`, which reads the document. The document and
 * a screen both measure in px, so a size here is the size the document writes.
 */
export const typeScale: Readonly<Record<TypeRoleName, TypeRole>> = {
  'display-lg': { face: 'display', size: 50, lineHeight: 60, letterSpacingEm: -0.02, weight: 800 },
  'display-lg-mobile': {
    face: 'display',
    size: 34,
    lineHeight: 42,
    letterSpacingEm: -0.02,
    weight: 800,
  },
  'headline-lg': { face: 'display', size: 28, lineHeight: 34, letterSpacingEm: -0.02, weight: 800 },
  'headline-md': { face: 'display', size: 22, lineHeight: 28, letterSpacingEm: -0.01, weight: 800 },
  'headline-sm': { face: 'display', size: 18, lineHeight: 24, letterSpacingEm: 0, weight: 800 },
  'body-lg': { face: 'text', size: 16, lineHeight: 24, letterSpacingEm: 0, weight: 400 },
  'body-sm': { face: 'text', size: 14, lineHeight: 20, letterSpacingEm: 0, weight: 400 },
  'button-lg': { face: 'text', size: 16, lineHeight: 22, letterSpacingEm: 0, weight: 700 },
  'button-md': { face: 'text', size: 15, lineHeight: 21, letterSpacingEm: 0, weight: 700 },
  'choice-lg': { face: 'text', size: 15, lineHeight: 21, letterSpacingEm: 0, weight: 600 },
  'choice-sm': { face: 'text', size: 14, lineHeight: 20, letterSpacingEm: 0, weight: 700 },
  'label-md': { face: 'text', size: 13, lineHeight: 18, letterSpacingEm: 0, weight: 700 },
  'label-sm': { face: 'text', size: 11, lineHeight: 15, letterSpacingEm: 0.02, weight: 600 },
  'data-lg': { face: 'data', size: 24, lineHeight: 30, letterSpacingEm: -0.02, weight: 500 },
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
  'body-sm',
  'button-lg',
  'button-md',
  'choice-lg',
  'choice-sm',
  'label-md',
  'label-sm',
  'data-lg',
  'data-sm',
];

/**
 * A multiple of the size. Under this a line sits too close to the one beneath it, and the running
 * text is where it is felt first. Contract TOKEN-3 fixes the number.
 */
export const LINE_HEIGHT_FLOOR = 1.2;

/**
 * A role that sits under the floor, recorded one role at a time rather than allowed as a class, the
 * way the corners are recorded in `tools/pipeline/prototype.ts`, so a move on either side reddens
 * the check that reads them.
 *
 * Nothing is under the floor. The redesign draws the cycle day at a line height of one, which is
 * what a single line in the middle of a ring needs, and contract TOKEN-3 holds every role at 1.2 of
 * its size, so the role carries the floor and the ring draws one line inside it.
 */
export const lineHeightsNobodyHasDecided: readonly TypeRoleName[] = [];

/**
 * React Native measures letter spacing in points and the design system measures it in em, which is
 * a multiple of the size. Two decimal places, because a third is below what a screen can draw.
 */
export function letterSpacingOf(size: number, em: number): number {
  return Math.round(size * em * 100) / 100;
}
