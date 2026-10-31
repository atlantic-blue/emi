import { type ForecastResult, daysBetween } from '@emi/cycle';

import { daysLate } from '../forecast/daysLate';

/**
 * How long until her next period, counted from today to each end of the range the forecast gives.
 * It is always a range or the last day of one, because a forecast never names a single day.
 */
export type TheWait =
  | { readonly kind: 'in'; readonly fromDays: number; readonly toDays: number }
  | { readonly kind: 'within'; readonly toDays: number }
  | { readonly kind: 'today' }
  | { readonly kind: 'late'; readonly daysLate: number };

/** Nothing where Emi has no range to count from. */
export function theWaitForHerNextPeriod(
  forecast: ForecastResult,
  today: string,
): TheWait | undefined {
  if (forecast.start === undefined) {
    return undefined;
  }

  const late = daysLate(forecast, today);
  if (late !== undefined) {
    return { daysLate: late, kind: 'late' };
  }

  const fromDays = daysBetween(today, forecast.start.from);
  const toDays = daysBetween(today, forecast.start.to);

  if (fromDays > 0) {
    return { fromDays, kind: 'in', toDays };
  }

  return toDays > 0 ? { kind: 'within', toDays } : { kind: 'today' };
}
