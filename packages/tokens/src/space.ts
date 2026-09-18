/** The spacing scale, named rather than measured, so a screen asks for `snug` and never for 16. */
export type SpaceName = 'hair' | 'tight' | 'snug' | 'base' | 'roomy' | 'loose' | 'section';

/**
 * Points. Every step is a multiple of four, so a layout built from these lands on the grid the
 * design draws on.
 */
export const space: Readonly<Record<SpaceName, number>> = {
  hair: 4,
  tight: 8,
  snug: 16,
  base: 24,
  roomy: 32,
  loose: 48,
  section: 64,
};

/**
 * The corners, from an icon to a sheet. A radius is named for what it goes on, so two things of
 * the same kind cannot round differently.
 */
export type RadiusName = 'icon' | 'chip' | 'card' | 'sheet' | 'round';

/**
 * Points. `round` is larger than any box Emi draws, which is how a capsule is made: a corner that
 * can never be reached.
 */
export const radius: Readonly<Record<RadiusName, number>> = {
  icon: 2,
  chip: 10,
  card: 16,
  sheet: 24,
  round: 999,
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
  'hair',
  'tight',
  'snug',
  'base',
  'roomy',
  'loose',
  'section',
];
