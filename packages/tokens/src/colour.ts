/**
 * The palette of the design system, name for name and value for value. The document is
 * `docs/design/prototype-design-system.md`, written from the Warm Editorial Journal prototype, and
 * `tests/designSystem.test.ts` reads this file against it, so a value that drifts from the document
 * fails the run.
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
  | 'surfaceVariant'
  | 'period'
  | 'periodInk'
  | 'follicular'
  | 'follicularInk'
  | 'ovulation'
  | 'ovulationInk'
  | 'luteal'
  | 'lutealInk';

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
  'period',
  'periodInk',
  'follicular',
  'follicularInk',
  'ovulation',
  'ovulationInk',
  'luteal',
  'lutealInk',
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
 * The same grounds without the dimmed one. `surfaceDim` is the darkest ground in the set, and
 * `onSecondaryContainer` reaches 4.19 to 1 on it against 4.53 on every other, so the one colour
 * that misses the floor there names the nine rather than the ten.
 */
const ON_LIGHT_BUT_DIM: readonly ColourName[] = ON_LIGHT.filter((name) => name !== 'surfaceDim');

/**
 * The palette. Every value is the document's own, and every `textOn` entry was measured at or
 * above the floor. `outline` carries no text anywhere: its best reading is 3.20 to 1 on the
 * lightest ground in the set, so it draws a line and never a word.
 *
 * The four phase fills carry no text at any size. Three of the four inks fail the floor on their
 * own fill, and contract SEE-2 covers all four rather than the three that measure badly.
 */
