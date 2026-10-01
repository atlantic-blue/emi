import {
  CYCLES_BEFORE_A_FORECAST,
  CYCLE_LENGTH_HIGH_DAYS,
  CYCLE_LENGTH_LOW_DAYS,
  FORECAST_WINDOW_CYCLES,
} from '@emi/cycle';

import type { CyclesReadFrom } from '../cycle/cyclesRead';

/**
 * What the chart of her cycles is read through. Nothing reads the cache yet, so the screen she
 * opens draws no chart at all and every case that reads one fails.
 */

/** How many complete cycles the chart draws, which is the window the forecast reads. */
export const cyclesSheReadsAsATrend = FORECAST_WINDOW_CYCLES;

/** How many of her cycles must be complete before anything is drawn. */
export const cyclesBeforeATrend = CYCLES_BEFORE_A_FORECAST;

/** One complete cycle, as the chart draws it. */
export interface TrendCycle {
  readonly startedOn: string;
  readonly lengthDays: number;
}

export function herTrend(_from: CyclesReadFrom): readonly TrendCycle[] | undefined {
  return undefined;
}

/** Whether one cycle ran outside the range the paper reports, at either end of it. */
export function ranOutsideTheBand(lengthDays: number): boolean {
  return lengthDays < CYCLE_LENGTH_LOW_DAYS || lengthDays > CYCLE_LENGTH_HIGH_DAYS;
}

/** How many of the cycles on the chart ran outside the published range. */
export function cyclesOutsideTheBand(cycles: readonly TrendCycle[]): number {
  return cycles.filter((cycle) => ranOutsideTheBand(cycle.lengthDays)).length;
}
