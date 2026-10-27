import { words } from '../../language';
import { dateOf, monthOf } from '../onboarding/days';
import { periodLengthDaysLabel } from '../onboarding/copy';
import {
  type PastPeriod,
  longestCycleBetweenDays,
  longestPastPeriodDays,
  shortestCycleBetweenDays,
} from './pastPeriods';

/** The words of the list of her last periods, in the first run and on its own screen. */
export const pastPeriodsCopy = {
  title: words('pastPeriods.title'),
  forecastLine: words('pastPeriods.line.forecast'),
  estimateLine: words('pastPeriods.line.estimate'),
  mostRecentFirstLine: words('pastPeriods.line.mostRecentFirst'),
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
  stillGoing: words('pastPeriods.stillGoing'),
  // The newest start that can still be going is one period back from today, counted as days ago.
  stillGoingTooLongAgo: words('pastPeriods.picker.stillGoingTooLongAgo', undefined, {
    maximum: longestPastPeriodDays - 1,
  }),
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

/** "7 days" for a period she gave a length, and "Still going" for the newest one where she did not. */
export function pastPeriodRunSaid(period: PastPeriod): string {
  return period.lengthDays === undefined
    ? pastPeriodsCopy.stillGoing
    : pastPeriodLengthSaid(period.lengthDays);
}

const placeOfEachRow = [
  words('pastPeriods.place.mostRecent'),
  words('pastPeriods.place.oneBefore'),
  words('pastPeriods.place.oneBeforeThat'),
] as const;

export function pastPeriodPlaceSaid(row: number): string {
  const place = placeOfEachRow[row];
  if (place === undefined) {
    throw new RangeError(`No period row ${row}; the list asks for ${placeOfEachRow.length}.`);
  }

  return place;
}
