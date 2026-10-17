import { type DayRecord, daysBetween, startsACycle } from '@emi/cycle';

import type { CycleRow } from '../../data/cycleRepository';
import type { SexAnswers } from '../log/logDay';

/**
 * When the Sex page suggests a menstrual disc or a sponge (issue 306), from her own sex and period
 * records. Nothing new is stored: the rule reads the day before the save and the day after it.
 */

export interface PeriodDayFrom {
  readonly records: readonly DayRecord[];
  readonly cycles: readonly CycleRow[];
}

/**
 * The day of her period a date is, counted from one, or nothing when it is not a period day. A
 * period day is a day she recorded bleeding on and did not mark as not her period. The count runs
 * from the start of the cycle that holds the date, which is the first day of that period.
 */
export function periodDayOn(from: PeriodDayFrom, day: string): number | undefined {
  const record = from.records.find((held) => held.day === day);
  if (record === undefined || !startsACycle(record)) {
    return undefined;
  }

  const holding = from.cycles
    .filter((cycle) => !cycle.isPredicted && cycle.startedOn <= day)
    .reduce<CycleRow | undefined>(
      (latest, cycle) =>
        latest === undefined || cycle.startedOn > latest.startedOn ? cycle : latest,
      undefined,
    );

  return holding === undefined ? undefined : daysBetween(holding.startedOn, day) + 1;
}

function holdsSex(answers: SexAnswers): boolean {
  return answers.sex !== undefined && answers.sex !== 'none';
}

/**
 * Whether a save should open the suggestion: the save records sex on a day that held none, and the
 * day is a period day. A later save of the same day already holds sex, so the sheet shows at most
 * once for that day.
 */
export function suggestsPeriodProducts(change: {
  readonly before: SexAnswers;
  readonly after: SexAnswers;
  readonly periodDay: number | undefined;
}): boolean {
  return change.periodDay !== undefined && holdsSex(change.after) && !holdsSex(change.before);
}
