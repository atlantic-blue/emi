import type { DayRecord } from '@emi/crypto';

import type { CycleRow } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import type { DayVault } from '../../services/vault/dayVault';
import { savePeriodRange, sheCanSave, thePeriodEmiHoldsAround } from '../calendar/savePeriod';
import type { DaysAndCycles } from '../cycle/rebuild';
import {
  PAST_PERIODS_ASKED,
  type PastPeriod,
  longestPastPeriodDays,
  startIsOneCycleBefore,
  theDaysItBled,
} from './pastPeriods';

/**
 * The list of her last periods outside the first run, which the forecast popup opens. It opens on
 * the periods Emi already holds, so she adds to them rather than writing them twice, and one save
 * writes the difference, the way Edit my period does.
 */

/** A period Emi holds, as a row of the list, and the days it holds under that row. */
export interface HeldPeriod {
  readonly period: PastPeriod;
  readonly days: readonly string[];
}

/**
 * Her newest recorded periods, the newest first, up to three. A period older than one cycle before
 * the row above it ends the list, because the list holds each row to one cycle before the row above.
 */
export function thePeriodsEmiHolds(
  records: readonly DayRecord[],
  cycles: readonly CycleRow[],
  today: string,
): HeldPeriod[] {
  const newestFirst = cycles
    .filter((cycle) => !cycle.isPredicted && cycle.startedOn <= today)
    .map((cycle) => cycle.startedOn)
    .sort()
    .reverse();
  const held: HeldPeriod[] = [];

  for (const startedOn of newestFirst) {
    const above = held[held.length - 1];
    if (held.length === PAST_PERIODS_ASKED) {
      break;
    }
    if (above !== undefined && !startIsOneCycleBefore(startedOn, above.period.startedOn)) {
      break;
    }

    const days = thePeriodEmiHoldsAround(records, cycles, { day: startedOn, today });
    if (days.length === 0) {
      break;
    }
    held.push({
      days,
      period: { lengthDays: Math.min(days.length, longestPastPeriodDays), startedOn },
    });
  }

  return held;
}

/** The days she holds as her periods now: a row she left alone keeps every day Emi held for it. */
export function theDaysSheIsHolding(
  held: readonly HeldPeriod[],
  periods: readonly PastPeriod[],
  today: string,
): string[] {
  const days = periods.flatMap((period) => {
    const same = held.find(
      (each) =>
        each.period.startedOn === period.startedOn && each.period.lengthDays === period.lengthDays,
    );

    return same === undefined ? theDaysItBled(period, today) : same.days;
  });

  return [...new Set(days)].sort();
}

function theDaysEmiHeld(held: readonly HeldPeriod[]): string[] {
  return [...new Set(held.flatMap((each) => each.days))].sort();
}

/** Whether Save is offered: something changed, and she is left holding at least one period. */
export function pastPeriodsCanSave(
  held: readonly HeldPeriod[],
  periods: readonly PastPeriod[],
  today: string,
): boolean {
  return sheCanSave({
    held: theDaysEmiHeld(held),
    ticked: theDaysSheIsHolding(held, periods, today),
  });
}

/** One save of the whole list, which writes the days that changed and rebuilds the cache. */
export function savePastPeriods(
  db: Database,
  vault: DayVault,
  save: {
    readonly held: readonly HeldPeriod[];
    readonly periods: readonly PastPeriod[];
    readonly today: string;
    readonly now: Date;
  },
): DaysAndCycles {
  return savePeriodRange(db, vault, {
    held: theDaysEmiHeld(save.held),
    now: save.now,
    ticked: theDaysSheIsHolding(save.held, save.periods, save.today),
    today: save.today,
  });
}
