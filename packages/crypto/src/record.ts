import {
  type Flow,
  highestTemperatureCelsius,
  highestWeightKilograms,
  lowestTemperatureCelsius,
  lowestWeightKilograms,
  type Symptom,
  unknownMoodSlugs,
  unknownSymptomSlugs,
} from '@emi/cycle';

import { canonicalJson, fromCanonicalBytes, type JsonValue } from './canonical';

/**
 * The plaintext of a day, from section 6.2 of the design. Every range here is checked before a
 * record is sealed, because a number that is out of range is a number she typed by accident and
 * the envelope is the last place it can be caught while it is still readable.
 */
export interface DayRecord {
  readonly day: string;
  readonly flow?: Flow;
  readonly bleedingIsUnexpected?: boolean;
  readonly symptoms?: readonly string[];
  readonly moods?: readonly string[];
  readonly energy?: number;
  readonly temperatureCelsius?: number;
  readonly weightKilograms?: number;
  readonly note?: string;
  readonly sex?: Sex;
  readonly sexDrive?: SexDrive;
  readonly orgasm?: Orgasm;
  readonly discharge?: Discharge;
  readonly products?: readonly Product[];
  readonly food?: readonly Food[];
  readonly ovulationSigns?: readonly OvulationSign[];
  readonly ovulationPopup?: OvulationPopup;
  readonly recordedAt: string;
}

/** "No sex", "Protected" and "Unprotected" on the Sex page. `none` is an answer, absent is not. */
export const sexValues = ['none', 'protected', 'unprotected'] as const;
/** Her answer to "Did you have sex today?". A record without it says she gave no answer. */
export type Sex = (typeof sexValues)[number];

/** "Sex drive" on the Sex page: low, neutral or high. */
export const sexDriveValues = ['low', 'neutral', 'high'] as const;
/** How strong her desire felt that day, as she judged it. */
export type SexDrive = (typeof sexDriveValues)[number];

/** "Orgasm" on the Sex page. `rather-not-say` is an answer she chose, so Emi keeps it. */
export const orgasmValues = ['yes', 'no', 'rather-not-say'] as const;
/** Her answer about orgasm on a day she recorded sex, or a day she did not. */
export type Orgasm = (typeof orgasmValues)[number];

/** "Discharge" on the Period page, one value a day. `none` is an answer, absent is not. */
export const dischargeValues = [
  'none',
  'sticky',
  'creamy',
  'egg-white',
  'watery',
  'unusual',
] as const;
/** What she noticed in her underwear that day. One value, never a list. */
export type Discharge = (typeof dischargeValues)[number];

/** "What you used" on the Period page. She can pick several. */
export const productValues = ['pad', 'tampon', 'cup', 'period-underwear', 'liner'] as const;
/** A thing she wore to catch blood or discharge that day. */
export type Product = (typeof productValues)[number];

/** The Food row of the Cycle phase diary. She can pick several. */
export const foodValues = ['cravings', 'hungry', 'little-appetite', 'sweet', 'salty'] as const;
/** Appetite and cravings she noticed, as the diary of her phase records them. */
export type Food = (typeof foodValues)[number];

/** Her answer "Nothing yet" to the ovulation popup, which stands alone in the list. */
export const nothingYet = 'nothing-yet';

/** The chips of the ovulation popup. She can pick several signs, or "Nothing yet" alone. */
export const ovulationSignValues = [
  'egg-white-discharge',
  'pain-on-one-side',
  'tender-breasts',
  'higher-sex-drive',
  'positive-ovulation-test',
  'higher-temperature',
  nothingYet,
] as const;
/** A body sign she noticed around ovulation, or her answer that she noticed none yet. */
export type OvulationSign = (typeof ovulationSignValues)[number];

/**
 * What she did with the ovulation popup on that day. Any value means the popup showed, so it does
 * not show again the same day.
 */
export const ovulationPopupValues = ['answered', 'dismissed'] as const;
/** Whether she answered the popup or closed it with "Not now". */
export type OvulationPopup = (typeof ovulationPopupValues)[number];

/**
 * Every value of `Flow`, as data, because a type cannot be read at run time. The test holds the
 * assertion that this list covers the type, so a sixth value cannot arrive without landing here.
 */
export const flowValues = [
  'none',
  'spotting',
  'light',
  'medium',
  'heavy',
] as const satisfies readonly Flow[];

/** Every key a record may carry. A key outside this list is refused rather than sealed. */
export const recordKeys: readonly string[] = [
  'bleedingIsUnexpected',
  'day',
  'discharge',
  'energy',
  'flow',
  'food',
  'moods',
  'note',
  'orgasm',
  'ovulationPopup',
  'ovulationSigns',
  'products',
  'recordedAt',
  'sex',
  'sexDrive',
  'symptoms',
  'temperatureCelsius',
  'weightKilograms',
];

/** Five steps begin here. A scale she can answer in one tap beats one she has to think about. */
export const lowestEnergy = 1;
/** And they end here. A whole number only, because half a step is a precision she does not have. */
export const highestEnergy = 5;
/**
 * Characters, counted in code points rather than in bytes, so an accented letter costs her one and
 * not two.
 */
