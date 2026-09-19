import { addDays, daysBetween, toDayNumber } from '@emi/cycle';

const MILLISECONDS_IN_A_DAY = 86_400_000;
const MONTHS_IN_A_YEAR = 12;

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

/**
 * A month is named by its first day, so one string carries the month and the year and no second
 * shape has to be kept in step with it.
 */
export function startOfMonth(day: string): string {
  toDayNumber(day);

  return `${day.slice(0, 7)}-01`;
}

/**
 * Whole months, counted on the calendar rather than in days, so February moves by one the same way
 * March does. The answer is always the first of a month.
 */
export function addMonths(month: string, count: number): string {
  if (!Number.isInteger(count)) {
    throw new Error(`months are counted whole, this count is ${count}`);
  }
  const first = startOfMonth(month);
  const moved =
    Number(first.slice(0, 4)) * MONTHS_IN_A_YEAR + Number(first.slice(5, 7)) - 1 + count;
  const year = Math.floor(moved / MONTHS_IN_A_YEAR);
  const monthOfYear = moved - year * MONTHS_IN_A_YEAR + 1;

  return `${year.toString().padStart(4, '0')}-${monthOfYear.toString().padStart(2, '0')}-01`;
}

/** The heading above the squares, so she knows which month she is looking at. */
export function monthLabel(month: string): string {
  const first = startOfMonth(month);

  return `${monthNames[Number(first.slice(5, 7)) - 1]} ${first.slice(0, 4)}`;
}

/** How many days the month holds. */
export function daysInMonth(month: string): number {
  const first = startOfMonth(month);

  return daysBetween(first, addMonths(first, 1));
}

/**
 * The week starts on Monday, because Emi is sold in the United Kingdom and a woman reading this
 * grid expects her weekend at the end of the row rather than split across two.
 */
export const weekdayColumnNames: readonly string[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Which column a day sits in, counting from Monday. */
export function weekdayColumn(day: string): number {
  const date = new Date(toDayNumber(day) * MILLISECONDS_IN_A_DAY);

  return (date.getUTCDay() + 6) % 7;
}

/**
 * The weeks of a month, seven cells to a week. A cell is empty where the week runs outside the
 * month, so one weekday holds one column all the way down the grid.
 */
export function monthWeeks(month: string): (string | undefined)[][] {
  const first = startOfMonth(month);
  const width = weekdayColumnNames.length;
  const cells: (string | undefined)[] = [
    ...Array.from({ length: weekdayColumn(first) }, () => undefined),
    ...Array.from({ length: daysInMonth(first) }, (_unused, index) => addDays(first, index)),
  ];
  while (cells.length % width !== 0) {
    cells.push(undefined);
  }

  return Array.from({ length: cells.length / width }, (_unused, week) =>
    cells.slice(week * width, (week + 1) * width),
  );
}
