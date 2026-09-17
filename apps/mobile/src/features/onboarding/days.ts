import { addDays, daysBetween, toDayNumber } from '@emi/cycle';

const MILLISECONDS_IN_A_DAY = 86_400_000;

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * The calendar day she is living in, read from her own clock. Day arithmetic belongs to
 * `@emi/cycle`, which counts days rather than milliseconds, so no summer time change can move an
 * answer by a day. This is the one place a local clock is read at all.
 */
export function localDay(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error('a day cannot be read from a date that is not a date');
  }
  const year = now.getFullYear().toString().padStart(4, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** `count` days ending on `day`, most recent first. */
export function daysBackFrom(day: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`a list of days needs a whole count of at least one, this one is ${count}`);
  }

  return Array.from({ length: count }, (_unused, index) => addDays(day, -index));
}

/** Today and yesterday are named, because a woman reads those faster than she reads a date. */
export function dayLabel(day: string, today: string): string {
  const back = daysBetween(day, today);
  if (back === 0) {
    return 'Today';
  }
  if (back === 1) {
    return 'Yesterday';
  }

  const date = new Date(toDayNumber(day) * MILLISECONDS_IN_A_DAY);

  return `${weekdayNames[date.getUTCDay()]} ${date.getUTCDate()} ${monthNames[date.getUTCMonth()]}`;
}
