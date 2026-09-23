import type { SymptomGroup } from '@emi/cycle';

import { canonicalJson, fromCanonicalBytes, type JsonValue } from './canonical';
import type { DayRecord } from './record';

/**
 * What she told Emi about herself in the first run, from section 2 of the design of the longer
 * first run. Only the kind and the time of the write are required: every other answer had a Skip,
 * and an absent field is the answer she skipped rather than a value nobody filled in.
 */
export interface ProfileRecord {
  readonly kind: 'profile';
  readonly name?: string;
  readonly birthYear?: number;
  readonly cycleLengthDays?: number;
  readonly periodLengthDays?: number;
  readonly regularity?: Regularity;
  readonly feeling?: Feeling;
  readonly goals?: readonly Goal[];
  readonly focus?: readonly Focus[];
  readonly recordedAt: string;
}

/** How steady she says her cycle is, which widens the sentence under the forecast when it moves. */
export type Regularity = 'regular' | 'moves' | 'unknown';

/** How she says she feels about her cycle, which chooses the line the home screen opens with. */
export type Feeling = 'fine' | 'hard' | 'understand';

/** What she came to Emi for, which decides the cards the home screen offers her. */
export type Goal = 'forecast' | 'symptoms' | 'fertileWindow' | 'doctorRecord';

/** The parts of her body she wants watched, which put her own groups first in the log sheet. */
export type Focus = Extract<
  SymptomGroup,
  'sleep' | 'mood' | 'energy' | 'skin' | 'digestion' | 'pain'
>;

/**
 * The one word that tells a profile from a day once both are open. It travels inside the
 * ciphertext, so the server holds two records it cannot tell apart.
 */
export const profileKind = 'profile';

/**
 * Every value of `Regularity`, as data, because a type cannot be read at run time. The test holds
 * the assertion that this list covers the type, so a fourth answer cannot arrive without landing
 * here.
 */
export const regularityValues = [
  'regular',
  'moves',
  'unknown',
] as const satisfies readonly Regularity[];

/** Every value of `Feeling`, for the same reason the list above exists. */
export const feelingValues = ['fine', 'hard', 'understand'] as const satisfies readonly Feeling[];

/** Every value of `Goal`, in the order the screen offers them. */
export const goalValues = [
  'forecast',
  'symptoms',
  'fertileWindow',
  'doctorRecord',
] as const satisfies readonly Goal[];

/**
 * Every value of `Focus`, in the order the screen offers them. Two groups of the catalogue, the
 * head and the libido, are not offered here, so the list is shorter than `symptomGroups`.
 */
export const focusValues = [
  'sleep',
  'mood',
  'energy',
  'skin',
  'digestion',
  'pain',
] as const satisfies readonly Focus[];

/** Every key a profile may carry. A key outside this list is refused rather than sealed. */
export const profileKeys: readonly string[] = [
  'birthYear',
  'cycleLengthDays',
  'feeling',
  'focus',
  'goals',
  'kind',
  'name',
  'periodLengthDays',
  'recordedAt',
  'regularity',
];

/** Characters, counted in code points, so an accented letter costs her one and not two. */
export const longestName = 40;

/** The earliest year of birth the screen accepts, which is old enough for anybody using Emi. */
export const earliestBirthYear = 1940;

/**
 * Years. The latest year of birth is the current year less this, because Emi is not built for a
 * child and a cycle that has not started cannot be tracked.
 */
export const youngestBirthYears = 9;

/** Days. The shortest cycle the first run accepts, and the bound `firstRun.ts` already holds. */
export const shortestCycleLengthDays = 21;

/** Days. The longest cycle the first run accepts, above which she is asked to check the number. */
export const longestCycleLengthDays = 45;

/** Days. One day of bleeding is a period, so the shortest period she can state is a single day. */
export const shortestPeriodLengthDays = 1;

/** Days. Beyond this the number is a typing mistake rather than a period she lived. */
export const longestPeriodLengthDays = 15;

/**
 * Holds every problem the profile carries, not the first one, so the message and the list are one
 * failure read two ways.
 */
export class ProfileError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`this profile cannot be sealed: ${problems.join('; ')}`);
    this.name = 'ProfileError';
    this.problems = problems;
  }
}

/** The seam a test reaches for: which day the year of birth is measured against. */
export interface ProfileOptions {
  /** The instant the upper bound on the year of birth is read from. Left out, it is now. */
  readonly now?: Date;
}

/**
 * Every offence, not the first one, so a screen can show her everything that is wrong in one pass.
 * The clock is a parameter because the newest year of birth moves with it.
 */
export function profileProblems(
  profile: ProfileRecord,
  options: ProfileOptions = {},
): readonly string[] {
  const held = profile as unknown as Record<string, unknown>;
  const problems: string[] = [];

  for (const key of Object.keys(held)) {
    if (!profileKeys.includes(key)) {
      problems.push(`${key} is not a field of a profile`);
    }
  }

  problems.push(...kindProblems(held.kind));
  problems.push(...instantProblems(held.recordedAt));
  problems.push(...nameProblems(held.name));
  problems.push(...birthYearProblems(held.birthYear, options.now ?? new Date()));
  problems.push(
    ...wholeNumberProblems(held.cycleLengthDays, {
      field: 'a cycle length',
      lowest: shortestCycleLengthDays,
      highest: longestCycleLengthDays,
    }),
  );
  problems.push(
    ...wholeNumberProblems(held.periodLengthDays, {
      field: 'a period length',
      lowest: shortestPeriodLengthDays,
      highest: longestPeriodLengthDays,
    }),
  );
  problems.push(...oneOfProblems(held.regularity, 'a regularity', regularityValues));
  problems.push(...oneOfProblems(held.feeling, 'a feeling', feelingValues));
  problems.push(...chosenListProblems(held.goals, 'a goal', goalValues));
  problems.push(...chosenListProblems(held.focus, 'a focus', focusValues));

  return problems;
}

