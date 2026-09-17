export type SpaceName = 'hair' | 'tight' | 'snug' | 'base' | 'roomy' | 'loose' | 'section';

export const space: Readonly<Record<SpaceName, number>> = {
  hair: 4,
  tight: 8,
  snug: 16,
  base: 24,
  roomy: 32,
  loose: 48,
  section: 64,
};

export type RadiusName = 'icon' | 'chip' | 'card' | 'sheet' | 'round';

export const radius: Readonly<Record<RadiusName, number>> = {
  icon: 2,
  chip: 10,
  card: 16,
  sheet: 24,
  round: 999,
};

export const stroke = {
  hairline: 1,
  icon: 1.75,
} as const;

export const MINIMUM_TAP_TARGET = 44;

export const spaceNames: readonly SpaceName[] = [
  'hair',
  'tight',
  'snug',
  'base',
  'roomy',
  'loose',
  'section',
];
