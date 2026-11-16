import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { english as applicationEnglish } from '../../mobile/src/language/english';
import { russian as applicationRussian } from '../../mobile/src/language/russian';
import { spanish as applicationSpanish } from '../../mobile/src/language/spanish';
import { type Language, languages, wordsIn } from '../app/words';
import {
  type WhatOneFileSays,
  amountsOfMoneyIn,
  hostsIn,
  problemsWithTheAddress,
  problemsWithThePeriod,
  problemsWithWhatItCosts,
  theAmountOf,
  theOldPeriod,
  theOneAmount,
  theOneHost,
  theOnePeriod,
  theOnePrice,
  whoseWordsAreIn,
} from '../lib/theOnePrice';
import { websiteWorkspace } from './stylesheet';

/**
 * The site says one price and one address, or it says nothing anybody should believe.
 *
 * The whole directory is read rather than the three catalogues it exports, because a figure can
 * arrive in a comment, in a word nobody draws yet, or in a fourth file somebody adds, and each of
 * those reaches a reader of this repository and some of them reach the page.
 */

const theWords = join(websiteWorkspace, 'app', 'words');

/** The application's own catalogues, which carry the line this site copies. */
const theApplication: Readonly<Record<Language, Readonly<Record<string, unknown>>>> = {
  en: applicationEnglish,
  ru: applicationRussian,
  es: applicationSpanish,
};

function everyFileOfTheWords(): WhatOneFileSays[] {
  return readdirSync(theWords)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => ({ file: name, text: readFileSync(join(theWords, name), 'utf8') }));
}

/** A file of the words with one thing changed, which is how a refusal is watched happening. */
function theWordsBut(file: string, said: string, instead: string): WhatOneFileSays {
  const text = readFileSync(join(theWords, file), 'utf8');

  expect(text).toContain(said);

  return { file, text: text.replace(said, instead) };
}

describe('the site asks for one price', () => {
  it('reads every file of the words, so nothing is measured on an empty directory', () => {
    const read = everyFileOfTheWords();

    expect(read.map(({ file }) => file).sort()).toEqual([
      'english.ts',
      'index.ts',
      'language.ts',
      'russian.ts',
      'spanish.ts',
      'words.ts',
    ]);
    expect(read.every(({ text }) => text.length > 0)).toBe(true);
  });

  it('holds a price for each language the site serves, and none of them empty', () => {
    expect(Object.keys(theOnePrice).sort()).toEqual([...languages].sort());
    expect(languages.every((language) => theOnePrice[language].length > 0)).toBe(true);
  });

  it.each(languages)('says the one price on the page she reads, in %s', (language) => {
    expect(wordsIn(language).price).toBe(theOnePrice[language]);

    // The store charges what the application says it charges, so the page and the application say
    // one sentence. A site that drifted from it would ask her for a product nobody sells.
    expect(theOnePrice[language]).toBe(theApplication[language]['onboarding.tour.price.line']);
  });

  it('names 39 a year and no other amount anywhere in the words', () => {
    const found = everyFileOfTheWords().flatMap(({ text }) => amountsOfMoneyIn(text));

    expect(found.length).toBe(languages.length);
    expect(found.map((amount) => theAmountOf(amount))).toEqual(found.map(() => theOneAmount));
    expect(everyFileOfTheWords().flatMap(problemsWithWhatItCosts)).toEqual([]);
  });

  it('refuses words that ask for a different amount, and says what she would be asked for', () => {
    const cheaper = theWordsBut('english.ts', '39 euros a year', '€24.99 a year');

    expect(problemsWithWhatItCosts(cheaper)).toEqual([
      'english.ts asks for €24.99, and the one price is 39 a year',
      `english.ts names money outside the one price, which reads "${theOnePrice.en}"`,
    ]);
  });

  it('refuses words that keep the amount and change the period, because that is another product', () => {
    const monthly = theWordsBut('english.ts', '39 euros a year', '39 euros a month');

    expect(problemsWithWhatItCosts(monthly)).toEqual([
      `english.ts names money outside the one price, which reads "${theOnePrice.en}"`,
    ]);
  });

  /**
   * A count of people carries a separator between its thousands, which is the separator an amount
   * of money carries between its euros and its cents. One of the founders' notes says she worked
   * with over 1,500 women, and a reader of that sentence is not being quoted a price.
   */
  it('reads a count of thousands as a count and not as money', () => {
    expect(amountsOfMoneyIn('over 1,500 women')).toEqual([]);
    expect(amountsOfMoneyIn('más de 1.500 mujeres')).toEqual([]);
    expect(amountsOfMoneyIn('39 euros a year')).toEqual(['39 euros']);

    // A currency sign in front still makes a figure money, however it is grouped.
    expect(amountsOfMoneyIn('€1,500 a year')).toEqual(['€1,500']);
  });

  /**
   * A figure of 39 carries no separator, so nothing inside it says it is money. The word beside it
   * does, in each of the three languages, and a count of years in the same sentence does not.
   */
  it('reads the price out of each language and leaves a count of years alone', () => {
    expect(amountsOfMoneyIn(theOnePrice.en)).toEqual(['39 euros']);
    expect(amountsOfMoneyIn(theOnePrice.ru)).toEqual(['39 евро']);
    expect(amountsOfMoneyIn(theOnePrice.es)).toEqual(['39 euros']);
    expect(amountsOfMoneyIn('After 9 years of psychological practice')).toEqual([]);
    expect(theAmountOf('39 евро')).toBe('39');
  });

  it('refuses an amount in a file that holds the words of no language', () => {
    expect(problemsWithWhatItCosts({ file: 'words.ts', text: 'it costs 19.99' })).toEqual([
      'words.ts asks for 19.99, and the one price is 39 a year',
      'words.ts names money, and it holds the words of no language of the site',
    ]);
    expect(whoseWordsAreIn('words.ts')).toBe(null);
    expect(whoseWordsAreIn(join(theWords, 'russian.ts'))).toBe('ru');
  });
});

