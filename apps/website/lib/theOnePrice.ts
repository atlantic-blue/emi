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
 * The period is part of the price. 29.99 a month and 29.99 a year are two products, and only one
 * of them is the one the stores carry, so the words are held to the whole sentence rather than to
 * a figure found somewhere inside them.
 */

/** What the page asks her for, written as each language writes it, full stop and all. */
export const theOnePrice: Readonly<Record<Language, string>> = {
  en: 'One month free, then 29.99 pounds a month.',
  ru: 'Первый месяц бесплатно, затем 29,99 фунта в месяц.',
  es: 'Un mes gratis, después 29,99 libras al mes.',
};

/**
 * The amount on its own, with a full stop between the parts. Russian and Spanish write the comma
 * their readers write, so an amount is read into this one form before two of them are compared.
 */
export const theOneAmount = '29.99';

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
 * Every amount of money a text names: a figure with a separator and two places after it, with or
 * without the pound sign in front. A year, a day of the month and a cycle length carry no
 * separator, so none of them is read as money.
 */
export function amountsOfMoneyIn(text: string): string[] {
  return [...text.matchAll(/£\s?\d+(?:[.,]\d+)?|\d+[.,]\d{2}/g)].map(([found]) => found);
}

/** One amount in the one form, so an amount written in two languages can be compared. */
export function theAmountOf(said: string): string {
  return said.replace(/[£\s]/g, '').replace(',', '.');
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
      problems.push(
        `${said.file} asks for ${amount}, and the one price is ${theOneAmount} a month`,
      );
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

/** What is wrong with the addresses a file names, as one sentence for each one. */
export function problemsWithTheAddress(said: WhatOneFileSays): string[] {
  return hostsIn(said.text)
    .filter((host) => host.toLowerCase() !== theOneHost)
    .map((host) => `${said.file} names ${host}, and the one address is ${theOneHost}`);
}