export const longestNote = 2000;

/**
 * Holds every problem the day carries, not the first one, so the message and the list are one
 * failure read two ways.
 */
export class RecordError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`this day cannot be sealed: ${problems.join('; ')}`);
    this.name = 'RecordError';
    this.problems = problems;
  }
}

/**
 * Every offence, not the first one, so a screen can show her everything that is wrong in one pass.
 * The catalogue is a parameter because a test reads a record against the catalogue of a later year.
 */
export function recordProblems(
  record: DayRecord,
  catalogue?: readonly Symptom[],
): readonly string[] {
  const held = record as unknown as Record<string, unknown>;
  const problems: string[] = [];

  for (const key of Object.keys(held)) {
    if (!recordKeys.includes(key)) {
      problems.push(`${key} is not a field of a day`);
    }
  }

  problems.push(...dayProblems(held.day));
  problems.push(...instantProblems(held.recordedAt));
  problems.push(...flowProblems(held.flow));
  problems.push(...unexpectedBleedingProblems(held.bleedingIsUnexpected));
  problems.push(...symptomProblems(held.symptoms, catalogue));
  problems.push(...moodProblems(held.moods, catalogue));
  problems.push(...energyProblems(held.energy));
  problems.push(
    ...measurementProblems(held.temperatureCelsius, {
      field: 'a temperature',
      lowest: lowestTemperatureCelsius,
      highest: highestTemperatureCelsius,
    }),
  );
  problems.push(
    ...measurementProblems(held.weightKilograms, {
      field: 'a weight',
      lowest: lowestWeightKilograms,
      highest: highestWeightKilograms,
    }),
  );
  problems.push(...noteProblems(held.note));
  problems.push(...newFieldProblems(held));

  return problems;
}

/** Hands the record back, or throws. Every path to an envelope goes through here. */
export function checkedRecord(record: DayRecord, catalogue?: readonly Symptom[]): DayRecord {
  const problems = recordProblems(record, catalogue);
  if (problems.length > 0) {
    throw new RecordError(problems);
  }
  return record;
}

/** The text that goes inside the envelope: canonical json of a record that passed every range. */
export function recordJson(record: DayRecord, catalogue?: readonly Symptom[]): string {
  return canonicalJson(checkedRecord(record, catalogue) as unknown as JsonValue);
}

/** The plaintext of an envelope: a day that passed its ranges, written as canonical bytes. */
export function recordBytes(record: DayRecord, catalogue?: readonly Symptom[]): Uint8Array {
  return new TextEncoder().encode(recordJson(record, catalogue));
}

/**
 * What comes back out of the envelope. The ranges are not re-checked here: a record she wrote
 * years ago is hers to read, and a build that refused it would lose her history rather than
 * protect it. The write is where a range is enforced.
 */
export function recordFromBytes(bytes: Uint8Array): DayRecord {
  const value = fromCanonicalBytes(bytes);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RecordError(['the plaintext is not a day']);
  }
  return value as DayRecord;
}

const dayShape = /^\d{4}-\d{2}-\d{2}$/;

function dayProblems(value: unknown): readonly string[] {
  if (value === undefined) {
    return ['a day names no date'];
  }
  if (typeof value !== 'string' || !dayShape.test(value)) {
    return [`a date is written as YYYY-MM-DD, this one is ${shown(value)}`];
  }

  const asDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(asDate.getTime()) || asDate.toISOString().slice(0, 10) !== value) {
    return [`${value} is not a day in the calendar`];
  }

  return [];
}

function instantProblems(value: unknown): readonly string[] {
  if (value === undefined) {
    return ['a day names no time it was saved'];
  }
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    return [`the time it was saved is not an instant, it is ${shown(value)}`];
  }
  return [];
}

function flowProblems(value: unknown): readonly string[] {
  if (value === undefined) {
    return [];
  }
  const known = (flowValues as readonly unknown[]).includes(value);
  return known ? [] : [`a flow is one of ${flowValues.join(', ')}, this one is ${shown(value)}`];
}

function unexpectedBleedingProblems(value: unknown): readonly string[] {
  if (value === undefined || typeof value === 'boolean') {
    return [];
  }
  return [`unexpected bleeding is true or false, this one is ${shown(value)}`];
}

function symptomProblems(value: unknown, catalogue?: readonly Symptom[]): readonly string[] {
  const problems = slugListProblems(value, 'a symptom');
  if (problems.length > 0 || value === undefined) {
    return problems;
  }

  const unknown = unknownSymptomSlugs(value as readonly string[], catalogue);
  return unknown.length > 0 ? [`the catalogue holds no symptom named ${unknown.join(', ')}`] : [];
}

function moodProblems(value: unknown, catalogue?: readonly Symptom[]): readonly string[] {
  const problems = slugListProblems(value, 'a mood');
  if (problems.length > 0 || value === undefined) {
    return problems;
  }

  const unknown = unknownMoodSlugs(value as readonly string[], catalogue);
  return unknown.length > 0 ? [`the catalogue holds no mood named ${unknown.join(', ')}`] : [];
}

