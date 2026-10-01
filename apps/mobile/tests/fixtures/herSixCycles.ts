import type { DayRecord } from '@emi/crypto';
import { CYCLE_LENGTH_HIGH_DAYS, CYCLE_LENGTH_LOW_DAYS, addDays } from '@emi/cycle';

import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { daysOf } from '../../../../packages/cycle/tests/fixtures/recordedSets';

/**
 * The phone the trend chart is read off, shared by the scenario and by the integration test so the
 * two are held to one woman rather than to two that happen to look alike.
 *
 * The six lengths are chosen so three of them fall outside the published range, one of those three
 * is the oldest, and one is below the range while two are above it. A set whose only cycle outside
 * the range sat in the middle would let a chart reading five cycles pass, and reading five rather
 * than six is the fault this step is mutation checked against. A set outside the range at one end
 * only would let a chart counting one side pass.
 */

export const herCycleLengths: readonly number[] = [40, 22, 30, 28, 39, 27];

export const herPeriodRunsFor = 5;

/** The day of the running cycle she opens Emi on, which is nowhere near either end of it. */
export const theDaySheOpensItOn = 8;

/** The cycles of hers that ran outside the published range, which is what the sentence counts. */
export const herCyclesOutsideTheBand: readonly number[] = herCycleLengths.filter(
  (length) => length < CYCLE_LENGTH_LOW_DAYS || length > CYCLE_LENGTH_HIGH_DAYS,
);

/**
 * Her days, counted back from the day she opens Emi, so the cycle she is standing in is the one the
 * scenario names. Each day carries the moment she wrote it, which the seeding needs and the
 * recorded sets do not carry.
 */
export function daysOfHerSixCycles(
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
