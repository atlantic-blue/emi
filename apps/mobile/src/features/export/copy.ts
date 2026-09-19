import { words } from '../../language';
import { monthNames } from '../forecast/copy';

/**
 * The words of the export. The document leaves her phone and can be read by somebody who has never
 * seen Emi, so every line says what it is looking at and claims nothing about it.
 */

export const exportCopy = {
  title: words('export.title'),
  back: words('export.back'),
  what: words('export.what'),
  where: words('export.where'),
  make: words('export.make'),
  making: words('export.making'),
  share: words('export.share'),
  again: words('export.again'),
  failed: words('export.failed'),
  document: {
    title: words('export.document.title'),
    what: words('export.document.what'),
    cycles: words('export.document.cycles'),
    days: words('export.document.days'),
    settings: words('export.document.settings'),
    nothing: words('export.document.nothing'),
    predicted: words('export.document.predicted'),
  },
} as const;

/** A count of days, in the form the number takes. */
export function dayCount(count: number): string {
  return words('export.dayCount', count);
}

/** How many records each file carries, said as a count rather than as a size on disk. */
export function heldSentence(days: number, cycles: number): string {
  return words('export.held', undefined, {
    cycles: words('export.cycleCount', cycles),
    days: dayCount(days),
  });
}

/** A day she deleted stays in the data file, so the document says where it went rather than lose it. */
export function deletedSentence(count: number): string {
  return words('export.deleted', count, { days: dayCount(count) });
}

/** A date a stranger can read, with the year, because the file outlives the month it was made in. */
export function fullDate(day: string): string {
  const month = monthNames[Number(day.slice(5, 7)) - 1];

  if (month === undefined) {
    throw new Error(`${day} names no month of the year`);
  }

  return `${Number(day.slice(8, 10))} ${month} ${day.slice(0, 4)}`;
}

/** The instant a record was saved, written the same way as a date and with the time beside it. */
export function fullInstant(value: string): string {
  const at = new Date(value);

  if (Number.isNaN(at.getTime())) {
    return value;
  }

  const day = at.toISOString().slice(0, 10);
  const time = at.toISOString().slice(11, 16);

  return words('export.document.instant', undefined, { date: fullDate(day), time });
}

/**
 * A field nobody wrote a label for, read as words. A later column reaches the document by this
 * rule rather than by being added to a list, which is the same reason the export walks the schema.
 */
export function wordsOf(name: string): string {
  const spaced = name.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  return `${spaced.slice(0, 1).toUpperCase()}${spaced.slice(1).toLowerCase()}`;
}
