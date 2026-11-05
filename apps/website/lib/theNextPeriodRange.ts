import type { SiteWordKey, SiteWords } from '@/app/words';

/**
 * The window the forecast card on the home page shows, worked out from the day she opens the page.
 *
 * The card is a picture of her home screen, and the application never shows a window that has
 * already happened. The board drew one month in 2026 and the site served that month for as long as
 * nobody noticed, so a reader in November read a forecast for October and the one example of the
 * product on the page was a date in the past.
 *
 * So the window is arithmetic rather than a sentence. It opens twelve days after the day it is
 * drawn for and lasts a week, which is a window a woman with a cycle of about a month could be
 * reading in the middle of her own. Nothing here is her forecast: the page has none of her days.
 *
 * The sentence it is written as is the application's own, out of the catalogues, so the window on
 * this page and the window on her screen read the same way.
 */

/** How long after the day it is drawn for the window opens. */
export const DAYS_UNTIL_THE_WINDOW_OPENS = 12;

/** How long the window lasts, counting the day it opens on. */
export const DAYS_THE_WINDOW_LASTS = 7;

/** One day of the calendar, as its three numbers, with the month counted from one. */
export interface ADay {
  readonly year: number;
  readonly month: number;
  readonly dayOfMonth: number;
}

export interface AWindowOfDays {
  readonly from: ADay;
  readonly to: ADay;
}

function twoDigits(figure: number): string {
  return `${figure}`.padStart(2, '0');
}

/** A day written the way a day is written everywhere else in this product. */
export function asADayNumber(day: ADay): string {
  return `${day.year}-${twoDigits(day.month)}-${twoDigits(day.dayOfMonth)}`;
}

/**
 * The day a clock is reading, in the zone that clock is in, which is her own day in a browser and
 * the server's day in a server. The parts are read rather than the instant, because an instant
 * written as a day in another zone is another day.
 */
export function theDayOf(clock: Date): ADay {
  return { year: clock.getFullYear(), month: clock.getMonth() + 1, dayOfMonth: clock.getDate() };
}

/**
 * A day read back out of the form above. It is built from the three numbers rather than parsed, so
 * the day is the day whatever zone the reader's machine is in.
 */
export function theDayWritten(written: string): ADay {
  const clock = new Date(
    Number(written.slice(0, 4)),
    Number(written.slice(5, 7)) - 1,
    Number(written.slice(8, 10)),
  );

  if (Number.isNaN(clock.getTime())) {
    throw new Error(`${written} is not a day of the calendar`);
  }

  return theDayOf(clock);
}

/**
 * The window itself. The arithmetic is handed to the calendar rather than done on day numbers,
 * because a month has 28, 29, 30 or 31 days and the end of a window twelve days out often sits in
 * the next month, or in the next year.
 */
export function theWindowAfter(opened: ADay): AWindowOfDays {
  const from = new Date(
    opened.year,
    opened.month - 1,
    opened.dayOfMonth + DAYS_UNTIL_THE_WINDOW_OPENS,
  );
  const to = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate() + DAYS_THE_WINDOW_LASTS - 1,
  );

  return { from: theDayOf(from), to: theDayOf(to) };
}

/** The twelve months, in the order of the year, under the names the catalogues give them. */
const monthKeys: readonly SiteWordKey[] = [
  'cycleMonthJanuary',
  'cycleMonthFebruary',
  'cycleMonthMarch',
  'cycleMonthApril',
  'cycleMonthMay',
  'cycleMonthJune',
  'cycleMonthJuly',
  'cycleMonthAugust',
  'cycleMonthSeptember',
  'cycleMonthOctober',
  'cycleMonthNovember',
  'cycleMonthDecember',
];

function monthName(words: SiteWords, day: ADay): string {
  const key = monthKeys[day.month - 1];

  if (key === undefined) {
    throw new Error(`${day.month} is not a month of the year`);
  }

  return words[key];
}

/**
 * Which ending a day of a month takes. The eleventh, the twelfth and the thirteenth take the last
 * one, and so does every hundredth of them. Which letters those are is the language's answer and
 * not this function's: English writes the 14th and Spanish writes the 14.
 */
const dayKeys: Readonly<Record<number, SiteWordKey>> = {
  1: 'cycleDayFirst',
  2: 'cycleDaySecond',
  3: 'cycleDayThird',
};

export function theDayOfMonth(words: SiteWords, dayOfMonth: number): string {
  const lastTwo = dayOfMonth % 100;
  const key =
    lastTwo >= 11 && lastTwo <= 13
      ? 'cycleDayOther'
      : (dayKeys[dayOfMonth % 10] ?? 'cycleDayOther');

  return words[key].replace('{day}', `${dayOfMonth}`);
}

/**
 * The window as she reads it. The month is named once where both ends fall in the same one, which
 * is the sentence the application writes. No year is named: a window a week long that crosses the
 * turn of a year names two months already, and a year in a card about next month reads as a
 * forecast somebody made for a year away.
 */
export function theWindowSentence(words: SiteWords, window: AWindowOfDays): string {
  const from = theDayOfMonth(words, window.from.dayOfMonth);
  const to = theDayOfMonth(words, window.to.dayOfMonth);

  if (window.from.month === window.to.month) {
    return words.cycleNextRange
      .replace('{from}', from)
      .replace('{to}', to)
      .replace('{month}', monthName(words, window.from));
  }

  return words.cycleNextRangeAcrossMonths
    .replace('{from}', from)
    .replace('{fromMonth}', monthName(words, window.from))
    .replace('{to}', to)
    .replace('{toMonth}', monthName(words, window.to));
}

/** The whole of it, from a clock: the sentence the card draws for the day that clock is reading. */
export function theWindowOn(words: SiteWords, opened: ADay): string {
  return theWindowSentence(words, theWindowAfter(opened));
}
