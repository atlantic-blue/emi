import type { ConfidenceBand } from './confidence';
import { POPULATION_SPREAD_DAYS, confidenceFor } from './confidence';
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

/**
 * How far either side of the day she is counted to, before two of her cycles are complete. Her own
 * spread is the one number a woman with no complete cycle cannot have, so the width is the mean
 * per-user variation of the cited cohort, rounded to a whole day. It is wider than most settled
 * forecasts, which is the honest way round: the range narrows as Emi reads her own cycles.
 */
export const DAYS_EITHER_SIDE_WHILE_LEARNING = Math.round(POPULATION_SPREAD_DAYS);

/** Design section 8: five days before the estimated ovulation through one day after it. */
export const FERTILE_DAYS_BEFORE_OVULATION = 5;
/** The window closes a day after the estimate, because arithmetic can put the estimate a day early. */
export const FERTILE_DAYS_AFTER_OVULATION = 1;

/**
 * Two days, and both of them are inside the range. A forecast is never one day, so a range is what
 * a screen is handed.
 */
export interface DayRange {
  readonly from: string;
  readonly to: string;
}

/**
 * Everything a screen needs to draw a forecast and to say how sure it is, so that no screen does
 * arithmetic of its own.
 */
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

/**
 * What comes back before there are cycles enough to forecast from. It carries both counts, so a
 * screen can say how many are still wanted rather than saying nothing at all.
 */
export interface Learning {
  readonly kind: 'learning';
  readonly completeCycles: number;
  readonly needsCycles: number;
  /**
   * The days her next period is counted to, from the last start she recorded and the length she
   * gave at the first run. Nothing at all where she has recorded no day, or where the caller gave
   * no length, and then a screen has no range to draw and says so.
   */
  readonly start?: DayRange;
}

/**
 * A forecast, or the reason there is not one. A caller reads `kind` first, so an empty history
 * cannot be drawn as a date.
 */
export type ForecastResult = Forecast | Learning;

/** What a later step measures and hands in. Left out, the fixed luteal length is used. */
export interface ForecastOptions {
  /** Step 3.4 passes the length measured from her own temperature rise. */
  readonly lutealLengthDays?: number;
  /**
   * How long she said her cycle runs, at the first run. It is counted by while Emi is learning and
   * never inside a forecast, because a forecast is the median of cycles she lived.
   */
  readonly statedCycleLengthDays?: number;
}

/**
 * The days her next period is counted to before two of her cycles are complete. The middle is the
 * last start she recorded plus the length she gave, and the width is the cohort's variation, so
 * the two ends say that a stated length is an estimate rather than a promise.
 */
export function startWhileLearning(lastStartedOn: string, statedCycleLengthDays: number): DayRange {
  if (!Number.isInteger(statedCycleLengthDays) || statedCycleLengthDays < 1) {
    throw new Error(
      `a cycle length is a whole number of days from one, this one is ${statedCycleLengthDays}`,
    );
  }

  return {
    from: addDays(lastStartedOn, statedCycleLengthDays - DAYS_EITHER_SIDE_WHILE_LEARNING),
    to: addDays(lastStartedOn, statedCycleLengthDays + DAYS_EITHER_SIDE_WHILE_LEARNING),
  };
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

/**
 * Six lengths at most, the oldest first. A cycle from a year ago leaves the window rather than
 * dragging every forecast after it.
 */
export function lastLengths(cycles: readonly Cycle[]): number[] {
  return cycleLengths(cycles).slice(-FORECAST_WINDOW_CYCLES);
}

/**
 * The whole forecast, from her cycles and nothing else. No clock is read here, so the same days
 * give the same answer whenever it is asked for.
 */
export function forecastFrom(
  cycles: readonly Cycle[],
  options: ForecastOptions = {},
): ForecastResult {
  const lengths = lastLengths(cycles);
  const complete = cycleLengths(cycles).length;
  const last = cycles[cycles.length - 1];

  if (!last || complete < CYCLES_BEFORE_A_FORECAST) {
    return {
      kind: 'learning',
      completeCycles: complete,
      needsCycles: CYCLES_BEFORE_A_FORECAST,
      ...(last === undefined || options.statedCycleLengthDays === undefined
        ? {}
        : { start: startWhileLearning(last.startedOn, options.statedCycleLengthDays) }),
    };
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
