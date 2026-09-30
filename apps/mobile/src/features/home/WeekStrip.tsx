import type { ReactNode } from 'react';

import type { DayOfHerWeek } from '../cycle/herWeek';

/**
 * Her week, under the header of the screen she opens. Seven days, each carrying the letter of its
 * weekday, the day of her cycle, and the date under it.
 *
 * She reads where she is without pressing anything, which is why every day states itself: a day
 * she bled is filled, today is ringed, and a day her period is expected to run into is a dotted
 * outline. Shape rather than colour alone, which design section 3 holds every cue to.
 */

export const weekStripTestID = 'home-week-strip';

export function weekDayTestID(day: string): string {
  return `home-week-day-${day}`;
}

export function weekLetterTestID(day: string): string {
  return `home-week-letter-${day}`;
}

export function weekCycleDayTestID(day: string): string {
  return `home-week-cycle-day-${day}`;
}

export function weekDateTestID(day: string): string {
  return `home-week-date-${day}`;
}

interface Props {
  readonly days: readonly DayOfHerWeek[];
}

export function WeekStrip({ days }: Props): ReactNode {
  void days;

  return null;
}
