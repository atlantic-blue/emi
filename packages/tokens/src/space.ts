/**
 * The spacing and the corners of the design system, name for name and value for value. The
 * document is `docs/design/warm-humanist-editorial/design-system.md`, the style this package still
 * holds, and `tests/designSystem.test.ts` reads this file
 * against it. The document measures in rem for a browser and a screen measures in points, so every
 * value here is its rem multiplied by ${REM_IN_POINTS}.
 */

/** What one rem of the document is worth on a phone. */
export const REM_IN_POINTS = 16;

/** The seven steps the document names. A screen asks for `spaceMd` and never for 16. */
export type SpaceName =
  'gutter' | 'margin' | 'spaceXs' | 'spaceSm' | 'spaceMd' | 'spaceLg' | 'spaceXl';

/** Points. */
export const space: Readonly<Record<SpaceName, number>> = {
  gutter: 16,
  margin: 20,
  spaceXs: 4,
  spaceSm: 8,
  spaceMd: 16,
  spaceLg: 24,
  spaceXl: 36,
};

/**
 * The corners the document names. `DEFAULT` keeps the document's own key, so the two can be read
 * against each other without a table in between.
 */
export type RadiusName = 'sm' | 'DEFAULT' | 'md' | 'lg' | 'xl' | 'full';

/** Points. `full` is larger than any box Emi draws, which is how a capsule is made. */
export const radius: Readonly<Record<RadiusName, number>> = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

/** Two widths only: a hairline for a rule, and the one stroke every drawing in the set is made at. */
export const stroke = {
  hairline: 1,
  icon: 1.75,
} as const;

/**
 * Points square. A control that draws smaller than this still takes a touch anywhere inside this
 * box, because a thumb is not a cursor.
 */
export const MINIMUM_TAP_TARGET = 44;

/** The scale as data, from the smallest step to the largest. */
export const spaceNames: readonly SpaceName[] = [
  'spaceXs',
  'spaceSm',
  'gutter',
  'spaceMd',
  'margin',
  'spaceLg',
  'spaceXl',
];

/** The corners as data, from the tightest to the capsule. */
export const radiusNames: readonly RadiusName[] = ['sm', 'DEFAULT', 'md', 'lg', 'xl', 'full'];
