/**
 * The palette of the design system, name for name and value for value. The document is
 * `docs/design/prototype-design-system.md` and `tests/designSystem.test.ts` reads this file
 * against it, so a value that drifts from the document fails the run.
 *
 * The set is closed. A screen that wants a colour the document does not name asks for it in the
 * document first, because the contrast test can only measure what is here.
 */
export type ColourName =
  | 'surface'
  | 'surfaceDim'
  | 'surfaceBright'
  | 'surfaceContainerLowest'
  | 'surfaceContainerLow'
  | 'surfaceContainer'
  | 'surfaceContainerHigh'
  | 'surfaceContainerHighest'
  | 'onSurface'
  | 'onSurfaceVariant'
  | 'inverseSurface'
  | 'inverseOnSurface'
  | 'outline'
  | 'outlineVariant'
  | 'surfaceTint'
  | 'primary'
  | 'onPrimary'
  | 'primaryContainer'
  | 'onPrimaryContainer'
  | 'inversePrimary'
  | 'secondary'
  | 'onSecondary'
  | 'secondaryContainer'
  | 'onSecondaryContainer'
  | 'tertiary'
  | 'onTertiary'
  | 'tertiaryContainer'
  | 'onTertiaryContainer'
  | 'error'
  | 'onError'
  | 'errorContainer'
  | 'onErrorContainer'
  | 'primaryFixed'
  | 'primaryFixedDim'
  | 'onPrimaryFixed'
  | 'onPrimaryFixedVariant'
  | 'secondaryFixed'
  | 'secondaryFixedDim'
  | 'onSecondaryFixed'
  | 'onSecondaryFixedVariant'
  | 'tertiaryFixed'
  | 'tertiaryFixedDim'
  | 'onTertiaryFixed'
  | 'onTertiaryFixedVariant'
  | 'background'
  | 'onBackground'
  | 'surfaceVariant';

/**
 * What a colour is allowed to do. A fill and a text colour are separate roles because a phase fill
 * fails the contrast floor as text, which is contract SEE-2.
 */
export type ColourRole = 'ground' | 'text' | 'fill' | 'line';

/**
 * A value and the rules that travel with it. A value on its own would let a screen put any colour
 * on any ground, which is the drift the contrast test exists to catch.
 */
export interface ColourToken {
  readonly value: string;
  readonly roles: readonly ColourRole[];
  /** The grounds this colour is measured against and approved to carry text on. */
  readonly textOn: readonly ColourName[];
}

const ALL: readonly ColourName[] = [
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'onSurfaceVariant',
  'inverseSurface',
  'inverseOnSurface',
  'outline',
  'outlineVariant',
  'surfaceTint',
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'primaryFixed',
  'primaryFixedDim',
  'onPrimaryFixed',
  'onPrimaryFixedVariant',
  'secondaryFixed',
  'secondaryFixedDim',
  'onSecondaryFixed',
  'onSecondaryFixedVariant',
  'tertiaryFixed',
  'tertiaryFixedDim',
  'onTertiaryFixed',
  'onTertiaryFixedVariant',
  'background',
  'onBackground',
  'surfaceVariant',
];

/** Every light ground the document draws a screen on, which is where running text sits. */
const ON_LIGHT: readonly ColourName[] = [
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'background',
  'surfaceVariant',
];

/**
 * The action colour is `surfaceTint`, the document's own tint of primary, and not `primary`
 * itself: `primary` is the ovulation fill, and contract SEE-2 keeps a word off a phase fill
 * whatever that fill measures. The two are one step apart and read as the same terracotta.
 */

/**
 * The palette. Every value is the document's own, and every `textOn` entry was measured at or
 * above the floor. `outline` carries no text anywhere: it reaches 4.27 to 1 on `surface` and
 * 4.48 on `surfaceContainerLowest`, so it draws a line and never a word.
 */
