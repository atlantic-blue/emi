import type { ForecastResult, PublishedFigure, PublishedMeasurement } from '@emi/cycle';
import { publishedFigures, toOneDecimalPlace } from '@emi/cycle';

import type { CycleRow } from '../../data/cycleRepository';

/**
 * Her own measurements, each one paired with the figure a paper reports for the same measurement.
 *
 * Nothing here decides whether a number is good. Emi puts the two side by side and she reads them,
 * which is the whole of this section: a tracker that prints a word over a number has turned
 * arithmetic on her own days into a verdict about her body.
 */

/** One measurement of hers, and the published figure it sits beside. */
export interface MeasuredNumber {
  readonly measures: PublishedMeasurement;
  /** Days. A whole number for the two lengths, and one decimal place for the variation. */
  readonly hers: number;
  readonly published: PublishedFigure;
}

/**
 * Her number for one measurement, or nothing at all where her days do not carry it yet. The
 * variation comes off the forecast rather than being worked out again here, so the spread the
 * range is drawn from and the spread she reads are one number.
 */
function herNumberFor(
  measures: PublishedMeasurement,
  lastComplete: CycleRow,
  forecast: ForecastResult,
): number | undefined {
  if (measures === 'cycle-length') {
    return lastComplete.lengthDays ?? undefined;
  }

  if (measures === 'period-duration') {
    return lastComplete.periodLengthDays ?? undefined;
  }

  return forecast.kind === 'forecast' ? toOneDecimalPlace(forecast.spreadDays) : undefined;
}

/**
 * Her three numbers, in the order the one list of published figures holds them, or nothing at all.
 *
 * The three travel together. A section drawn with two of them would say that Emi measured her
 * third and is keeping quiet about it, when the truth is that her days do not reach it yet.
 */
export function herNumbers(
  cycles: readonly CycleRow[],
  forecast: ForecastResult,
): readonly MeasuredNumber[] | undefined {
  const complete = cycles.filter((cycle) => !cycle.isPredicted && cycle.lengthDays !== null);
  const lastComplete = complete[complete.length - 1];

  if (lastComplete === undefined) {
    return undefined;
  }

  const measured = publishedFigures.map((published) => ({
    hers: herNumberFor(published.measures, lastComplete, forecast),
    measures: published.measures,
    published,
  }));

  return measured.every((number): number is MeasuredNumber => number.hers !== undefined)
    ? measured
    : undefined;
}