/** Hands the profile back, or throws. Every path to an envelope goes through here. */
export function checkedProfile(
  profile: ProfileRecord,
  options: ProfileOptions = {},
): ProfileRecord {
  const problems = profileProblems(profile, options);
  if (problems.length > 0) {
    throw new ProfileError(problems);
  }
  return profile;
}

/** The text that goes inside the envelope: canonical json of answers that passed every range. */
export function profileJson(profile: ProfileRecord, options: ProfileOptions = {}): string {
  return canonicalJson(checkedProfile(profile, options) as unknown as JsonValue);
}

/** The plaintext of an envelope: a profile that passed its ranges, written as canonical bytes. */
export function profileBytes(profile: ProfileRecord, options: ProfileOptions = {}): Uint8Array {
  return new TextEncoder().encode(profileJson(profile, options));
}

/**
 * What comes back out of the envelope. The ranges are not re-checked here, as they are not for a
 * day: answers she gave years ago are hers to read, whatever the bounds say now. The kind is
 * checked, because bytes that carry a day are not a profile at any age.
 */
export function profileFromBytes(bytes: Uint8Array): ProfileRecord {
  const value = plainObjectFrom(bytes);
  if (value.kind !== profileKind) {
    throw new ProfileError([`a profile names its kind as ${profileKind}, these bytes do not`]);
  }
  return value as unknown as ProfileRecord;
}

/** One record off the server, read as whichever of the two shapes its kind says it is. */
export type PulledRecord =
  | { readonly kind: 'profile'; readonly profile: ProfileRecord }
  | { readonly kind: 'day'; readonly day: DayRecord };

/**
 * Sorts opened bytes into the two shapes that travel in an envelope. A day names no kind, so
 * anything that is not a profile is read as a day and her history keeps opening.
 */
export function pulledFromBytes(bytes: Uint8Array): PulledRecord {
  const value = plainObjectFrom(bytes);

  return value.kind === profileKind
    ? { kind: 'profile', profile: value as unknown as ProfileRecord }
    : { kind: 'day', day: value as unknown as DayRecord };
}

function plainObjectFrom(bytes: Uint8Array): Record<string, unknown> {
  const value = fromCanonicalBytes(bytes);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ProfileError(['the plaintext is not a record']);
  }
  return value as Record<string, unknown>;
}

function kindProblems(value: unknown): readonly string[] {
  if (value === undefined) {
    return ['a profile names no kind'];
  }
  return value === profileKind
    ? []
    : [`a profile names its kind as ${profileKind}, this one is ${shown(value)}`];
}

function instantProblems(value: unknown): readonly string[] {
  if (value === undefined) {
    return ['a profile names no time it was saved'];
  }
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    return [`the time it was saved is not an instant, it is ${shown(value)}`];
  }
  return [];
}

const lineBreak = /[\r\n]/;

function nameProblems(value: unknown): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (typeof value !== 'string') {
    return [`a name is text, this one is ${shown(value)}`];
  }
  if (lineBreak.test(value)) {
    return ['a name sits on one line, this one carries a line break'];
  }

  const characters = [...value.trim()].length;
  if (characters === 0) {
    return ['a name she gave holds at least one character, this one holds none'];
  }
  return characters > longestName
    ? [`a name holds at most ${longestName} characters, this one holds ${characters}`]
    : [];
}

function birthYearProblems(value: unknown, now: Date): readonly string[] {
  const latest = now.getFullYear() - youngestBirthYears;
  return wholeNumberProblems(value, {
    field: 'a year of birth',
    lowest: earliestBirthYear,
    highest: latest,
  });
}

interface Bound {
  readonly field: string;
  readonly lowest: number;
  readonly highest: number;
}

function wholeNumberProblems(value: unknown, bound: Bound): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return [`${bound.field} is a whole number, this one is ${shown(value)}`];
  }
  if (value < bound.lowest || value > bound.highest) {
    return [`${bound.field} runs from ${bound.lowest} to ${bound.highest}, this one is ${value}`];
  }
  return [];
}

function oneOfProblems(
  value: unknown,
  field: string,
  allowed: readonly string[],
): readonly string[] {
  if (value === undefined) {
    return [];
  }
  return (allowed as readonly unknown[]).includes(value)
    ? []
    : [`${field} is one of ${allowed.join(', ')}, this one is ${shown(value)}`];
}

/**
 * A list she built by tapping, so the order is hers and is kept. Membership caps the length on its
 * own: the values are distinct and there are only so many of them to choose from.
 */
function chosenListProblems(
  value: unknown,
  field: string,
  allowed: readonly string[],
): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return [`${field} list is a list, this one is ${shown(value)}`];
  }

  const chosen = value as readonly unknown[];
  const outside = chosen.filter((item) => !(allowed as readonly unknown[]).includes(item));
  if (outside.length > 0) {
    return [
      `${field} is one of ${allowed.join(', ')}, these are not: ${outside.map(shown).join(', ')}`,
    ];
  }

  const twice = chosen.filter((item, index) => chosen.indexOf(item) !== index);
  return twice.length > 0
    ? [
        `${field} is chosen once, these were chosen twice: ${[...new Set(twice)].map(shown).join(', ')}`,
      ]
    : [];
}

function shown(value: unknown): string {
  return typeof value === 'object' && value !== null
    ? typeof value
    : (JSON.stringify(value) ?? 'nothing');
}
