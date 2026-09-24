import {
  type DayRecord,
  type Feeling,
  type Goal,
  type ProfileRecord,
  type Regularity,
  earliestBirthYear,
  feelingValues,
  goalValues,
  longestName,
  longestPeriodLengthDays,
  regularityValues,
  shortestPeriodLengthDays,
  youngestBirthYears,
} from '@emi/crypto';
import { type Flow, addDays, daysBetween } from '@emi/cycle';

import type { Database } from '../../data/database';
import { insertDayLog } from '../../data/dayLogRepository';
import { readProfile, writeProfile } from '../../data/profileRepository';
import { readSetting, writeSetting } from '../../data/settingRepository';
import type { DayVault } from '../../services/vault/dayVault';
import type { ProfileVault } from '../../services/vault/profileVault';
import { setLockOnReturn } from '../lock/lockSetting';
import { localDay } from './days';

export const minimumCycleLengthDays = 21;
export const maximumCycleLengthDays = 45;
export const defaultCycleLengthDays = 28;

/** Days. The bounds a stated period runs between, held where the profile holds them. */
export const minimumPeriodLengthDays = shortestPeriodLengthDays;
export const maximumPeriodLengthDays = longestPeriodLengthDays;

/**
 * Days. The number the stepper opens on, which is the middle of the range most periods fall in
 * rather than an average Emi has measured.
 */
export const defaultPeriodLengthDays = 5;

/** She picks a start day from this many days back, and can edit any older day once she is inside. */
export const longestLookBackDays = 90;

/** The oldest day the first run accepts, which is the far end of the calendar she can reach. */
export function oldestPeriodStart(today: string): string {
  return addDays(today, -longestLookBackDays);
}

/**
 * Whether the first run accepts this day, asked before she picks rather than after. The calendar
 * draws every day of the month she is looking at, so it needs the same answer one square at a time.
 */
export function periodStartIsInRange(day: string, today: string): boolean {
  const back = daysBetween(day, today);

  return back >= 0 && back <= longestLookBackDays;
}

/**
 * Whether the day she gave can be the period before the one she gave. The two starts are one
 * cycle, so the distance between them is held to the bounds a cycle runs between: a day nearer
 * than that is the same period again, and a day further back leaves a cycle nobody recorded.
 */
export function periodBeforeIsInRange(periodBefore: string, periodStartedOn: string): boolean {
  const between = daysBetween(periodBefore, periodStartedOn);

  return between >= minimumCycleLengthDays && between <= maximumCycleLengthDays;
}

/**
 * She is asked when her period started, never how heavy it was, because the heaviness changes no
 * forecast and the first run asks nothing it does not need. A record has no other way to say a day
 * was a bleeding day, so the first run writes the middle value and she can change it on the day.
 */
export const firstRunFlow: Flow = 'medium';

export interface FirstRunAnswers {
  readonly periodStartedOn: string;
  readonly cycleLengthDays: number;
  /**
   * The start before that one, left out where she does not remember it. Where she gives it, the
   * two starts are one cycle she lived, which is worth more than the length she estimated.
   */
  readonly periodBeforeStartedOn?: string;
  /** Left out where she skipped the question, and then her profile carries no name at all. */
  readonly name?: string;
  /** Left out where she skipped the question. Nothing reads it, which contract SCREEN-1 names. */
  readonly birthYear?: number;
  /**
   * How many days she says her period runs. Left out where she answered that she is not sure, and
   * then the ring counts the days she logs instead.
   */
  readonly periodLengthDays?: number;
  /**
   * How steady she says her cycle is. Left out where she skipped the question. It changes one
   * sentence under the forecast and never the range, which is arithmetic over the days she logged.
   */
  readonly regularity?: Regularity;
  /**
   * How she feels about her cycle. Left out where she skipped the question. It changes what the
   * home screen offers her on a day inside her period and nothing about the arithmetic.
   */
  readonly feeling?: Feeling;
  /**
   * What she came to Emi for. Left out where she skipped the question, and then the home screen
   * offers her the cards it offers anybody. An empty list is never written: choosing nothing and
   * skipping are the same answer, so both leave the key off her profile.
   */
  readonly goals?: readonly Goal[];
}

