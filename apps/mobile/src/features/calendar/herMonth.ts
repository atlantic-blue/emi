import { type HerDay, type HerDaysFrom, herDaysOn } from '../cycle/herWeek';
import { monthWeeks } from '../onboarding/days';

/**
 * The days of one month, each one carrying the day of her cycle it falls on and what happened on
 * it. The arithmetic is the one the ring and the week strip read, so a month cannot count a day of
 * its own.
 */
export function herMonth(from: HerDaysFrom, month: string): HerDay[] {
  const days = monthWeeks(month)
    .flat()
    .filter((day): day is string => day !== undefined);

  return herDaysOn(from, days);
}