export const colours: Readonly<Record<ColourName, ColourToken>> = {
  surface: { value: '#FFF8F5', roles: ['ground'], textOn: [] },
  surfaceDim: { value: '#E1D8D5', roles: ['ground'], textOn: [] },
  surfaceBright: { value: '#FFF8F5', roles: ['ground'], textOn: [] },
  surfaceContainerLowest: { value: '#FFFFFF', roles: ['ground'], textOn: [] },
  surfaceContainerLow: { value: '#FBF2EE', roles: ['ground'], textOn: [] },
  surfaceContainer: { value: '#F5ECE8', roles: ['ground'], textOn: [] },
  surfaceContainerHigh: { value: '#EFE6E3', roles: ['ground'], textOn: [] },
  surfaceContainerHighest: { value: '#EAE1DD', roles: ['ground'], textOn: [] },
  onSurface: { value: '#1F1B19', roles: ['text'], textOn: ON_LIGHT },
  onSurfaceVariant: { value: '#56423D', roles: ['text'], textOn: ON_LIGHT },
  inverseSurface: { value: '#342F2D', roles: ['ground'], textOn: [] },
  inverseOnSurface: { value: '#F8EFEB', roles: ['text'], textOn: ['inverseSurface'] },
  outline: { value: '#89726C', roles: ['line'], textOn: [] },
  outlineVariant: { value: '#DCC1B9', roles: ['line'], textOn: [] },
  surfaceTint: { value: '#9C4327', roles: ['ground', 'fill'], textOn: [] },
  primary: { value: '#843117', roles: ['ground', 'fill'], textOn: [] },
  onPrimary: {
    value: '#FFFFFF',
    roles: ['text'],
    textOn: ['primary', 'primaryContainer', 'surfaceTint'],
  },
  primaryContainer: { value: '#A3482C', roles: ['ground', 'fill'], textOn: [] },
  onPrimaryContainer: {
    value: '#FFD8CE',
    roles: ['text'],
    textOn: ['primaryContainer', 'primary'],
  },
  inversePrimary: { value: '#FFB59F', roles: ['text'], textOn: ['inverseSurface'] },
  secondary: { value: '#625E58', roles: ['ground', 'text', 'fill'], textOn: ON_LIGHT },
  onSecondary: { value: '#FFFFFF', roles: ['text'], textOn: ['secondary'] },
  secondaryContainer: { value: '#E8E1D9', roles: ['ground', 'fill'], textOn: [] },
  onSecondaryContainer: {
    value: '#68645E',
    roles: ['text'],
    textOn: ['secondaryContainer', ...ON_LIGHT_BUT_DIM],
  },
  tertiary: { value: '#921F12', roles: ['ground', 'text', 'fill'], textOn: ON_LIGHT },
  onTertiary: { value: '#FFFFFF', roles: ['text'], textOn: ['tertiary', 'tertiaryContainer'] },
  tertiaryContainer: { value: '#B43727', roles: ['ground', 'fill'], textOn: [] },
  onTertiaryContainer: { value: '#FFD8D2', roles: ['text'], textOn: ['tertiaryContainer'] },
  error: { value: '#BA1A1A', roles: ['ground', 'text', 'fill'], textOn: ON_LIGHT },
  onError: { value: '#FFFFFF', roles: ['text'], textOn: ['error'] },
  errorContainer: { value: '#FFDAD6', roles: ['ground', 'fill'], textOn: [] },
  onErrorContainer: { value: '#93000A', roles: ['text'], textOn: ['errorContainer', ...ON_LIGHT] },
  primaryFixed: { value: '#FFDBD1', roles: ['ground', 'fill'], textOn: [] },
  primaryFixedDim: { value: '#FFB59F', roles: ['ground', 'fill'], textOn: [] },
  onPrimaryFixed: {
    value: '#3A0A00',
    roles: ['text'],
    textOn: ['primaryFixed', 'primaryFixedDim', ...ON_LIGHT],
  },
  onPrimaryFixedVariant: {
    value: '#7D2C12',
    roles: ['text'],
    textOn: ['primaryFixed', 'primaryFixedDim', ...ON_LIGHT],
  },
  secondaryFixed: { value: '#E8E1D9', roles: ['ground', 'fill'], textOn: [] },
  secondaryFixedDim: { value: '#CCC5BE', roles: ['ground', 'fill'], textOn: [] },
  onSecondaryFixed: {
    value: '#1E1B17',
    roles: ['text'],
    textOn: ['secondaryFixed', 'secondaryFixedDim', ...ON_LIGHT],
  },
  onSecondaryFixedVariant: {
    value: '#4A4641',
    roles: ['text'],
    textOn: ['secondaryFixed', 'secondaryFixedDim', ...ON_LIGHT],
  },
  tertiaryFixed: { value: '#FFDAD4', roles: ['ground', 'fill'], textOn: [] },
  tertiaryFixedDim: { value: '#FFB4A8', roles: ['ground', 'fill'], textOn: [] },
  onTertiaryFixed: {
    value: '#410100',
    roles: ['text'],
    textOn: ['tertiaryFixed', 'tertiaryFixedDim', ...ON_LIGHT],
  },
  onTertiaryFixedVariant: {
    value: '#8B190E',
    roles: ['text'],
    textOn: ['tertiaryFixed', 'tertiaryFixedDim', ...ON_LIGHT],
  },
  background: { value: '#FFF8F5', roles: ['ground'], textOn: [] },
  onBackground: { value: '#1F1B19', roles: ['text'], textOn: ON_LIGHT },
  surfaceVariant: { value: '#EAE1DD', roles: ['ground', 'fill'], textOn: [] },
  period: { value: '#D97D6E', roles: ['ground', 'fill'], textOn: [] },
  periodInk: { value: '#5C2018', roles: ['text'], textOn: ON_LIGHT },
  follicular: { value: '#E5A96D', roles: ['ground', 'fill'], textOn: [] },
  follicularInk: { value: '#5E3B10', roles: ['text'], textOn: ON_LIGHT },
  ovulation: { value: '#A8A663', roles: ['ground', 'fill'], textOn: [] },
  ovulationInk: { value: '#404218', roles: ['text'], textOn: ON_LIGHT },
  luteal: { value: '#9B849E', roles: ['ground', 'fill'], textOn: [] },
  lutealInk: { value: '#433246', roles: ['text'], textOn: ON_LIGHT },
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