export type FirstRunRefusal =
  | 'period-start-is-in-the-future'
  | 'period-start-is-too-long-ago'
  | 'period-before-is-out-of-range'
  | 'cycle-length-is-out-of-range'
  | 'name-is-out-of-range'
  | 'birth-year-is-out-of-range'
  | 'period-length-is-out-of-range'
  | 'regularity-is-not-one-of-the-three'
  | 'feeling-is-not-one-of-the-three'
  | 'goal-is-not-one-of-the-four'
  | 'goal-is-chosen-twice'
  | 'first-run-is-already-done';

export class FirstRunError extends Error {
  readonly refusal: FirstRunRefusal;

  constructor(refusal: FirstRunRefusal, message: string) {
    super(message);
    this.name = 'FirstRunError';
    this.refusal = refusal;
  }
}

export function firstRunIsDone(db: Database): boolean {
  return readSetting(db, 'firstRunCompletedAt') !== undefined;
}

/**
 * How long she said her cycle runs, read from the sealed profile. It is a fact about her body, so
 * the setting table does not hold it and migration 006 moved the phones that once did.
 */
export function statedCycleLengthDays(db: Database, vault: ProfileVault): number | undefined {
  return readProfile(db, vault)?.cycleLengthDays;
}

export function cycleLengthIsInRange(days: number): boolean {
  return Number.isInteger(days) && days >= minimumCycleLengthDays && days <= maximumCycleLengthDays;
}

/**
 * How long she said her period runs, read from the sealed profile. Nothing at all is the answer
 * she gave by saying she is not sure, and the ring reads that as a question to leave to her days.
 */
export function statedPeriodLengthDays(db: Database, vault: ProfileVault): number | undefined {
  return readProfile(db, vault)?.periodLengthDays;
}

/**
 * How steady she said her cycle is, read from the sealed profile. Nothing at all is the answer a
 * Skip leaves behind, and then the forecast says nothing about how steady her cycle is.
 */
export function statedRegularity(db: Database, vault: ProfileVault): Regularity | undefined {
  return readProfile(db, vault)?.regularity;
}

/** Whether the answer is one of the three the screen offers, asked of a value from anywhere. */
export function regularityIsOffered(answer: string): answer is Regularity {
  return (regularityValues as readonly string[]).includes(answer);
}

/**
 * How she said her period feels, read from the sealed profile. Nothing at all is the answer a Skip
 * leaves behind, and then the home screen offers her nothing it would not offer anybody else.
 */
export function statedFeeling(db: Database, vault: ProfileVault): Feeling | undefined {
  return readProfile(db, vault)?.feeling;
}

/** Whether the answer is one of the three that screen offers, asked of a value from anywhere. */
export function feelingIsOffered(answer: string): answer is Feeling {
  return (feelingValues as readonly string[]).includes(answer);
}

/**
 * What she said she came to Emi for, read from the sealed profile. Nothing at all is the answer a
 * Skip leaves behind, and then the home screen draws the cards it draws for everybody.
 */
export function statedGoals(db: Database, vault: ProfileVault): readonly Goal[] | undefined {
  return readProfile(db, vault)?.goals;
}

/** Whether the answer is one of the four that screen offers, asked of a value from anywhere. */
export function goalIsOffered(answer: string): answer is Goal {
  return (goalValues as readonly string[]).includes(answer);
}

/**
 * Her list after she presses one row: the goal is added where it was not there, and taken out
 * where it was. The order is the order she tapped, because the list she built is hers and the two
 * readers ask only whether a goal is in it.
 */
export function goalsAfterPressing(chosen: readonly Goal[], pressed: Goal): readonly Goal[] {
  return chosen.includes(pressed)
    ? chosen.filter((goal) => goal !== pressed)
    : [...chosen, pressed];
}

export function periodLengthIsInRange(days: number): boolean {
  return (
    Number.isInteger(days) && days >= minimumPeriodLengthDays && days <= maximumPeriodLengthDays
  );
}

/** How long the name she typed is, counted in code points, as the profile counts it. */
function nameLength(typed: string): number {
  return [...typed.trim()].length;
}

