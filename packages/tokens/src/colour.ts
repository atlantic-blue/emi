/**
 * The palette of the design system, name for name and value for value. The document is
 * `docs/design/prototype-design-system.md`, written from the redesign prototype, and
 * `tests/designSystem.test.ts` reads this file against it, so a value that drifts from the document
 * fails the run.
 *
 * The set is closed. A screen that wants a colour the document does not name asks for it in the
 * document first, because the contrast test can only measure what is here.
 */
export type ColourName =
  | 'ground'
  | 'card'
  | 'field'
  | 'line'
  | 'darkCard'
  | 'text'
  | 'secondaryText'
  | 'onAccent'
  | 'accent'
  | 'accentPressed'
  | 'accentSoft'
  | 'accentSoftInk'
  | 'accentTile'
  | 'dockQuiet'
  | 'pickerNear'
  | 'pickerFar'
  | 'disabledLabel'
  | 'quietIcon'
  | 'warmIcon'
  | 'dotOff'
  | 'stepTrack'
  | 'emptyRing'
  | 'uncheckedRing'
  | 'period'
  | 'periodInk'
  | 'follicular'
  | 'follicularInk'
  | 'ovulation'
  | 'ovulationInk'
  | 'luteal'
  | 'lutealInk'
  | 'washWarm'
  | 'washAmber'
  | 'washRose'
  | 'washBlush'
  | 'washPink'
  | 'notificationMiddle'
  | 'notificationEnd'
  | 'platformLine'
  | 'platformBlue';

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

/**
 * The palette. Every value is the document's own, and every `textOn` entry was measured at or above
 * the floor by `tests/contrast.test.ts`.
 *
 * Four of these values are not the value the prototype paints. Each one is a colour the prototype
 * paints below the floor, and the document's `raised` block records both, so the markup check reads
 * the painted value while this file carries the one Emi builds.
 */
/** The palette as data, in the order the document prints it. A type cannot be read at run time. */
const ALL: readonly ColourName[] = [
  'ground',
  'card',
  'field',
  'line',
  'darkCard',
  'text',
  'secondaryText',
  'onAccent',
  'accent',
  'accentPressed',
  'accentSoft',
  'accentSoftInk',
  'accentTile',
  'dockQuiet',
  'pickerNear',
  'pickerFar',
  'disabledLabel',
  'quietIcon',
  'warmIcon',
  'dotOff',
  'stepTrack',
  'emptyRing',
  'uncheckedRing',
  'period',
  'periodInk',
  'follicular',
  'follicularInk',
  'ovulation',
  'ovulationInk',
  'luteal',
  'lutealInk',
  'washWarm',
  'washAmber',
  'washRose',
  'washBlush',
  'washPink',
  'notificationMiddle',
  'notificationEnd',
  'platformLine',
  'platformBlue',
];

/**
 * The palette. Every value is the document own, and every `textOn` entry was measured at or above
 * the floor by `tests/contrast.test.ts`.
 *
 * Four of these values are not the value the prototype paints. Each one is a colour the prototype
 * paints below the floor, and the document's `raised` block records both, so the markup check reads
 * the painted value while this file carries the one Emi builds.
 */
