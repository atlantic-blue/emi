import type { Language } from '@/app/words';

import { SITE_ORIGIN } from '@/lib/addresses';

/**
 * One price and one address, in every language the site serves.
 *
 * A page that names a second amount, or a second host, is not a typing mistake. She reads the
 * price on the page, decides on it, and meets the store's own figure one press later. The gap
 * between the two is the moment she stops believing the rest of the page. The address is the same
 * kind of promise: a host nobody serves is a dead link at best, and somebody else's site at worst.
 *
 * The period is part of the price. 39 a month and 39 a year are two products, and only one of
 * them is the one the stores carry, so the words are held to the whole sentence rather than to a
 * figure found somewhere inside them.
 */

/** What the page asks her for, written as each language writes it, full stop and all. */
export const theOnePrice: Readonly<Record<Language, string>> = {
  en: 'One month free, then 39 euros a year.',
  ru: 'Первый месяц бесплатно, затем 39 евро в год.',
  es: 'Un mes gratis, después 39 euros al año.',
};

/**
 * How each language ends the sentence. The free month is a month and the price is not, so the two
 * are told apart by the period that follows the amount rather than by the word month alone.
 */
export const theOnePeriod: Readonly<Record<Language, string>> = {
  en: 'a year.',
  ru: 'в год.',
  es: 'al año.',
};

/** The period of the product Emi stopped selling, which no page and no screen may go back to. */
export const theOldPeriod: Readonly<Record<Language, string>> = {
  en: 'a month.',
  ru: 'в месяц.',
  es: 'al mes.',
};

/**
 * The amount on its own, with a full stop between the parts where it has parts. Russian and
 * Spanish write the comma their readers write, so an amount is read into this one form before two
 * of them are compared.
 */
export const theOneAmount = '39';

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

/** The one currency Emi is sold in, as each language of the site writes it after the figure. */
const currencyWord = 'euros?|евро';

/**
 * Every amount of money a text names: a figure a currency sign or a currency word marks as money,
 * and a figure with a separator and two places after it. A price of 39 carries no separator, so
 * the word beside it is the only thing that tells it from a count.
 *
 * A separator between thousands is not a separator between the parts of an amount, which is why
 * the two places have to be the last two digits of the figure. English writes a count of people as
 * 1,500 and Spanish writes it as 1.500, and the first four characters of both read as an amount of
 * money until a third digit is refused after them.
 */
export function amountsOfMoneyIn(text: string): string[] {
  const money = new RegExp(
    `[£€]\\s?\\d+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?\\s(?:${currencyWord})|\\d+[.,]\\d{2}(?!\\d)`,
    'gi',
  );

  return [...text.matchAll(money)].map(([found]) => found);
}

/** One amount in the one form, so an amount written in two languages can be compared. */
export function theAmountOf(said: string): string {
  return said.replace(new RegExp(`[£€\\s]|${currencyWord}`, 'gi'), '').replace(',', '.');
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

  for (const amount of amounts) {
    if (theAmountOf(amount) !== theOneAmount) {
      problems.push(`${said.file} asks for ${amount}, and the one price is ${theOneAmount} a year`);
    }
  }

  if (amounts.length === 0) {
    return problems;
  }

  if (whose === null) {
    problems.push(`${said.file} names money, and it holds the words of no language of the site`);

    return problems;
  }

  if (!said.text.includes(theOnePrice[whose])) {
    problems.push(
      `${said.file} names money outside the one price, which reads "${theOnePrice[whose]}"`,
    );
  }

  return problems;
}

/** What is wrong with the period a price names, as one sentence for each thing that is wrong. */
export function problemsWithThePeriod(language: Language, said: string): string[] {
  const problems: string[] = [];

  if (!said.endsWith(theOnePeriod[language])) {
    problems.push(
      `"${said}" does not end "${theOnePeriod[language]}", and Emi is sold by the year`,
    );
  }

  if (said.includes(theOldPeriod[language])) {
    problems.push(
      `"${said}" asks for a price "${theOldPeriod[language]}", which Emi does not sell`,
    );
  }

  return problems;
}

/** What is wrong with the addresses a file names, as one sentence for each one. */
export function problemsWithTheAddress(said: WhatOneFileSays): string[] {
  return hostsIn(said.text)
    .filter((host) => host.toLowerCase() !== theOneHost)
    .map((host) => `${said.file} names ${host}, and the one address is ${theOneHost}`);
}