/**
 * Emi is one product, sold by the year. A page or a screen that priced her by the month would be
 * asking for a product no store carries, and both of them copy the sentence held here.
 */
describe('the price covers a year', () => {
  it('holds a period for each language, and the period Emi stopped selling', () => {
    expect(Object.keys(theOnePeriod).sort()).toEqual([...languages].sort());
    expect(Object.keys(theOldPeriod).sort()).toEqual([...languages].sort());
  });

  it.each(languages)('ends the sentence on the year the page shows her, in %s', (language) => {
    expect(problemsWithThePeriod(language, theOnePrice[language])).toEqual([]);
  });

  it.each(languages)('ends the sentence on the year the screen shows her, in %s', (language) => {
    const line = theApplication[language]['onboarding.tour.price.line'];

    expect(typeof line).toBe('string');
    expect(problemsWithThePeriod(language, String(line))).toEqual([]);
  });

  it('refuses a monthly price, which is the product Emi stopped selling', () => {
    expect(problemsWithThePeriod('en', 'One month free, then 39 euros a month.')).toEqual([
      '"One month free, then 39 euros a month." does not end "a year.", and Emi is sold by the year',
      '"One month free, then 39 euros a month." asks for a price "a month.", which Emi does not sell',
    ]);
    expect(problemsWithThePeriod('ru', 'Первый месяц бесплатно, затем 39 евро в месяц.')).toEqual([
      '"Первый месяц бесплатно, затем 39 евро в месяц." does not end "в год.", and Emi is sold by the year',
      '"Первый месяц бесплатно, затем 39 евро в месяц." asks for a price "в месяц.", which Emi does not sell',
    ]);
    expect(problemsWithThePeriod('es', 'Un mes gratis, después 39 euros al mes.')).toEqual([
      '"Un mes gratis, después 39 euros al mes." does not end "al año.", and Emi is sold by the year',
      '"Un mes gratis, después 39 euros al mes." asks for a price "al mes.", which Emi does not sell',
    ]);
  });

  // The month she pays nothing for is still a month, and it is not the period of the price.
  it('keeps the free month, which names a month and is not a monthly price', () => {
    expect(theOnePrice.en).toContain('One month free');
    expect(theOnePrice.ru).toContain('Первый месяц бесплатно');
    expect(theOnePrice.es).toContain('Un mes gratis');
  });
});

describe('the site names one address', () => {
  it('is the host the pages of the site are served from', () => {
    expect(theOneHost).toBe('myemi.app');
  });

  it('names myemi.app and no other host anywhere in the words', () => {
    const found = everyFileOfTheWords().flatMap(({ text }) => hostsIn(text));

    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((host) => host !== theOneHost)).toEqual([]);
    expect(everyFileOfTheWords().flatMap(problemsWithTheAddress)).toEqual([]);
  });

  it('refuses words that name another host, and says which one', () => {
    const elsewhere = theWordsBut('language.ts', 'myemi.app', 'emi-tracker.com');

    expect(problemsWithTheAddress(elsewhere)).toEqual([
      'language.ts names emi-tracker.com, and the one address is myemi.app',
    ]);
  });

  it('reads a host out of a sentence and leaves a file name alone', () => {
    expect(hostsIn('read it at myemi.app, which the words.ts file names')).toEqual(['myemi.app']);
  });
});
