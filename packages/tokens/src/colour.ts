/**
 * The palette is closed. A screen that wants a nineteenth colour adds it here, where the contrast
 * test can see it and measure it.
 */
export type ColourName =
  | 'stone'
  | 'surface'
  | 'sunk'
  | 'ink'
  | 'body'
  | 'muted'
  | 'hairline'
  | 'ember'
  | 'emberPressed'
  | 'emberTint'
  | 'period'
  | 'follicular'
  | 'ovulation'
  | 'luteal'
  | 'periodInk'
  | 'follicularInk'
  | 'ovulationInk'
  | 'lutealInk';

/**
 * What a colour is allowed to do. A fill and a text colour are separate roles because three of the
 * four phase fills fail the contrast floor as text.
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
  'stone',
  'surface',
  'sunk',
  'ink',
  'body',
  'muted',
  'hairline',
  'ember',
  'emberPressed',
  'emberTint',
  'period',
  'follicular',
  'ovulation',
  'luteal',
  'periodInk',
  'follicularInk',
  'ovulationInk',
  'lutealInk',
];

const ON_LIGHT: readonly ColourName[] = ['stone', 'surface', 'sunk', 'emberTint'];

/**
 * The palette. Every value here is the one the design publishes, and the token test holds that
 * published list, so a colour changed here fails the run until the design changes too.
 */
export const colours: Readonly<Record<ColourName, ColourToken>> = {
  stone: { value: '#F7F3EE', roles: ['ground'], textOn: [] },
  surface: { value: '#FFFCF8', roles: ['ground', 'text'], textOn: ['ember', 'emberPressed'] },
  sunk: { value: '#F1EBE4', roles: ['ground'], textOn: [] },
  ink: { value: '#241F1C', roles: ['text'], textOn: ON_LIGHT },
  body: { value: '#5C534E', roles: ['text'], textOn: ON_LIGHT },
  // muted reaches 4.43 on sunk and 4.36 on emberTint, so those two grounds are refused here.
  muted: { value: '#756A64', roles: ['text'], textOn: ['stone', 'surface'] },
  hairline: { value: '#241F1C1A', roles: ['line'], textOn: [] },
  ember: { value: '#A8452C', roles: ['text', 'fill', 'ground'], textOn: ON_LIGHT },
  emberPressed: { value: '#8E3823', roles: ['fill', 'ground'], textOn: [] },
  emberTint: { value: '#F6E7E1', roles: ['ground'], textOn: [] },
  period: { value: '#E05A4E', roles: ['fill'], textOn: [] },
  follicular: { value: '#E0913A', roles: ['fill'], textOn: [] },
  ovulation: { value: '#2E8C93', roles: ['fill'], textOn: [] },
  luteal: { value: '#7A5B8C', roles: ['fill'], textOn: [] },
  periodInk: { value: '#B03A32', roles: ['text'], textOn: ON_LIGHT },
  follicularInk: { value: '#8A5416', roles: ['text'], textOn: ON_LIGHT },
  ovulationInk: { value: '#1F6B71', roles: ['text'], textOn: ON_LIGHT },
  lutealInk: { value: '#5E4470', roles: ['text'], textOn: ON_LIGHT },
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
