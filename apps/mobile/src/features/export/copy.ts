import { monthNames } from '../forecast/copy';

/**
 * The words of the export, in one place. The document leaves her phone and can be read by somebody
 * who has never seen Emi, so every line says what it is looking at and claims nothing about it.
 */

export const exportCopy = {
  title: 'Export',
  back: 'Back',
  what: 'Two files. One you can read and give to a doctor, one another application can read.',
  where: 'Nothing is sent anywhere. The files are made on this phone and you choose who gets them.',
  make: 'Make the files',
  making: 'Making them',
  share: 'Share',
  again: 'Make them again',
  failed: 'The files could not be written. There may be no room left on the phone.',
  document: {
    title: 'Your record',
    /**
     * The denial is one of the five sentences the claims gate allows, word for word, because a
     * document that travels to a doctor is the first place somebody reads Emi as a medical opinion.
     */
    what: 'This is everything you logged in Emi. Emi is not a medical device.',
    cycles: 'Cycles',
    days: 'Days',
    settings: 'Settings',
    nothing: 'Nothing is logged yet.',
    predicted: 'predicted',
  },
} as const;

/** How many records each file carries, said as a count rather than as a size on disk. */
export function heldSentence(days: number, cycles: number): string {
  return `${counted(days, 'day')} and ${counted(cycles, 'cycle')}.`;
}

export function counted(count: number, thing: string): string {
  return `${count} ${count === 1 ? thing : `${thing}s`}`;
}

/** A day she deleted stays in the data file, so the document says where it went rather than lose it. */
export function deletedSentence(count: number): string {
  return `${counted(count, 'day')} you deleted ${count === 1 ? 'is' : 'are'} in the data file only.`;
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

  return `${fullDate(day)} at ${time}`;
}

/**
 * A field nobody wrote a label for, read as words. A later column reaches the document by this
 * rule rather than by being added to a list, which is the same reason the export walks the schema.
 */
export function wordsOf(name: string): string {
  const spaced = name.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  return `${spaced.slice(0, 1).toUpperCase()}${spaced.slice(1).toLowerCase()}`;
}
