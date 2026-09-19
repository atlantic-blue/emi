import type { ConfidenceLevel, DayRange, Forecast, Learning } from '@emi/cycle';
import { toDayNumber } from '@emi/cycle';

import { type WordKey, words } from '../../language';

/**
 * The words of the forecast. Section 9.7 of the design sets the rules they follow: say what
 * happens, never congratulate, no exclamation mark, write the number.
 *
 * Nothing here can write a single day. The only function that turns days into words takes a range
 * and refuses one whose ends are the same day, because a range of no width is a date, and a date is
 * the promise section 8 says the arithmetic cannot keep.
 */

export const forecastCopy = {
  nextPeriod: words('forecast.nextPeriod'),
  fertileWindow: words('forecast.fertileWindow'),
} as const;

export type ForecastCopyRefusal = 'range-is-one-day' | 'range-ends-before-it-starts';

export class ForecastCopyError extends Error {
  readonly refusal: ForecastCopyRefusal;

  constructor(refusal: ForecastCopyRefusal, message: string) {
    super(message);
    this.name = 'ForecastCopyError';
    this.refusal = refusal;
  }
}

const monthKeys: readonly WordKey[] = [
  'calendar.month.january',
  'calendar.month.february',
  'calendar.month.march',
  'calendar.month.april',
  'calendar.month.may',
  'calendar.month.june',
  'calendar.month.july',
  'calendar.month.august',
  'calendar.month.september',
  'calendar.month.october',
  'calendar.month.november',
  'calendar.month.december',
];

export const monthNames: readonly string[] = monthKeys.map((key) => words(key));

const ordinalKeys: Readonly<Record<number, WordKey>> = {
  1: 'calendar.ordinal.first',
  2: 'calendar.ordinal.second',
  3: 'calendar.ordinal.third',
};

/**
 * The eleventh, the twelfth and the thirteenth take the last suffix, and so does every hundredth
 * of them. Which letters those are is the language's answer rather than this function's: English
 * writes the 14th and Spanish writes the 14.
 */
export function ordinal(dayOfMonth: number): string {
  const lastTwo = dayOfMonth % 100;

  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${dayOfMonth}${words('calendar.ordinal.other')}`;
  }

  return `${dayOfMonth}${words(ordinalKeys[dayOfMonth % 10] ?? 'calendar.ordinal.other')}`;
}

interface CalendarDay {
  readonly year: number;
  readonly month: number;
  readonly dayOfMonth: number;
}

function calendarDay(day: string): CalendarDay {
  // The cycle package refuses anything that is not a day in the calendar, so the slices are whole
  // numbers from here on.
  toDayNumber(day);

  return {
    year: Number(day.slice(0, 4)),
    month: Number(day.slice(5, 7)),
    dayOfMonth: Number(day.slice(8, 10)),
  };
}

function monthName(day: CalendarDay): string {
  const name = monthNames[day.month - 1];

  if (name === undefined) {
    throw new Error(`${day.month} is not a month of the year`);
  }

  return name;
}

/**
 * The sentence she reads. The year appears only where the two ends fall in different years, and the
 * month appears once where both ends fall in the same one, because the design's own line is
 * "Between the 14th and the 17th".
 */
export function rangeSentence(range: DayRange): string {
  const from = calendarDay(range.from);
  const to = calendarDay(range.to);

  if (range.to < range.from) {
    throw new ForecastCopyError(
      'range-ends-before-it-starts',
      `a range from ${range.from} to ${range.to} ends before it starts`,
    );
  }

  if (range.from === range.to) {
    throw new ForecastCopyError(
      'range-is-one-day',
      `a range from ${range.from} to ${range.to} is a single day, and the forecast is never a single day`,
    );
  }

  if (from.year !== to.year) {
    return words('forecast.range.spansYears', undefined, {
      from: ordinal(from.dayOfMonth),
      fromMonth: monthName(from),
      fromYear: from.year,
      to: ordinal(to.dayOfMonth),
      toMonth: monthName(to),
      toYear: to.year,
    });
  }

  if (from.month !== to.month) {
    return words('forecast.range.spansMonths', undefined, {
      from: ordinal(from.dayOfMonth),
      fromMonth: monthName(from),
      to: ordinal(to.dayOfMonth),
      toMonth: monthName(to),
    });
  }

  return words('forecast.range.sameMonth', undefined, {
    from: ordinal(from.dayOfMonth),
    month: monthName(to),
    to: ordinal(to.dayOfMonth),
  });
}

/**
 * What the window is worth, said on the screen that shows it. The design asks every screen that
 * carries the window to call it an estimate, and the denial is the operator's fourth decision
 * written where a woman reads it rather than only in a document.
 */
export function fertileWindowSentence(forecast: Forecast): string {
  return words('forecast.fertileWindow.sentence', undefined, { cycles: forecast.fromCycles });
}

/**
 * A word, never a number out of a hundred. The bands are measured, and a percentage taken from six
 * cycles of one woman would read as a precision none of it has.
 */
export const confidenceWords: Readonly<Record<ConfidenceLevel, string>> = {
  high: words('forecast.confidence.high'),
  medium: words('forecast.confidence.medium'),
  low: words('forecast.confidence.low'),
};

/** The word, and the count the median was taken over, because the count is what the word rests on. */
export function confidenceSentence(forecast: Forecast): string {
  return words('forecast.confidence.sentence', undefined, {
    cycles: forecast.fromCycles,
    word: confidenceWords[forecast.confidence.level],
  });
}

/**
 * The words of the learning state. Contract CYCLE-3 gives Emi one thing to say before two cycles
 * are complete: that it is still learning, how many more cycles it wants, and the length it is
 * counting in the meantime. No confidence word appears here, because there is nothing yet to be
 * confident about.
 */
export const learningCopy = {
  stillLearning: words('forecast.stillLearning'),
} as const;

/**
 * How many more complete cycles Emi wants. The number is the remainder rather than the total, so a
 * woman with one cycle behind her reads that one more is wanted and not that two are.
 */
export function cyclesWantedSentence(learning: Learning): string {
  return words('forecast.cyclesWanted', learning.needsCycles - learning.completeCycles);
}

/** The length she gave at the first run, which is all Emi counts by until her own cycles arrive. */
export function statedLengthSentence(cycleLengthDays: number): string {
  return words('forecast.statedLength', undefined, { days: cycleLengthDays });
}
