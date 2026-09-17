import { type Flow, unknownSymptomSlugs, type Symptom } from '@emi/cycle';

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
  readonly recordedAt: string;
}

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
  'energy',
  'flow',
  'moods',
  'note',
  'recordedAt',
  'symptoms',
  'temperatureCelsius',
  'weightKilograms',
];

export const lowestTemperatureCelsius = 34;
export const highestTemperatureCelsius = 42;
export const lowestWeightKilograms = 20;
export const highestWeightKilograms = 400;
export const lowestEnergy = 1;
export const highestEnergy = 5;
export const longestNote = 2000;

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
  problems.push(...moodProblems(held.moods));
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

  return problems;
}

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

function moodProblems(value: unknown): readonly string[] {
  // The mood catalogue arrives with the mood picker, so a mood is checked for the shape of a slug
  // and not yet for its membership.
  return slugListProblems(value, 'a mood');
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

function shown(value: unknown): string {
  return typeof value === 'object' && value !== null
    ? typeof value
    : (JSON.stringify(value) ?? 'nothing');
}