export const colours: Readonly<Record<ColourName, ColourToken>> = {
  /** The warm paper every screen sits on. */
  ground: {
    value: '#FFF8F3',
    roles: ['ground'],
    textOn: [],
  },
  /** The plain surface a section is raised onto. */
  card: {
    value: '#FFFFFF',
    roles: ['ground'],
    textOn: [],
  },
  /** The quieter surface a control sits in. */
  field: {
    value: '#FFF2EB',
    roles: ['ground'],
    textOn: [],
  },
  /** The hairline between a row and the row under it. */
  line: {
    value: '#F1E1D6',
    roles: ['line'],
    textOn: [],
  },
  /** The one surface that reverses, which carries the white the accent carries. */
  darkCard: {
    value: '#4A2A2E',
    roles: ['ground', 'fill'],
    textOn: [],
  },
  /** Every word she reads at length. */
  text: {
    value: '#2E2224',
    roles: ['text'],
    textOn: ['ground', 'card', 'field', 'accentSoft'],
  },
  /** A label, a caption and the quieter half of a row. */
  secondaryText: {
    value: '#76625F',
    roles: ['text'],
    textOn: ['ground', 'card', 'field'],
  },
  /** The white that carries text on the accent and on the dark card. */
  onAccent: {
    value: '#FFFFFF',
    roles: ['text'],
    textOn: ['accent', 'darkCard'],
  },
  /** The one colour that acts. */
  accent: {
    value: '#B8434E',
    roles: ['ground', 'fill', 'text'],
    textOn: ['ground', 'card', 'field'],
  },
  /** The accent while a control is held, and the ink of the period phase name. */
  accentPressed: {
    value: '#8E2F3A',
    roles: ['ground', 'fill', 'text'],
    textOn: ['ground', 'card', 'field', 'accentSoft'],
  },
  /** The tint behind a chip. */
  accentSoft: {
    value: '#FFDCDC',
    roles: ['ground', 'fill'],
    textOn: [],
  },
  /** The ink on an accent soft chip, raised because the accent itself does not clear the floor there. */
  accentSoftInk: {
    value: '#AF404A',
    roles: ['text'],
    textOn: ['accentSoft'],
  },
  /** A tile tinted by the accent. */
  accentTile: {
    value: '#F9E3E1',
    roles: ['ground', 'fill'],
    textOn: [],
  },
  /** The label and the icon of a tab she is not on. */
  dockQuiet: {
    value: '#826F69',
    roles: ['text'],
    textOn: ['ground', 'card'],
  },
  /** The number next to the one she chose in a picker. */
  pickerNear: {
    value: '#866E65',
    roles: ['text'],
    textOn: ['ground', 'card'],
  },
  /** The number two away from the one she chose. */
  pickerFar: {
    value: '#906B59',
    roles: ['text'],
    textOn: ['ground', 'card'],
  },
  /** The label of a control that cannot be pressed, and the ring of an option she has not chosen. It carries no live word, so it is never measured as text: it is the one colour of the redesign that sits under the floor, and it sits there because nothing readable depends on it. */
  disabledLabel: {
    value: '#C9B4AA',
    roles: ['line'],
    textOn: [],
  },
  /** The icon at the end of a row, which points rather than says. */
  quietIcon: {
    value: '#B49F96',
    roles: ['line'],
    textOn: [],
  },
  /** An icon inside a field, and the words beside it. */
  warmIcon: {
    value: '#A0521A',
    roles: ['text'],
    textOn: ['ground', 'card', 'field'],
  },
  /** A dot in a row of dots that is not lit. */
  dotOff: {
    value: '#EFDCCF',
    roles: ['fill'],
    textOn: [],
  },
  /** The track a step bar fills. */
  stepTrack: {
    value: '#F3E2D6',
    roles: ['fill'],
    textOn: [],
  },
  /** The dashed ring drawn where there is nothing to draw yet. */
  emptyRing: {
    value: '#E6CFC2',
    roles: ['line'],
    textOn: [],
  },
  /** The ring of a choice she has not made. */
  uncheckedRing: {
    value: '#D9C2B6',
    roles: ['line'],
    textOn: [],
  },
  /** The arc of the days she bleeds. */
  period: {
    value: '#B8434E',
    roles: ['fill'],
    textOn: [],
  },
  /** The name of the period phase, written on the ground. */
  periodInk: {
    value: '#8E2F3A',
    roles: ['text'],
    textOn: ['ground', 'card'],
  },
  /** The arc of the days after the period. */
  follicular: {
    value: '#F5DCCB',
    roles: ['fill'],
    textOn: [],
  },
  /** The name of the days after the period, written on the ground. */
  follicularInk: {
    value: '#2E2224',
    roles: ['text'],
    textOn: ['ground', 'card'],
  },
  /** The arc of the days around ovulation. */
  ovulation: {
    value: '#E9A15F',
    roles: ['fill'],
    textOn: [],
  },
  /** The name of the ovulation phase, written on the ground. */
  ovulationInk: {
    value: '#8A4A1C',
    roles: ['text'],
    textOn: ['ground', 'card'],
  },
  /** The arc of the luteal days. */
  luteal: {
    value: '#C27E86',
    roles: ['fill'],
    textOn: [],
  },
  /** The name of the luteal phase, written on the ground. */
  lutealInk: {
    value: '#7E3E48',
    roles: ['text'],
    textOn: ['ground', 'card'],
  },
  /** The warm stop of a wash. */
  washWarm: {
    value: '#FFE8CD',
    roles: ['ground', 'fill'],
    textOn: [],
  },
  /** The amber stop of a wash. */
  washAmber: {
    value: '#FFD6BA',
    roles: ['ground', 'fill'],
    textOn: [],
  },
  /** The rose stop of the luteal wash. */
  washRose: {
    value: '#F6D3D0',
    roles: ['fill'],
    textOn: [],
  },
  /** The blush stop of the luteal wash. */
  washBlush: {
    value: '#FBE6E2',
    roles: ['fill'],
    textOn: [],
  },
  /** The far stop of the glow inside the hold ring. */
  washPink: {
    value: '#FFE6EE',
    roles: ['fill'],
    textOn: [],
  },
  /** The middle stop of the notification Emi draws on the lock screen. */
  notificationMiddle: {
    value: '#8A4A52',
    roles: ['fill'],
    textOn: [],
  },
  /** The last stop of that notification. */
  notificationEnd: {
    value: '#E9A07A',
    roles: ['fill'],
    textOn: [],
  },
  /** The line inside the dialog the phone puts up. Emi never paints it. */
  platformLine: {
    value: '#E6D6CC',
    roles: ['line'],
    textOn: [],
  },
  /** The blue the phone writes its own buttons in. Emi never paints it. */
  platformBlue: {
    value: '#1F6FD1',
    roles: ['text'],
    textOn: ['card'],
  },
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
