import type { ForecastResult } from '@emi/cycle';
import { daysBetween } from '@emi/cycle';

/**
 * How many days her period is late, counted from the last day of the range, so the first day after
 * the range is one day late. Nothing comes back inside the range or before it, and nothing where
 * Emi is still learning and has no range to count from.
 */
export function daysLate(forecast: ForecastResult, today: string): number | undefined {
  if (forecast.start === undefined) {
    return undefined;
  }

  const late = daysBetween(forecast.start.to, today);

  return late > 0 ? late : undefined;
}
