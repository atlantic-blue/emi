import type { ConfidenceBand } from './confidence';
import { confidenceFor } from './confidence';
import type { Cycle } from './cycles';
import { addDays, cycleLengths } from './cycles';

/**
 * The forecast is arithmetic over the cycles she recorded. It is not a model and it is not
 * intelligence: a median, a spread, and a luteal length subtracted from a date.
 */

/** Design section 8. Six is enough to see a pattern and short enough to follow a change. */
export const FORECAST_WINDOW_CYCLES = 6;

/** Emi says nothing about a next period until two cycles are complete. */
export const CYCLES_BEFORE_A_FORECAST = 2;

/**
 * Days from ovulation to the next period, until her own temperature rise measures it. The design
 * fixes 13. The nearest published mean is 12.4 days, 95 percent interval 7 to 17, in the paper
 * cited in confidence.ts.
 */
export const LUTEAL_LENGTH_DAYS = 13;

/**
 * A range of no width is a single date, which the forecast contract refuses, so a woman whose six
 * cycles were all exactly 28 days is still told a range.
 */
export const MINIMUM_DAYS_EITHER_SIDE = 1;

/** Design section 8: five days before the estimated ovulation through one day after it. */
export const FERTILE_DAYS_BEFORE_OVULATION = 5;
export const FERTILE_DAYS_AFTER_OVULATION = 1;

export interface DayRange {
  readonly from: string;
  readonly to: string;
}

export interface Forecast {
  readonly kind: 'forecast';
  /** How many complete cycles the median was taken over, two to six. */
  readonly fromCycles: number;
  readonly medianLengthDays: number;
  /** One standard deviation of those lengths, the same statistic the bands are measured in. */
  readonly spreadDays: number;
  readonly confidence: ConfidenceBand;
  /** The middle of the range. Ovulation is counted back from this day. */
  readonly expectedStart: string;
  readonly start: DayRange;
  readonly estimatedOvulation: string;
  readonly fertileWindow: DayRange;
  readonly lutealLengthDays: number;
}

export interface Learning {
  readonly kind: 'learning';
  readonly completeCycles: number;
  readonly needsCycles: number;
}

export type ForecastResult = Forecast | Learning;

export interface ForecastOptions {
  /** Step 3.4 passes the length measured from her own temperature rise. */
  readonly lutealLengthDays?: number;
}

function valueAt(sorted: readonly number[], index: number): number {
  const value = sorted[index];
  if (value === undefined) {
    throw new Error('a median needs at least one value');
  }
  return value;
}

/** The middle value. A long cycle after an illness moves this by at most half a place. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((one, other) => one - other);
  const middle = Math.floor(sorted.length / 2);
  const above = valueAt(sorted, middle);
  if (sorted.length % 2 === 1) {
    return above;
  }
  return (valueAt(sorted, middle - 1) + above) / 2;
}

/**
 * One standard deviation of her own cycle lengths, over n minus one, which is the statistic the
 * cited cohort figure is measured in. One value has no spread to measure.
 */
export function spread(values: readonly number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const squares = values.reduce((total, value) => total + (value - mean) ** 2, 0);
  return Math.sqrt(squares / (values.length - 1));
}

export function lastLengths(cycles: readonly Cycle[]): number[] {
  return cycleLengths(cycles).slice(-FORECAST_WINDOW_CYCLES);
}

export function forecastFrom(
  cycles: readonly Cycle[],
  options: ForecastOptions = {},
): ForecastResult {
  const lengths = lastLengths(cycles);
  const complete = cycleLengths(cycles).length;
  const last = cycles[cycles.length - 1];

  if (!last || complete < CYCLES_BEFORE_A_FORECAST) {
    return { kind: 'learning', completeCycles: complete, needsCycles: CYCLES_BEFORE_A_FORECAST };
  }

  const lutealLengthDays = options.lutealLengthDays ?? LUTEAL_LENGTH_DAYS;
  const medianLengthDays = median(lengths);
  const spreadDays = spread(lengths);
  const halfWidth = Math.max(MINIMUM_DAYS_EITHER_SIDE, Math.round(spreadDays));
  const middle = Math.round(medianLengthDays);
  const expectedStart = addDays(last.startedOn, middle);
  const estimatedOvulation = addDays(expectedStart, -lutealLengthDays);

  return {
    kind: 'forecast',
    fromCycles: lengths.length,
    medianLengthDays,
    spreadDays,
    confidence: confidenceFor(spreadDays),
    expectedStart,
    start: {
      from: addDays(last.startedOn, middle - halfWidth),
      to: addDays(last.startedOn, middle + halfWidth),
    },
    estimatedOvulation,
    fertileWindow: {
      from: addDays(estimatedOvulation, -FERTILE_DAYS_BEFORE_OVULATION),
      to: addDays(estimatedOvulation, FERTILE_DAYS_AFTER_OVULATION),
    },
    lutealLengthDays,
  };
}