const slugShape = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function slugListProblems(value: unknown, field: string): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return [`${field} list is a list, this one is ${shown(value)}`];
  }

  const wrong = (value as readonly unknown[]).filter(
    (slug) => typeof slug !== 'string' || !slugShape.test(slug),
  );

  return wrong.length > 0
    ? [`${field} is named by a slug, these are not: ${wrong.map(shown).join(', ')}`]
    : [];
}

function energyProblems(value: unknown): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return [`an energy is a whole number, this one is ${shown(value)}`];
  }
  if (value < lowestEnergy || value > highestEnergy) {
    return [`an energy runs from ${lowestEnergy} to ${highestEnergy}, this one is ${value}`];
  }
  return [];
}

const oneDecimalPlace = /^-?[0-9]+(\.[0-9])?$/;

interface Measurement {
  readonly field: string;
  readonly lowest: number;
  readonly highest: number;
}

function measurementProblems(value: unknown, measurement: Measurement): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return [`${measurement.field} is a number, this one is ${shown(value)}`];
  }
  if (value < measurement.lowest || value > measurement.highest) {
    return [
      `${measurement.field} runs from ${measurement.lowest.toFixed(1)} to ` +
        `${measurement.highest.toFixed(1)}, this one is ${value}`,
    ];
  }
  if (!oneDecimalPlace.test(JSON.stringify(value))) {
    return [`${measurement.field} carries one decimal place, this one is ${value}`];
  }
  return [];
}

function noteProblems(value: unknown): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (typeof value !== 'string') {
    return [`a note is text, this one is ${shown(value)}`];
  }
  const characters = [...value].length;
  return characters > longestNote
    ? [`a note holds at most ${longestNote} characters, this one holds ${characters}`]
    : [];
}

/**
 * The fields the Sex, Period and Cycle phase pages and the ovulation popup write. Each one is
 * checked against its own list, so a value a later screen invents cannot reach an envelope.
 */
function newFieldProblems(held: Readonly<Record<string, unknown>>): readonly string[] {
  return [
    ...oneOfProblems(held.sex, { field: 'sex', values: sexValues }),
    ...oneOfProblems(held.sexDrive, { field: 'a sex drive', values: sexDriveValues }),
    ...oneOfProblems(held.orgasm, { field: 'an orgasm answer', values: orgasmValues }),
    ...oneOfProblems(held.discharge, { field: 'a discharge', values: dischargeValues }),
    ...listOfProblems(held.products, { field: 'a product', values: productValues }),
    ...listOfProblems(held.food, { field: 'a food', values: foodValues }),
    ...listOfProblems(held.ovulationSigns, {
      field: 'a sign of ovulation',
      values: ovulationSignValues,
    }),
    ...oneOfProblems(held.ovulationPopup, {
      field: 'an ovulation popup answer',
      values: ovulationPopupValues,
    }),
    ...ovulationAnswerProblems(held.ovulationSigns, held.ovulationPopup),
  ];
}

interface AllowedValues {
  readonly field: string;
  readonly values: readonly string[];
}

function oneOfProblems(value: unknown, allowed: AllowedValues): readonly string[] {
  if (value === undefined || allowed.values.includes(value as string)) {
    return [];
  }
  return [`${allowed.field} is one of ${allowed.values.join(', ')}, this one is ${shown(value)}`];
}

/** An empty list is refused, because an absent field already says she recorded nothing. */
function listOfProblems(value: unknown, allowed: AllowedValues): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return [`${allowed.field} list is a list, this one is ${shown(value)}`];
  }
  if (value.length === 0) {
    return [`${allowed.field} list is left out rather than written empty`];
  }

  const unknown = (value as readonly unknown[]).filter(
    (item) => !allowed.values.includes(item as string),
  );
  if (unknown.length > 0) {
    return [
      `${allowed.field} is one of ${allowed.values.join(', ')}, these are not: ` +
        unknown.map(shown).join(', '),
    ];
  }

  return new Set(value).size === value.length
    ? []
    : [`${allowed.field} list names the same value twice`];
}

/**
 * Signs go with an answered popup and nothing else, and "nothing yet" is an answer on its own. A
 * popup she closed carries no signs, because she gave none.
 */
function ovulationAnswerProblems(signs: unknown, popup: unknown): readonly string[] {
  if (!Array.isArray(signs)) {
    return popup === 'answered' ? ['an answered ovulation popup carries the signs she picked'] : [];
  }
  if (popup !== 'answered') {
    return ['signs of ovulation are written only with the ovulation popup answered'];
  }
  if (signs.includes(nothingYet) && signs.length > 1) {
    return ['the answer nothing yet stands alone, with no sign beside it'];
  }
  return [];
}

function shown(value: unknown): string {
  return typeof value === 'object' && value !== null
    ? typeof value
    : (JSON.stringify(value) ?? 'nothing');
}
