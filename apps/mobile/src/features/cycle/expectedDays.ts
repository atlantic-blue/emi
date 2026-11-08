import { type DayRecord, PERIOD_MAY_RUN_FOR_DAYS, addDays, startsACycle } from '@emi/cycle';

import type { CycleRow } from '../../data/cycleRepository';

export interface ExpectedDaysFrom {
  readonly cycles: readonly CycleRow[];
  readonly records: readonly DayRecord[];
  readonly today: string;
  /** Her usual period length. Nothing at all where she said she is not sure, and then none. */
  readonly statedPeriodLengthDays?: number;
}

/**
 * The days Emi expects of the period she is in, worked out each time and never stored.
 *
 * They follow the first day she recorded, up to her usual period length and never past eight days
 * in all, because bleeding inside eight days of a start is one period and a ninth day would start
 * another. A day she recorded a flow on is hers, so it is left out. A recorded day that is not her
 * period ends the period the day before it, so no day after it is expected.
 */
export function theExpectedDays(from: ExpectedDaysFrom): string[] {
  const usual = from.statedPeriodLengthDays;
  const current = from.cycles
    .filter((cycle) => !cycle.isPredicted && cycle.startedOn <= from.today)
    .at(-1);

  if (usual === undefined || current === undefined) {
    return [];
  }

  const held = new Map(from.records.map((record) => [record.day, record]));
  const inAll = Math.min(usual, PERIOD_MAY_RUN_FOR_DAYS);
  const expected: string[] = [];

  for (let offset = 1; offset < inAll; offset += 1) {
    const day = addDays(current.startedOn, offset);
    const record = held.get(day);

    if (record?.flow !== undefined && !startsACycle(record)) {
      break;
    }
    if (record?.flow === undefined) {
      expected.push(day);
    }
  }

  return expected;
}
