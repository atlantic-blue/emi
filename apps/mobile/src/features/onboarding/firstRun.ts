import type { DayRecord } from '@emi/crypto';
import { type Flow, daysBetween } from '@emi/cycle';

import type { Database } from '../../data/database';
import { insertDayLog } from '../../data/dayLogRepository';
import { readSetting, writeSetting } from '../../data/settingRepository';
import type { DayVault } from '../../services/vault/dayVault';
import { setLockOnReturn } from '../lock/lockSetting';
import { localDay } from './days';

export const minimumCycleLengthDays = 21;
export const maximumCycleLengthDays = 45;
export const defaultCycleLengthDays = 28;

/** She picks a start day from this many days back, and can edit any older day once she is inside. */
export const longestLookBackDays = 90;

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

export function statedCycleLengthDays(db: Database): number | undefined {
  const held = readSetting(db, 'cycleLengthDays');
  if (held === undefined) {
    return undefined;
  }
  const length = Number(held);

  return Number.isInteger(length) ? length : undefined;
}

export function cycleLengthIsInRange(days: number): boolean {
  return Number.isInteger(days) && days >= minimumCycleLengthDays && days <= maximumCycleLengthDays;
}

/**
 * The two answers land together or not at all. A day written without the settings beside it would
 * send her back to the first screen and then refuse the day she picked there, which is the one
 * shape of half written first run she could not get herself out of.
 */
export function completeFirstRun(
  db: Database,
  vault: DayVault,
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
    insertDayLog(db, { day: recorded.day, payload: vault.seal(recorded), now });
    writeSetting(db, 'cycleLengthDays', String(answers.cycleLengthDays));
    writeSetting(db, 'firstRunCompletedAt', now.toISOString());
    setLockOnReturn(db, true);
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
}
