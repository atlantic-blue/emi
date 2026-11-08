import type { DayRecord } from '@emi/crypto';
import { cyclesFrom } from '@emi/cycle';

import type { CycleRow } from '../../../src/data/cycleRepository';
import { theExpectedDays } from '../../../src/features/cycle/expectedDays';

/**
 * The days Emi expects of the period she is in: after the first day she recorded, up to her usual
 * period length and never past eight days in all, and only on days she recorded no flow.
 */

function aDay(day: string, flow: DayRecord['flow']): DayRecord {
  return { day, flow, recordedAt: `${day}T08:00:00.000Z` };
}

/** Her cycles, as the cache holds them after a rebuild from these days. */
function theCyclesOf(records: readonly DayRecord[]): CycleRow[] {
  return cyclesFrom(records).map((cycle, at) => ({
    endedOn: cycle.endedOn,
    id: `cycle-${String(at)}`,
    isPredicted: false,
    lengthDays: cycle.lengthDays,
    periodLengthDays: cycle.periodDays,
    startedOn: cycle.startedOn,
  }));
}

function expectedFor(
  records: readonly DayRecord[],
  statedPeriodLengthDays: number | undefined,
  today = '2026-10-23',
): string[] {
  return theExpectedDays({
    cycles: theCyclesOf(records),
    records,
    today,
    ...(statedPeriodLengthDays === undefined ? {} : { statedPeriodLengthDays }),
  });
}

describe('the days Emi expects of her period', () => {
  it('are the days after the first day, up to her usual length', () => {
    expect(expectedFor([aDay('2026-10-18', 'medium')], 5)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ]);
  });

  it('reach days ahead of her too, while the period is open', () => {
    expect(expectedFor([aDay('2026-10-22', 'medium')], 4)).toEqual([
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });

  it('are none where she said she is not sure how long her period runs', () => {
    expect(expectedFor([aDay('2026-10-18', 'medium')], undefined)).toEqual([]);
  });

  it('leave out a day she recorded a flow on', () => {
    expect(expectedFor([aDay('2026-10-18', 'medium'), aDay('2026-10-20', 'heavy')], 5)).toEqual([
      '2026-10-19',
      '2026-10-21',
      '2026-10-22',
    ]);
  });

  it('stop at a day she recorded no bleeding on, so the period ends the day before', () => {
    expect(expectedFor([aDay('2026-10-18', 'medium'), aDay('2026-10-20', 'none')], 5)).toEqual([
      '2026-10-19',
    ]);
  });

  it('are none for a period her own days already closed', () => {
    expect(
      expectedFor(
        [aDay('2026-10-18', 'medium'), aDay('2026-10-19', 'light'), aDay('2026-10-20', 'none')],
        5,
      ),
    ).toEqual([]);
  });

  it('stop at eight days in all where her usual length is longer', () => {
    const expected = expectedFor([aDay('2026-10-18', 'medium')], 12, '2026-10-30');

    expect(expected).toHaveLength(7);
    expect(expected.at(-1)).toBe('2026-10-25');
  });

  it('belong to the period she is in, so a new first day takes the old ones away', () => {
    expect(expectedFor([aDay('2026-09-20', 'medium'), aDay('2026-10-18', 'medium')], 3)).toEqual([
      '2026-10-19',
      '2026-10-20',
    ]);
  });

  it('are none before she records a first day', () => {
    expect(expectedFor([], 5)).toEqual([]);
  });

  it('are none for a period that has not started yet, before today', () => {
    expect(expectedFor([aDay('2026-10-18', 'medium')], 5, '2026-10-10')).toEqual([]);
  });
});
