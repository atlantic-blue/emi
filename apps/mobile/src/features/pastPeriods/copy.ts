import { words } from '../../language';
import { dateOf, monthOf } from '../onboarding/days';
import { periodLengthDaysLabel } from '../onboarding/copy';
import { longestCycleBetweenDays, shortestCycleBetweenDays } from './pastPeriods';

/** The words of the list of her last periods, in the first run and on its own screen. */
export const pastPeriodsCopy = {
  title: words('pastPeriods.title'),
  forecastLine: words('pastPeriods.line.forecast'),
  estimateLine: words('pastPeriods.line.estimate'),
  action: words('pastPeriods.action'),
  wayPast: words('pastPeriods.wayPast'),
  addStart: words('pastPeriods.addStart'),
  skipThisOne: words('pastPeriods.skipThisOne'),
  save: words('pastPeriods.save'),
  cancel: words('pastPeriods.cancel'),
  start: words('pastPeriods.picker.start'),
  length: words('pastPeriods.picker.length'),
  done: words('pastPeriods.picker.done'),
  remove: words('pastPeriods.picker.remove'),
  outOfRange: words('pastPeriods.picker.outOfRange', undefined, {
    maximum: longestCycleBetweenDays,
    minimum: shortestCycleBetweenDays,
  }),
} as const;

/** "25 October", the start of a period as the row names it. */
export function pastPeriodDateSaid(day: string): string {
  return words('pastPeriods.row.date', undefined, { date: dateOf(day), month: monthOf(day) });
}

/** "7 days", the length of a period as the row names it. */
export function pastPeriodLengthSaid(days: number): string {
  return periodLengthDaysLabel(days);
}

/** "Period 2", which names the row the picker is open on. */
export function pastPeriodNumberSaid(row: number): string {
  return words('pastPeriods.picker.title', undefined, { number: row + 1 });
}