export const colours: Readonly<Record<ColourName, ColourToken>> = {
  surface: { value: '#FCF9F4', roles: ['ground'], textOn: [] },
  surfaceDim: { value: '#DCDAD5', roles: ['ground'], textOn: [] },
  surfaceBright: { value: '#FCF9F4', roles: ['ground'], textOn: [] },
  surfaceContainerLowest: { value: '#FFFFFF', roles: ['ground'], textOn: [] },
  surfaceContainerLow: { value: '#F6F3EE', roles: ['ground'], textOn: [] },
  surfaceContainer: { value: '#F0EDE9', roles: ['ground'], textOn: [] },
  surfaceContainerHigh: { value: '#EBE8E3', roles: ['ground'], textOn: [] },
  surfaceContainerHighest: { value: '#E5E2DD', roles: ['ground'], textOn: [] },
  onSurface: { value: '#1C1C19', roles: ['text'], textOn: ON_LIGHT },
  onSurfaceVariant: { value: '#56423E', roles: ['text'], textOn: ON_LIGHT },
  inverseSurface: { value: '#31302D', roles: ['ground'], textOn: [] },
  inverseOnSurface: { value: '#F3F0EB', roles: ['text'], textOn: ['inverseSurface'] },
  outline: { value: '#89726C', roles: ['line'], textOn: [] },
  outlineVariant: { value: '#DDC0BA', roles: ['line'], textOn: [] },
  surfaceTint: { value: '#9F402A', roles: ['ground', 'fill'], textOn: [] },
  primary: { value: '#9C3E28', roles: ['ground', 'fill'], textOn: [] },
  onPrimary: {
    value: '#FFFFFF',
    roles: ['text'],
    textOn: ['primary', 'primaryContainer', 'surfaceTint'],
  },
  primaryContainer: { value: '#BC553E', roles: ['ground', 'fill'], textOn: [] },
  onPrimaryContainer: { value: '#FFFBFF', roles: ['text'], textOn: ['primaryContainer'] },
  inversePrimary: { value: '#FFB4A3', roles: ['text'], textOn: ['inverseSurface'] },
  secondary: { value: '#8C4D43', roles: ['ground', 'text', 'fill'], textOn: ON_LIGHT },
  onSecondary: { value: '#FFFFFF', roles: ['text'], textOn: ['secondary'] },
  secondaryContainer: { value: '#FEACA0', roles: ['ground', 'fill'], textOn: [] },
  onSecondaryContainer: {
    value: '#7A3D35',
    roles: ['text'],
    textOn: ['secondaryContainer', ...ON_LIGHT],
  },
  tertiary: { value: '#645863', roles: ['ground', 'text', 'fill'], textOn: ON_LIGHT },
  onTertiary: { value: '#FFFFFF', roles: ['text'], textOn: ['tertiary', 'tertiaryContainer'] },
  tertiaryContainer: { value: '#7E717C', roles: ['ground', 'fill'], textOn: [] },
  onTertiaryContainer: { value: '#FFFBFF', roles: ['text'], textOn: ['tertiaryContainer'] },
  error: { value: '#BA1A1A', roles: ['ground', 'text', 'fill'], textOn: ON_LIGHT },
  onError: { value: '#FFFFFF', roles: ['text'], textOn: ['error'] },
  errorContainer: { value: '#FFDAD6', roles: ['ground', 'fill'], textOn: [] },
  onErrorContainer: { value: '#93000A', roles: ['text'], textOn: ['errorContainer', ...ON_LIGHT] },
  primaryFixed: { value: '#FFDAD2', roles: ['ground', 'fill'], textOn: [] },
  primaryFixedDim: { value: '#FFB4A3', roles: ['ground', 'fill'], textOn: [] },
  onPrimaryFixed: {
    value: '#3D0600',
    roles: ['text'],
    textOn: ['primaryFixed', 'primaryFixedDim', ...ON_LIGHT],
  },
  onPrimaryFixedVariant: {
    value: '#802916',
    roles: ['text'],
    textOn: ['primaryFixed', 'primaryFixedDim', ...ON_LIGHT],
  },
  secondaryFixed: { value: '#FFDAD5', roles: ['ground', 'fill'], textOn: [] },
  secondaryFixedDim: { value: '#FFB4A8', roles: ['ground', 'fill'], textOn: [] },
  onSecondaryFixed: {
    value: '#390C07',
    roles: ['text'],
    textOn: ['secondaryFixed', 'secondaryFixedDim', ...ON_LIGHT],
  },
  onSecondaryFixedVariant: {
    value: '#70362D',
    roles: ['text'],
    textOn: ['secondaryFixed', 'secondaryFixedDim', ...ON_LIGHT],
  },
  tertiaryFixed: { value: '#EEDEEB', roles: ['ground', 'fill'], textOn: [] },
  tertiaryFixedDim: { value: '#D2C2CF', roles: ['ground', 'fill'], textOn: [] },
  onTertiaryFixed: {
    value: '#221922',
    roles: ['text'],
    textOn: ['tertiaryFixed', 'tertiaryFixedDim', ...ON_LIGHT],
  },
  onTertiaryFixedVariant: {
    value: '#4E434E',
    roles: ['text'],
    textOn: ['tertiaryFixed', 'tertiaryFixedDim', ...ON_LIGHT],
  },
  background: { value: '#FCF9F4', roles: ['ground'], textOn: [] },
  onBackground: { value: '#1C1C19', roles: ['text'], textOn: ON_LIGHT },
  surfaceVariant: { value: '#E5E2DD', roles: ['ground', 'fill'], textOn: [] },
};

/** The palette as data, in the order the brand document prints. A type cannot be read at run time. */
export const colourNames: readonly ColourName[] = ALL;

function valuesOf(): Record<ColourName, string> {
  const flat = {} as Record<ColourName, string>;
  for (const name of ALL) {
    flat[name] = colours[name].value;
  }
  return flat;
}

/** The value of every colour, for a screen that wants the string and nothing else. */
export const colour: Readonly<Record<ColourName, string>> = valuesOf();

/** Asks the palette whether a colour may be used that way, so a reviewer does not have to. */
export function hasRole(name: ColourName, role: ColourRole): boolean {
  return colours[name].roles.includes(role);
}

const SIX_DIGIT_HEX = /^#[0-9A-F]{6}$/;

function channel(eightBit: number): number {
  const scaled = eightBit / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
}

/**
 * Refuses anything but a six digit hex, because a colour carrying transparency has no
 * contrast ratio of its own: what it sits on decides the answer.
 */
export function relativeLuminance(hex: string): number {
  if (!SIX_DIGIT_HEX.test(hex)) {
    throw new Error(`${hex} is not a six digit hex colour, so it has no luminance of its own`);
  }
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);

  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/**
 * The ratio the Web Content Accessibility Guidelines define, the lighter colour over the darker
 * one. Which argument is which does not change the answer.
 */
export function contrastRatio(one: string, other: string): number {
  const first = relativeLuminance(one);
  const second = relativeLuminance(other);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Level AA of the Web Content Accessibility Guidelines, for normal text. */
export const CONTRAST_FLOOR = 4.5;