/**
 * The name that goes into her profile, or nothing at all. A field she left empty is the same
 * answer as the Skip beside it, so it writes no name rather than an empty one.
 */
export function nameSheGave(typed: string): string | undefined {
  const trimmed = typed.trim();

  return trimmed === '' ? undefined : trimmed;
}

/** Whether the screen lets her go on, asked as she types rather than after she presses. */
export function nameIsInRange(typed: string): boolean {
  return nameLength(typed) <= longestName;
}

/**
 * The newest year of birth Emi offers, which moves with the clock. Emi is not built for a child,
 * and a cycle that has not started cannot be tracked.
 */
export function latestBirthYear(now: Date): number {
  return now.getFullYear() - youngestBirthYears;
}

/** Years back from now to the year the wheel opens on. */
const yearsBackToTheMiddle = 30;

/**
 * The year the wheel opens on, which is not an answer: nothing is chosen until she presses a year.
 * It moves with the clock, so the wheel always opens the same distance into the list of years.
 */
export function middleBirthYear(now: Date): number {
  return now.getFullYear() - yearsBackToTheMiddle;
}

/**
 * Every year the wheel offers, newest first, from the newest year Emi is built for down to 1940.
 */
export function birthYearsOffered(now: Date): readonly number[] {
  const latest = latestBirthYear(now);

  return Array.from({ length: latest - earliestBirthYear + 1 }, (_unused, at) => latest - at);
}

export function birthYearIsInRange(year: number, now: Date): boolean {
  return Number.isInteger(year) && year >= earliestBirthYear && year <= latestBirthYear(now);
}

/** Her day is sealed under one of these and her answers under the other, both under her one key. */
export interface FirstRunVaults {
  readonly day: DayVault;
  readonly profile: ProfileVault;
}

/** What the hold asks for before it writes: her key, made if this phone holds none. */
export type MakeFirstRunVaults = () => Promise<FirstRunVaults>;

/**
 * Everything she answered, written at the moment she presses and holds the ring.
 *
 * Her key comes first and the vaults are built from whatever the keychain holds then, because a
 * row sealed under a key the keychain does not hold is a row nothing opens again. The write is the
 * call under it, so a first run she walks away from before the hold leaves the database as it was.
 */
export async function writeEverythingAtTheHold(
  db: Database,
  makeHerVaults: MakeFirstRunVaults,
  answers: FirstRunAnswers,
  now: Date,
): Promise<void> {
  const vaults = await makeHerVaults();

  completeFirstRun(db, vaults, answers, now);
}

/**
 * Her answers as the profile record holds them. A question she skipped leaves its key off the
 * record rather than carrying an empty one, because the canonical bytes are what a later phone
 * reads back and "she said nothing" and "she said nothing in particular" are different answers.
 */
function herProfile(answers: FirstRunAnswers, now: Date): ProfileRecord {
  return {
    kind: 'profile',
    ...(answers.name === undefined ? {} : { name: answers.name }),
    ...(answers.birthYear === undefined ? {} : { birthYear: answers.birthYear }),
    cycleLengthDays: answers.cycleLengthDays,
    ...(answers.periodLengthDays === undefined
      ? {}
      : { periodLengthDays: answers.periodLengthDays }),
    ...(answers.regularity === undefined ? {} : { regularity: answers.regularity }),
    ...(answers.feeling === undefined ? {} : { feeling: answers.feeling }),
    ...(answers.goals === undefined || answers.goals.length === 0 ? {} : { goals: answers.goals }),
    recordedAt: now.toISOString(),
  };
}

/**
 * Her two answers land together or not at all. A day written without her profile beside it would
 * send her back to the first screen and then refuse the day she picked there, which is the one
 * shape of half written first run she could not get herself out of.
 */
