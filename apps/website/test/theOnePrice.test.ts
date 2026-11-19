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
  problemsWithWhatItCosts,
  theAmountOf,
  theOneHost,
  theOnePrice,
  thePriceOfTheStore,
  thePriceOnThisSite,
  thePricesOfTheTwoWays,
  theWayThatCharges,
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

describe('the site asks for one price in each shop it sells through', () => {
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

  it('holds a price for each language the site serves, in each shop, and none of them empty', () => {
    expect(thePricesOfTheTwoWays).toHaveLength(2);

    for (const way of thePricesOfTheTwoWays) {
      expect(Object.keys(way.said).sort()).toEqual([...languages].sort());
      expect(languages.every((language) => way.said[language].length > 0)).toBe(true);
    }
  });

  it.each(languages)('says what the store charges on the page she reads, in %s', (language) => {
    expect(wordsIn(language).price).toBe(thePriceOfTheStore.said[language]);

    // The store charges what the application says it charges, so the page and the application say
    // one sentence. A site that drifted from it would ask her for a product nobody sells.
    expect(thePriceOfTheStore.said[language]).toBe(
      theApplication[language]['onboarding.tour.price.line'],
    );
  });

  it.each(languages)('says what this site charges on the page she buys on, in %s', (language) => {
    const said = thePriceOnThisSite.said[language];

    expect(amountsOfMoneyIn(said).map(theAmountOf)).toEqual([thePriceOnThisSite.amount]);
  });

  it('names the free month, the year and the tax in the sentence this site says', () => {
    expect(thePriceOnThisSite.said.en).toBe(
      'One month free, then 39 euros a year, value added tax included.',
    );
    expect(thePriceOnThisSite.amount).toBe('39');
  });

  it('names what the store charges, and no amount at all for this site, in the words', () => {
    // The page she buys on reads its figure and its sentence from this file, so the catalogue of
    // words carries the store's amount alone. A figure written back into the words would be a
    // second place this site says what it costs, which is the drift this gate exists to catch.
    const found = everyFileOfTheWords().flatMap(({ text }) => amountsOfMoneyIn(text));

    expect(found).toHaveLength(languages.length);
    expect([...new Set(found.map((amount) => theAmountOf(amount)))]).toEqual([
      thePriceOfTheStore.amount,
    ]);
    expect(everyFileOfTheWords().flatMap(problemsWithWhatItCosts)).toEqual([]);

    for (const language of languages) {
      expect(wordsIn(language).checkoutPlanAmount).toContain('{amount}');
      expect(amountsOfMoneyIn(wordsIn(language).checkoutPlanAmount)).toEqual([]);
      expect(amountsOfMoneyIn(wordsIn(language).checkoutPay)).toEqual([]);
    }
  });

  it('reads an amount written with the euro sign, before it and after it', () => {
    expect(amountsOfMoneyIn('€39 a year').map(theAmountOf)).toEqual(['39']);
    expect(amountsOfMoneyIn('39 € в год').map(theAmountOf)).toEqual(['39']);
    expect(theWayThatCharges('€39')).toBe(thePriceOnThisSite);
    expect(theWayThatCharges('29.99')).toBe(thePriceOfTheStore);
    expect(theWayThatCharges('£24.99')).toBeUndefined();
  });

  it('refuses the price of one shop written in the words of the other', () => {
    const swapped = theWordsBut(
      'english.ts',
      'One month free, then 29.99 pounds a month.',
      'One month free, then 39 euros a month.',
    );

    expect(problemsWithWhatItCosts(swapped)).toEqual([
      `english.ts names money outside its price, which reads "${thePriceOnThisSite.said.en}"`,
    ]);
  });

  it('refuses words that ask for a different amount, and says what she would be asked for', () => {
    const cheaper = theWordsBut('english.ts', '29.99 pounds a month', '£24.99 a month');

    expect(problemsWithWhatItCosts(cheaper)).toEqual([
      'english.ts asks for £24.99, and the two prices are 29.99 and 39',
    ]);
  });

  it('refuses words that keep the amount and change the period, because that is another product', () => {
    const yearly = theWordsBut('english.ts', '29.99 pounds a month', '29.99 pounds a year');

    expect(problemsWithWhatItCosts(yearly)).toEqual([
      `english.ts names money outside its price, which reads "${theOnePrice.en}"`,
    ]);
  });

  /**
   * A count of people carries a separator between its thousands, which is the separator an amount
   * of money carries between its pounds and its pence. One of the founders' notes says she worked
   * with over 1,500 women, and a reader of that sentence is not being quoted a price.
   */
  it('reads a count of thousands as a count and not as money', () => {
    expect(amountsOfMoneyIn('over 1,500 women')).toEqual([]);
    expect(amountsOfMoneyIn('más de 1.500 mujeres')).toEqual([]);
    expect(amountsOfMoneyIn('29.99 pounds a month').map(theAmountOf)).toEqual(['29.99']);

    // A pound sign in front still makes a figure money, however it is grouped.
    expect(amountsOfMoneyIn('£1,500 a month')).toEqual(['£1,500']);
  });

  it('refuses an amount in a file that holds the words of no language', () => {
    expect(problemsWithWhatItCosts({ file: 'words.ts', text: 'it costs 19.99' })).toEqual([
      'words.ts asks for 19.99, and the two prices are 29.99 and 39',
      'words.ts names money, and it holds the words of no language of the site',
    ]);
    expect(whoseWordsAreIn('words.ts')).toBe(null);
    expect(whoseWordsAreIn(join(theWords, 'russian.ts'))).toBe('ru');
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
