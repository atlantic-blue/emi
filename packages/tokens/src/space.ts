/**
 * The spacing and the corners of the design system, name for name and value for value. The
 * document is `docs/design/prototype-design-system.md`, and `tests/designSystem.test.ts` reads this
 * file against it. The document and a screen both measure in px, so a value here is the value the
 * document writes.
 */

/** What one rem of the document is worth on a phone. */
export const REM_IN_POINTS = 16;

/** The eight steps the document names. A screen asks for `spaceMd` and never for 16. */
export type SpaceName =
  'spaceXs' | 'spaceSm' | 'spaceMd' | 'spaceLg' | 'margin' | 'spaceXl' | 'marginMd' | 'marginLg';

/**
 * Points. `margin` and `spaceLg` hold the same number and are not one step: `margin` is the edge
 * of a screen and `spaceLg` is a gap inside one. A screen that wants a different edge moves
 * `margin`, which leaves every gap where it was.
 */
export const space: Readonly<Record<SpaceName, number>> = {
  spaceXs: 4,
  spaceSm: 8,
  spaceMd: 12,
  spaceLg: 16,
  margin: 20,
  spaceXl: 24,
  marginMd: 28,
  marginLg: 56,
};

/**
 * The corners the document names. `DEFAULT` keeps the document's own key, so the two can be read
 * against each other without a table in between.
 */
export type RadiusName = 'sm' | 'DEFAULT' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';

/** Points. `full` is larger than any box Emi draws, which is how a capsule is made. */
export const radius: Readonly<Record<RadiusName, number>> = {
  sm: 10,
  DEFAULT: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 28,
  full: 999,
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
  'spaceMd',
  'spaceLg',
  'margin',
  'spaceXl',
  'marginMd',
  'marginLg',
];

/** The corners as data, from the tightest to the capsule. */
export const radiusNames: readonly RadiusName[] = [
  'sm',
  'DEFAULT',
  'md',
  'lg',
  'xl',
  'xxl',
  'full',
];
