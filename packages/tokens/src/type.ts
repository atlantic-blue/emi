/**
 * One face, and the eleven roles the design system names for it. The roles keep the names the
 * design system gives them, so a reader can hold the two open side by side and a test can read one
 * against the other.
 *
 * The design system is `docs/design/warm-humanist-editorial/design-system.md`, the style this
 * package still holds.
 */
export type FaceName = 'text';

/** One family. A screen has no second face to reach for, which is the whole of step 9.1. */
export const face: Readonly<Record<FaceName, string>> = {
  text: 'Plus Jakarta Sans',
};

/** The four weights the design system asks for. Two of them have a file in this repository. */
export type TypeWeight = 400 | 500 | 600 | 700;

/** The eleven roles the design system names, in its own words. */
export type TypeRoleName =
  | 'headline-xl'
  | 'headline-xl-mobile'
  | 'headline-lg'
  | 'headline-md'
  | 'headline-sm'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'label-lg'
  | 'label-md'
  | 'label-sm';

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
 * The eleven roles, copied from the design system's own table. A role that drifts from it fails
 * `packages/tokens/tests/designSystem.test.ts`, which reads the document.
 */
export const typeScale: Readonly<Record<TypeRoleName, TypeRole>> = {
  'headline-xl': { face: 'text', size: 36, lineHeight: 44, letterSpacingEm: -0.03, weight: 700 },
  'headline-xl-mobile': {
    face: 'text',
    size: 30,
    lineHeight: 38,
    letterSpacingEm: -0.025,
    weight: 700,
  },
  'headline-lg': { face: 'text', size: 26, lineHeight: 34, letterSpacingEm: -0.02, weight: 600 },
  'headline-md': { face: 'text', size: 20, lineHeight: 28, letterSpacingEm: -0.015, weight: 600 },
  'headline-sm': { face: 'text', size: 18, lineHeight: 24, letterSpacingEm: -0.01, weight: 600 },
  'body-lg': { face: 'text', size: 17, lineHeight: 26, letterSpacingEm: -0.005, weight: 400 },
  'body-md': { face: 'text', size: 15, lineHeight: 22, letterSpacingEm: 0, weight: 400 },
  'body-sm': { face: 'text', size: 13, lineHeight: 18, letterSpacingEm: 0, weight: 400 },
  'label-lg': { face: 'text', size: 15, lineHeight: 20, letterSpacingEm: 0.01, weight: 600 },
  'label-md': { face: 'text', size: 13, lineHeight: 16, letterSpacingEm: 0.02, weight: 600 },
  'label-sm': { face: 'text', size: 11, lineHeight: 14, letterSpacingEm: 0.04, weight: 600 },
};

/** The roles as data, in the order the design system prints them. */
export const typeRoleNames: readonly TypeRoleName[] = [
  'headline-xl',
  'headline-xl-mobile',
  'headline-lg',
  'headline-md',
  'headline-sm',
  'body-lg',
  'body-md',
  'body-sm',
  'label-lg',
  'label-md',
  'label-sm',
];

/**
 * A multiple of the size. Under this a line sits too close to the one beneath it, and the running
 * text is where it is felt first.
 */
export const LINE_HEIGHT_FLOOR = 1.2;

/**
 * React Native measures letter spacing in points and the design system measures it in em, which is
 * a multiple of the size. Two decimal places, because a third is below what a screen can draw.
 */
export function letterSpacingOf(size: number, em: number): number {
  return Math.round(size * em * 100) / 100;
}
