import {
  type DayRange,
  FERTILE_DAYS_AFTER_OVULATION,
  FERTILE_DAYS_BEFORE_OVULATION,
  FORECAST_WINDOW_CYCLES,
  addDays,
  cyclePhaseDays,
  daysBetween,
  ovulationDayWhileLearning,
  phaseOnCycleDay,
} from '@emi/cycle';
import type { PhaseName } from '@emi/tokens';

import { type RingInputFrom, cycleShapeFor, fertileDaysOf } from '../cycle/ringInput';
import { forecastOf } from '../forecast/fromCache';

/**
 * The periods the calendar draws ahead of her, each one a forecast.
 *
 * Once two of her cycles are complete, the forecast names a range for the next start and the
 * median length. The periods after it are that range moved on by one median length at a time. The calendar draws as many of them as the forecast reads cycles to make its median,
 * so it never looks further ahead than it looks back.
 *
 * While Emi is still learning, the forecast names a range for the next start and nothing after it,
 * so the calendar draws that one period only. Its fertile window is counted from the length she
 * gave at the first run, by the rule the ring uses for the cycle she is in.
 *
 * A forecast never puts a period on one day (contract CYCLE-2), so the rings cover every day the
 * period may fall on: from the first day it may start to the last day it may still run. The cycle
 * days count from the first day it may start.
 */
export const FORECAST_CYCLES_AHEAD = FORECAST_WINDOW_CYCLES;

export interface CycleAhead {
  /** Zero for her next period, one for the period after it, and so on. */
  readonly order: number;
  /** The first day the period may start on, which the cycle days count from. */
  readonly startsOn: string;
  /** The days it may start on, which is what the day card says. */
  readonly mayStart: DayRange;
  readonly lengthDays: number;
  readonly periodDays: number;
  /** The cycle day of the forecast ovulation, which the phase rule counts around. */
  readonly ovulationDay: number;
}

/** The cycles ahead of her, the nearest first. Nothing where no period of hers is recorded. */
export function theCyclesAhead(from: RingInputFrom): CycleAhead[] {
  const read = cycleShapeFor(from);
  if (read === undefined) {
    return [];
  }

  const forecast = forecastOf(from.cycles, from.statedCycleLengthDays);
  const periodDays = read.shape.periodDays;

  if (forecast.kind === 'learning') {
    const range = forecast.start;
    if (range === undefined) {
      return [];
    }

    const next: CycleAhead = {
      lengthDays: from.statedCycleLengthDays,
      mayStart: range,
      order: 0,
      ovulationDay: ovulationDayWhileLearning(from.statedCycleLengthDays),
      periodDays,
      startsOn: range.from,
    };

    return isStillAhead(next, from.today) ? [next] : [];
  }

  const lengthDays = Math.round(forecast.medianLengthDays);
  const ovulationDay = lengthDays - forecast.lutealLengthDays + 1;

  return Array.from({ length: FORECAST_CYCLES_AHEAD }, (_unused, order) => {
    const moved = order * lengthDays;

    const mayStart = {
      from: addDays(forecast.start.from, moved),
      to: addDays(forecast.start.to, moved),
    };

    return { lengthDays, mayStart, order, ovulationDay, periodDays, startsOn: mayStart.from };
  }).filter((cycle) => isStillAhead(cycle, from.today));
}

/** The last day a forecast period may still run on. */
function theLastDayItMayRun(cycle: CycleAhead): string {
  return addDays(cycle.mayStart.to, cycle.periodDays - 1);
}

/** A forecast period whose last possible day is still ahead of her is drawn. */
function isStillAhead(cycle: CycleAhead, today: string): boolean {
  return theLastDayItMayRun(cycle) > today;
}

/**
 * Whether the first day a forecast period may start on is already behind her. Its rings still
 * show, but the days ahead keep the count of the cycle she is in, because she has not bled yet.
 */
export function hasItsRangeOpened(cycle: CycleAhead, today: string): boolean {
  return cycle.startsOn <= today;
}

/** The cycle ahead that holds a date, or nothing where the date is in no forecast cycle. */
export function theCycleAheadHolding(
  ahead: readonly CycleAhead[],
  day: string,
): CycleAhead | undefined {
  return ahead.filter((cycle) => cycle.startsOn <= day).at(-1);
}

/** The day of a forecast cycle a date falls on, counting from one. */
export function theDayOfTheCycleAhead(cycle: CycleAhead, day: string): number {
  return daysBetween(cycle.startsOn, day) + 1;
}

/** Whether a date is one of the days the forecast period may fall on. */
export function isAForecastPeriodDay(cycle: CycleAhead, day: string): boolean {
  return day >= cycle.startsOn && day <= theLastDayItMayRun(cycle);
}

/**
 * The period a date waits for: the forecast period that holds it, or the first one after it.
 * Nothing where the forecast reaches no period on or after that date.
 */
export function thePeriodADayWaitsFor(
  ahead: readonly CycleAhead[],
  day: string,
): CycleAhead | undefined {
  const holding = theCycleAheadHolding(ahead, day);
  if (holding !== undefined && isAForecastPeriodDay(holding, day)) {
    return holding;
  }

  return ahead.find((cycle) => cycle.startsOn > day);
}

/** What the calendar draws under a date of a forecast cycle. */
export interface PhaseAhead {
  readonly phase: PhaseName;
  readonly fertile: boolean;
  readonly ovulating: boolean;
}

/**
 * The phase, the fertile window and the ovulation day of a date in a forecast cycle, by the same
 * rules the ring reads for the cycle she is in.
 */
export function thePhaseAhead(cycle: CycleAhead, day: string): PhaseAhead {
  const cycleDay = theDayOfTheCycleAhead(cycle, day);
  // Every ringed day counts as the period here, so no day is drawn both as a period and as fertile.
  const ringedDays = daysBetween(cycle.startsOn, theLastDayItMayRun(cycle)) + 1;
  const periodDays = Math.min(ringedDays, cycle.lengthDays);

  const phases = cyclePhaseDays({
    cycleLengthDays: cycle.lengthDays,
    ovulationDay: cycle.ovulationDay,
    periodLengthDays: periodDays,
  });
  const fertile = fertileDaysOf({
    cycleLengthDays: cycle.lengthDays,
    fertileFromDay: cycle.ovulationDay - FERTILE_DAYS_BEFORE_OVULATION,
    fertileToDay: cycle.ovulationDay + FERTILE_DAYS_AFTER_OVULATION,
    ovulationDay: cycle.ovulationDay,
    periodDays,
  });

  return {
    fertile: cycleDay >= fertile.from && cycleDay <= fertile.to,
    ovulating: cycleDay === cycle.ovulationDay && cycleDay > periodDays,
    phase: phaseOnCycleDay(phases, Math.max(1, cycleDay)),
  };
}
