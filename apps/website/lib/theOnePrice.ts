import type { Language } from '@/app/words';

import { SITE_ORIGIN } from '@/lib/addresses';

/**
 * One price for each way she can pay, and one address, in every language the site serves.
 *
 * A page that names an amount neither route charges is not a typing mistake. She reads the price
 * on the page, decides on it, and meets the figure she is charged one press later. The gap between
 * the two is the moment she stops believing the rest of the page. The address is the same kind of
 * promise: a host nobody serves is a dead link at best, and somebody else's site at worst.
 *
 * Two routes rather than one, because the site sells through two shops. The App Store carries the
 * monthly product of contract PAY-1, which the application's own tour names, and this site carries
 * the yearly one of contract PAY-6, which the page she buys on names. Each sentence is held whole:
 * the period is part of the price, so the same figure for a month and for a year is two products.
 */

/** One way to pay, as the sentence a page says and the amount inside it. */
export interface OneWayToPay {
  /** The sentence, written as each language writes it, full stop and all. */
  readonly said: Readonly<Record<Language, string>>;
  /** The amount on its own, with a full stop between the parts, as the gate compares it. */
  readonly amount: string;
}

/** What the App Store charges, which the application's tour and the pages about it name. */
export const thePriceOfTheStore: OneWayToPay = {
  said: {
    en: 'One month free, then 29.99 pounds a month.',
    ru: 'Первый месяц бесплатно, затем 29,99 фунта в месяц.',
    es: 'Un mes gratis, después 29,99 libras al mes.',
  },
  amount: '29.99',
};

/** What this site charges on the page she buys on, with the tax inside the amount. */
export const thePriceOnThisSite: OneWayToPay = {
  said: {
    en: 'One month free, then 39 euros a year, value added tax included.',
    ru: 'Первый месяц бесплатно, затем 39 евро в год, налог на добавленную стоимость включён.',
    es: 'Un mes gratis, después 39 euros al año, impuesto sobre el valor añadido incluido.',
  },
  amount: '39',
};

/** The two, in the order a reader meets them. Every amount in the words is one of these. */
export const thePricesOfTheTwoWays: readonly OneWayToPay[] = [
  thePriceOfTheStore,
  thePriceOnThisSite,
];

/** What the page asks her for in the store, kept under its old name for the pages that read it. */
export const theOnePrice: Readonly<Record<Language, string>> = thePriceOfTheStore.said;

/** The amount the store charges, with a full stop between the parts. */
export const theOneAmount = thePriceOfTheStore.amount;

/** The one host the site serves, taken from the address its pages already name. */
export const theOneHost = new URL(SITE_ORIGIN).host;

/** Which file of the catalogue holds which language, by the name a reader sees in the directory. */
const whoseWordsTheyAre: Readonly<Record<string, Language>> = {
  'english.ts': 'en',
  'russian.ts': 'ru',
  'spanish.ts': 'es',
};

/** Whose words a file holds, or nothing where it holds the words of no language. */
export function whoseWordsAreIn(file: string): Language | null {
  return whoseWordsTheyAre[file.slice(file.lastIndexOf('/') + 1)] ?? null;
}

/**
 * The currencies the two shops charge in, spelled out, as each language spells them. A sentence
 * names the amount in words and the card is charged the figure, so a reader of the words has to
 * see both forms.
 */
export const theWordsForMoney: readonly string[] = [
  'euros',
  'euro',
  'евро',
  'pounds',
  'pound',
  'libras',
  'libra',
  'фунта',
  'фунтов',
];

/**
 * Every amount of money a text names: a figure with a separator and two places after it, with or
 * without the pound sign in front. A year, a day of the month and a cycle length carry no
 * separator, so none of them is read as money.
 *
 * A separator between thousands is not one either, which is why the two places have to be the last
 * two digits of the figure. English writes a count of people as 1,500 and Spanish writes it as
 * 1.500, and the first four characters of both read as an amount of money until a third digit is
 * refused after them.
 */
export function amountsOfMoneyIn(text: string): string[] {
  const money = new RegExp(
    [
      // A figure with a sign in front of it, or a sign after it, which is how the euro is written
      // in Russian and in Spanish.
      String.raw`[£€]\s?\d+(?:[.,]\d+)?`,
      String.raw`\d+(?:[.,]\d+)?\s?€`,
      // A figure with the currency spelled out after it, which is how the sentence says it. The
      // list is short on purpose: a bare figure is a cycle length, a day of the month or a count
      // of women, and reading one of those as money would stop the pipeline on a sentence about
      // nothing. No word boundary after it: a boundary is written for the Latin alphabet, and it
      // asserts nothing at the end of a Cyrillic word.
      String.raw`\d+(?:[.,]\d+)?\s?(?:${theWordsForMoney.join('|')})`,
      // A figure with two places after a separator is money with no sign at all, which is how the
      // store's amount is written in all three languages.
      String.raw`\d+[.,]\d{2}(?!\d)`,
    ].join('|'),
    'gi',
  );

  return [...text.matchAll(money)].map(([found]) => found);
}

/** One amount in the one form, so an amount written in two languages can be compared. */
export function theAmountOf(said: string): string {
  const withoutTheWord = said.replace(new RegExp(theWordsForMoney.join('|'), 'gi'), '');

  return withoutTheWord.replace(/[£€\s]/g, '').replace(',', '.');
}

/** The way that charges an amount, or nothing at all where neither of them charges it. */
export function theWayThatCharges(amount: string): OneWayToPay | undefined {
  return thePricesOfTheTwoWays.find((way) => way.amount === theAmountOf(amount));
}

/**
 * Every host a text names. The list of endings is short on purpose. It covers what a host of this
 * product could be, and it leaves a file name such as `words.ts` out, which otherwise reads as a
 * host whose ending nobody owns.
 */
export function hostsIn(text: string): string[] {
  const host = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:app|com|net|org|io|dev|uk|eu|me|ai)\b/gi;

  return [...text.matchAll(host)].map(([found]) => found);
}

/** One file of the catalogue, as a reader would name it and as it reads. */
export interface WhatOneFileSays {
  readonly file: string;
  readonly text: string;
}

/** What is wrong with the money a file names, as one sentence for each thing that is wrong. */
export function problemsWithWhatItCosts(said: WhatOneFileSays): string[] {
  const problems: string[] = [];
  const amounts = amountsOfMoneyIn(said.text);
  const whose = whoseWordsAreIn(said.file);
  const charged = new Set<OneWayToPay>();

  for (const amount of amounts) {
    const way = theWayThatCharges(amount);

    if (way === undefined) {
      problems.push(
        `${said.file} asks for ${amount}, and the two prices are ` +
          `${thePricesOfTheTwoWays.map((each) => each.amount).join(' and ')}`,
      );
      continue;
    }

    charged.add(way);
  }

  if (amounts.length === 0) {
    return problems;
  }

  if (whose === null) {
    problems.push(`${said.file} names money, and it holds the words of no language of the site`);

    return problems;
  }

  for (const way of charged) {
    if (!said.text.includes(way.said[whose])) {
      problems.push(`${said.file} names money outside its price, which reads "${way.said[whose]}"`);
    }
  }

  return problems;
}

/** What is wrong with the addresses a file names, as one sentence for each one. */
export function problemsWithTheAddress(said: WhatOneFileSays): string[] {
  return hostsIn(said.text)
    .filter((host) => host.toLowerCase() !== theOneHost)
    .map((host) => `${said.file} names ${host}, and the one address is ${theOneHost}`);
}
