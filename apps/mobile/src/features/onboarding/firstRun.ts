import type { DayRecord } from '@emi/crypto';
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
 * She is asked when her period started, never how heavy it was, because the heaviness changes no
 * forecast and the first run asks nothing it does not need. A record has no other way to say a day
 * was a bleeding day, so the first run writes the middle value and she can change it on the day.
 */
export const firstRunFlow: Flow = 'medium';

export interface FirstRunAnswers {
  readonly periodStartedOn: string;
  readonly cycleLengthDays: number;
}

export type FirstRunRefusal =
  | 'period-start-is-in-the-future'
  | 'period-start-is-too-long-ago'
  | 'cycle-length-is-out-of-range'
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

/** Her day is sealed under one of these and her answers under the other, both under her one key. */
export interface FirstRunVaults {
  readonly day: DayVault;
  readonly profile: ProfileVault;
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
  if (!cycleLengthIsInRange(answers.cycleLengthDays)) {
    throw new FirstRunError(
      'cycle-length-is-out-of-range',
      `a cycle runs from ${minimumCycleLengthDays} to ${maximumCycleLengthDays} days, this one is ${answers.cycleLengthDays}`,
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
    insertDayLog(db, { day: recorded.day, payload: vaults.day.seal(recorded), now });
    writeProfile(db, vaults.profile, {
      profile: {
        kind: 'profile',
        cycleLengthDays: answers.cycleLengthDays,
        recordedAt: now.toISOString(),
      },
      now,
    });
    writeSetting(db, 'firstRunCompletedAt', now.toISOString());
    setLockOnReturn(db, true);
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
}