export function completeFirstRun(
  db: Database,
  vaults: FirstRunVaults,
  answers: FirstRunAnswers,
  now: Date,
): void {
  const today = localDay(now);
  const back = daysBetween(answers.periodStartedOn, today);

  if (back < 0) {
    throw new FirstRunError(
      'period-start-is-in-the-future',
      `a period cannot start on ${answers.periodStartedOn}, which is after ${today}`,
    );
  }
  if (back > longestLookBackDays) {
    throw new FirstRunError(
      'period-start-is-too-long-ago',
      `${answers.periodStartedOn} is ${back} days back, and the first run reaches ${longestLookBackDays}`,
    );
  }
  if (
    answers.periodBeforeStartedOn !== undefined &&
    !periodBeforeIsInRange(answers.periodBeforeStartedOn, answers.periodStartedOn)
  ) {
    throw new FirstRunError(
      'period-before-is-out-of-range',
      `a cycle runs from ${minimumCycleLengthDays} to ${maximumCycleLengthDays} days, and ${answers.periodBeforeStartedOn} is ${daysBetween(answers.periodBeforeStartedOn, answers.periodStartedOn)} days before ${answers.periodStartedOn}`,
    );
  }
  if (!cycleLengthIsInRange(answers.cycleLengthDays)) {
    throw new FirstRunError(
      'cycle-length-is-out-of-range',
      `a cycle runs from ${minimumCycleLengthDays} to ${maximumCycleLengthDays} days, this one is ${answers.cycleLengthDays}`,
    );
  }
  if (answers.name !== undefined && !nameIsInRange(answers.name)) {
    throw new FirstRunError(
      'name-is-out-of-range',
      `a name holds at most ${longestName} characters, this one holds ${nameLength(answers.name)}`,
    );
  }
  if (answers.birthYear !== undefined && !birthYearIsInRange(answers.birthYear, now)) {
    throw new FirstRunError(
      'birth-year-is-out-of-range',
      `a year of birth runs from ${earliestBirthYear} to ${latestBirthYear(now)}, this one is ${answers.birthYear}`,
    );
  }
  if (answers.periodLengthDays !== undefined && !periodLengthIsInRange(answers.periodLengthDays)) {
    throw new FirstRunError(
      'period-length-is-out-of-range',
      `a period runs from ${minimumPeriodLengthDays} to ${maximumPeriodLengthDays} days, this one is ${answers.periodLengthDays}`,
    );
  }
  if (answers.regularity !== undefined && !regularityIsOffered(answers.regularity)) {
    throw new FirstRunError(
      'regularity-is-not-one-of-the-three',
      `a cycle is one of ${regularityValues.join(', ')}, this one is ${answers.regularity}`,
    );
  }
  if (answers.feeling !== undefined && !feelingIsOffered(answers.feeling)) {
    throw new FirstRunError(
      'feeling-is-not-one-of-the-three',
      `a feeling is one of ${feelingValues.join(', ')}, this one is ${answers.feeling}`,
    );
  }
  const chosenGoals = answers.goals ?? [];
  const outsideTheFour = chosenGoals.filter((goal) => !goalIsOffered(goal));
  if (outsideTheFour.length > 0) {
    throw new FirstRunError(
      'goal-is-not-one-of-the-four',
      `a goal is one of ${goalValues.join(', ')}, these are not: ${outsideTheFour.join(', ')}`,
    );
  }
  const chosenTwice = chosenGoals.filter((goal, at) => chosenGoals.indexOf(goal) !== at);
  if (chosenTwice.length > 0) {
    throw new FirstRunError(
      'goal-is-chosen-twice',
      `a goal is chosen once, these were chosen twice: ${[...new Set(chosenTwice)].join(', ')}`,
    );
  }
  if (firstRunIsDone(db)) {
    throw new FirstRunError('first-run-is-already-done', 'the first run is already done');
  }

  const recorded: DayRecord = {
    day: answers.periodStartedOn,
    flow: firstRunFlow,
    recordedAt: now.toISOString(),
  };

  db.execute('BEGIN');
  try {
    if (answers.periodBeforeStartedOn !== undefined) {
      const earlier: DayRecord = {
        day: answers.periodBeforeStartedOn,
        flow: firstRunFlow,
        recordedAt: now.toISOString(),
      };

      insertDayLog(db, { day: earlier.day, payload: vaults.day.seal(earlier), now });
    }
    insertDayLog(db, { day: recorded.day, payload: vaults.day.seal(recorded), now });
    writeProfile(db, vaults.profile, { profile: herProfile(answers, now), now });
    writeSetting(db, 'firstRunCompletedAt', now.toISOString());
    setLockOnReturn(db, true);
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
}
