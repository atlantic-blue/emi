import type { DayRecord, ForecastResult } from '@emi/cycle';
import { daysBetween, startsACycle } from '@emi/cycle';

import type { CycleRow } from '../../data/cycleRepository';
import { daysBackFrom, weekdayColumn, weekdayColumnNames } from '../onboarding/days';

/**
 * The seven days ending on today, each one carrying what her own record says about it. Every value
 * here is read from the days she wrote and the cycles they produced, so the strip and the ring
 * above it can never name two different cycles.
 */

/** Seven, because a woman reads a week. */
export const WEEK_STRIP_DAYS = 7;

export interface StripDay {
  readonly day: string;
  /** The first letter of the weekday name, which is what a column is headed with. */
  readonly letter: string;
  /** The day of the month, drawn inside the disc. */
  readonly dateNumber: number;
  /** Counted from the day her cycle started. Nothing before her first recorded cycle has one. */
  readonly cycleDay: number | undefined;
  /** Which day of that period it was, counting from one. Only a day she recorded bleeding on. */
  readonly periodDay: number | undefined;
  /** A day inside the range her next period is expected to start in, which she has not bled on. */
  readonly forecastPeriod: boolean;
  readonly isToday: boolean;
}

export interface WeekStripFrom {
  readonly cycles: readonly CycleRow[];
  readonly records: readonly DayRecord[];
  readonly forecast: ForecastResult;
  readonly today: string;
}

/** The cycle a day belongs to, which is the last one that had started by then. */
function cycleOn(cycles: readonly CycleRow[], day: string): CycleRow | undefined {
  let found: CycleRow | undefined;

  for (const cycle of cycles) {
    if (cycle.startedOn <= day) {
      found = cycle;
    }
  }

  return found;
}

/**
 * Which day of the period she was on, or nothing where the day was not one. The count is the
 * bleeding days of that cycle up to and including this one, and the cycle's own period length
 * closes it, so a bleed after the period ended is not drawn as a later day of it.
 */
function periodDayOn(
  from: WeekStripFrom,
  cycle: CycleRow | undefined,
  day: string,
): number | undefined {
  const record = from.records.find((each) => each.day === day);

  if (cycle === undefined || record === undefined || !startsACycle(record)) {
    return undefined;
  }

  const position = from.records.filter(
    (each) => startsACycle(each) && each.day >= cycle.startedOn && each.day <= day,
  ).length;

  if (cycle.periodLengthDays !== null && position > cycle.periodLengthDays) {
    return undefined;
  }

  return position;
}

/**
 * A day inside the range her next period may start in. The range is what Emi forecasts and a single
 * day is not, so a strip drawn from this can never point at one day and be wrong about it.
 */
function forecastPeriodOn(forecast: ForecastResult, day: string): boolean {
  return forecast.kind === 'forecast' && day >= forecast.start.from && day <= forecast.start.to;
}

export function weekEndingOn(from: WeekStripFrom): StripDay[] {
  const days = daysBackFrom(from.today, WEEK_STRIP_DAYS).reverse();

  return days.map((day) => {
    const cycle = cycleOn(from.cycles, day);
    const cycleDay = cycle === undefined ? undefined : daysBetween(cycle.startedOn, day) + 1;
    const periodDay = periodDayOn(from, cycle, day);

    return {
      day,
      letter: (weekdayColumnNames[weekdayColumn(day)] ?? '').slice(0, 1),
      dateNumber: Number(day.slice(8, 10)),
      cycleDay: cycleDay !== undefined && cycleDay >= 1 ? cycleDay : undefined,
      periodDay,
      forecastPeriod: periodDay === undefined && forecastPeriodOn(from.forecast, day),
      isToday: day === from.today,
    };
  });
}
