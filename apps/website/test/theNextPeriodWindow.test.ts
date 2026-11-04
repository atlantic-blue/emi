import { type Language, languages, wordsIn } from '../app/words';
import {
  DAYS_THE_WINDOW_LASTS,
  DAYS_UNTIL_THE_WINDOW_OPENS,
  asADayNumber,
  theDayOf,
  theDayOfMonth,
  theDayWritten,
  theWindowAfter,
  theWindowOn,
} from '../lib/theNextPeriodRange';

/**
 * The window the forecast card names, which the board wrote as two days in October 2026 and the
 * page now counts from the day it is drawn for.
 *
 * What a reader of the card is promised is that Emi gives her a week rather than a date, and that
 * the week is ahead of her. Both of those are arithmetic, so both are read here, for a day inside
 * one month, for a day whose window crosses into the next one, for a day whose window crosses the
 * turn of the year, and for every day of a year at once.
 */

/** A day written as the three numbers, so a case reads as the day a woman would say. */
function on(written: string) {
  return theDayWritten(written);
}

/** What the card says in each language for one day, as one object a case can read at a glance. */
function theCardOn(written: string): Record<Language, string> {
  return {
    en: theWindowOn(wordsIn('en'), on(written)),
    ru: theWindowOn(wordsIn('ru'), on(written)),
    es: theWindowOn(wordsIn('es'), on(written)),
  };
}

describe('the window the forecast card names', () => {
  it('opens twelve days after the day it is drawn for and lasts a week', () => {
    const window = theWindowAfter(on('2026-11-04'));

    expect(DAYS_UNTIL_THE_WINDOW_OPENS).toBe(12);
    expect(DAYS_THE_WINDOW_LASTS).toBe(7);
    expect(asADayNumber(window.from)).toBe('2026-11-16');
    expect(asADayNumber(window.to)).toBe('2026-11-22');
  });

  it('names the month once where the whole week falls in one month, in all three languages', () => {
    expect(theCardOn('2026-11-04')).toEqual({
      en: 'Between the 16th and the 22nd of November',
      ru: 'Между 16 и 22 ноября',
      es: 'Entre el 16 y el 22 de noviembre',
    });
  });

  it('names both months where the week crosses into the next one, in all three languages', () => {
    expect(theCardOn('2026-11-15')).toEqual({
      en: 'Between the 27th of November and the 3rd of December',
      ru: 'Между 27 ноября и 3 декабря',
      es: 'Entre el 27 de noviembre y el 3 de diciembre',
    });
  });

  /**
   * The turn of the year. No year is named, because the two month names already say which way the
   * week runs, and a year in a card about next month reads as a forecast made for a year away.
   */
  it('crosses the turn of the year without naming a year, in all three languages', () => {
    expect(theCardOn('2026-12-19')).toEqual({
      en: 'Between the 31st of December and the 6th of January',
      ru: 'Между 31 декабря и 6 января',
      es: 'Entre el 31 de diciembre y el 6 de enero',
    });
  });

  it('counts the extra day of a leap year', () => {
    expect(theCardOn('2028-02-16').en).toBe('Between the 28th of February and the 5th of March');
    expect(asADayNumber(theWindowAfter(on('2028-02-16')).to)).toBe('2028-03-05');
  });

  /**
   * The one thing the card must never do. A reader who opens the page on any day of a year has to
   * be shown a week she has not lived yet, so every day of one is read rather than a few of them.
   */
  it('never names a day that has already passed, on any day of a year', () => {
    const behind: string[] = [];

    for (let count = 0; count < 365; count += 1) {
      const day = theDayOf(new Date(2027, 0, 1 + count));
      const window = theWindowAfter(day);

      if (asADayNumber(window.from) <= asADayNumber(day)) {
        behind.push(asADayNumber(day));
      }
    }

    expect(behind).toEqual([]);
  });

  it('keeps the week seven days long on any day of a year', () => {
    const wrong: string[] = [];

    for (let count = 0; count < 365; count += 1) {
      const day = theDayOf(new Date(2027, 0, 1 + count));
      const window = theWindowAfter(day);
      const days =
        (Date.UTC(window.to.year, window.to.month - 1, window.to.dayOfMonth) -
          Date.UTC(window.from.year, window.from.month - 1, window.from.dayOfMonth)) /
        86_400_000;

      if (days !== DAYS_THE_WINDOW_LASTS - 1) {
        wrong.push(`${asADayNumber(day)} gave ${days + 1} days`);
      }
    }

    expect(wrong).toEqual([]);
  });

  /** The endings English gives a day of a month, including the three that break the pattern. */
  it('writes the ending of a day of a month the way English writes it', () => {
    const words = wordsIn('en');
    const said = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map((day) =>
      theDayOfMonth(words, day),
    );

    expect(said).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '30th',
      '31st',
    ]);
  });

  it('writes a day of a month as the number alone in Russian and in Spanish', () => {
    for (const language of ['ru', 'es'] as const) {
      expect([1, 2, 3, 11, 21].map((day) => theDayOfMonth(wordsIn(language), day))).toEqual([
        '1',
        '2',
        '3',
        '11',
        '21',
      ]);
    }
  });

  it('leaves no hole unfilled in any language', () => {
    for (const language of languages) {
      for (const written of ['2026-11-04', '2026-11-15', '2026-12-19']) {
        expect(theWindowOn(wordsIn(language), on(written))).not.toMatch(/[{}]/);
      }
    }
  });

  it('refuses a day that is not a day of the calendar', () => {
    expect(() => theDayWritten('not-a-day')).toThrow(/not a day of the calendar/);
  });
});
