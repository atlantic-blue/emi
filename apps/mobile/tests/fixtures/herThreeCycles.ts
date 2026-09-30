import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';

import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { daysOf } from '../../../../packages/cycle/tests/fixtures/recordedSets';

/**
 * The phone her three numbers are read off, shared by the scenario and by the integration test so
 * the two are held to one woman rather than to two that happen to look alike.
 *
 * The three lengths are chosen so that her cycle length, her period length and her variation are
 * three different numbers. A set where two of them agreed would let a row drawing the wrong number
 * pass, and the swap this step is mutation checked against is exactly that fault.
 */

export const herCycleLengths: readonly number[] = [24, 30, 31];

export const herPeriodRunsFor = 5;

/** The day of the running cycle she opens Emi on, which is nowhere near either end of it. */
export const theDaySheOpensItOn = 8;

/** The most recent cycle the cache closed, which is where her two lengths are read from. */
export const herLastCycleRuns = 31;
export const herLastPeriodRuns = herPeriodRunsFor;

/** One standard deviation of 24, 30 and 31, over n minus one, at one decimal place. */
export const herCyclesVaryBy = 3.8;

/**
 * Her days, counted back from the day she opens Emi, so the cycle she is standing in is the one
 * the scenario names. Each day carries the moment she wrote it, which the seeding needs and the
 * recorded sets do not carry.
 */
export function daysOfHerThreeCycles(
  today: string,
  lengths: readonly number[] = herCycleLengths,
): DayRecord[] {
  const ranAltogether = lengths.reduce((total, length) => total + length, 0);
  const set: RecordedSet = {
    firstStart: addDays(today, -(theDaySheOpensItOn - 1) - ranAltogether),
    lengths,
    periodDays: herPeriodRunsFor,
  };

  return daysOf(set).map((day) => ({ ...day, recordedAt: `${day.day}T08:00:00.000Z` }));
}
