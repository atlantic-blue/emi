import {
  CYCLES_BEFORE_A_FORECAST,
  CYCLE_LENGTH_HIGH_DAYS,
  CYCLE_LENGTH_LOW_DAYS,
  FORECAST_WINDOW_CYCLES,
} from '@emi/cycle';

import { type CyclesReadFrom, cyclesRead } from '../cycle/cyclesRead';

/**
 * The complete cycles the screen she opens draws as a trend: the last six of them, oldest first.
 *
 * Six is the window the forecast takes its median over, so the points she reads and the range she
 * is given are the same six cycles rather than two different readings of her days.
 *
 * They come out of the cycle cache through the reader the strips and the Insights screen read, so
 * a cycle cannot be one length on the chart and another length on the strip above it.
 */

/** How many complete cycles the chart draws, which is the window the forecast reads. */
export const cyclesSheReadsAsATrend = FORECAST_WINDOW_CYCLES;

/**
 * Nothing is drawn until this many cycles are complete. One point is a dot and not a shape, and
 * Emi says nothing about a trend it cannot show her.
 */
export const cyclesBeforeATrend = CYCLES_BEFORE_A_FORECAST;

/** One complete cycle, as the chart draws it. */
export interface TrendCycle {
  readonly startedOn: string;
  readonly lengthDays: number;
}

/**
 * Her last six complete cycles, oldest first, or nothing at all before two of them are complete.
 * Emi holds no sample data, so a section it cannot fill is absent rather than drawn empty.
 */
export function herTrend(from: CyclesReadFrom): readonly TrendCycle[] | undefined {
  const complete = cyclesRead(from)
    .filter((cycle): cycle is typeof cycle & { lengthDays: number } => cycle.lengthDays !== null)
    .slice(0, cyclesSheReadsAsATrend)
    .map((cycle) => ({ lengthDays: cycle.lengthDays, startedOn: cycle.startedOn }))
    .reverse();

  return complete.length < cyclesBeforeATrend ? undefined : complete;
}

/** Whether one cycle ran outside the range the paper reports, at either end of it. */
export function ranOutsideTheBand(lengthDays: number): boolean {
  return lengthDays < CYCLE_LENGTH_LOW_DAYS || lengthDays > CYCLE_LENGTH_HIGH_DAYS;
}

/** How many of the cycles on the chart ran outside the published range. */
export function cyclesOutsideTheBand(cycles: readonly TrendCycle[]): number {
  return cycles.filter((cycle) => ranOutsideTheBand(cycle.lengthDays)).length;
}
