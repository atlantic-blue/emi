import type { ForecastResult } from '@emi/cycle';
import { daysBetween } from '@emi/cycle';

/**
 * How many days her period is late, counted from the last day of the forecast window, so the first
 * day after the window is one day late. Nothing comes back inside the window or before it, and
 * nothing while Emi is still learning, because a range counted from a length she stated is not a
 * forecast to be late against.
 */
export function daysLate(forecast: ForecastResult, today: string): number | undefined {
  if (forecast.kind === 'learning') {
    return undefined;
  }

  const late = daysBetween(forecast.start.to, today);

  return late > 0 ? late : undefined;
}
