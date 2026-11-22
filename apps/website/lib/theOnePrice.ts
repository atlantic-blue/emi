import type { Language } from '@/app/words';

import { SITE_ORIGIN } from '@/lib/addresses';

/**
 * One price, one offer and one address, in every language the site serves.
 *
 * A page that names a third amount, or a second host, is not a typing mistake. She reads the
 * price on the page, decides on it, and meets the store's own figure one press later. The gap
 * between the two is the moment she stops believing the rest of the page. The address is the same
 * kind of promise: a host nobody serves is a dead link at best, and somebody else's site at worst.
 *
 * The offer is half of the price, and a page that names it carries the sentence that says so, so
 * the second figure is never a second price with nothing to explain it.
 */

/** What the page asks her for, written as each language writes it, full stop and all. */
export const theOnePrice: Readonly<Record<Language, string>> = {
  en: 'One month free, then 39 euros a year.',
  ru: 'Первый месяц бесплатно, затем 39 евро в год.',
  es: 'Un mes gratis, después 39 euros al año.',
};

/** How each language ends the sentence, full stop and all. */
export const theOnePeriod: Readonly<Record<Language, string>> = {
  en: 'a year.',
  ru: 'в год.',
  es: 'al año.',
};

/**
 * The amount on its own, with a full stop where it carries a separator. Russian and Spanish
 * write the comma their readers write, so an amount is read into this one form before two of them
 * are compared.
 */
export const theOneAmount = '39';

/**
 * The second amount the site may name, which is half of the one above, and the one page that may
 * name it is the Black Friday page. A woman who starts a subscription while that offer is open
 * pays it every year, so it is a price of the product rather than a discount on one payment.
 *
 * The amount is held beside the price it halves, because the two are read against each other: a
 * figure that is not half of the price is an offer the page cannot explain.
 */
export const theOfferAmount = '19.50';

/** What the Black Friday page asks her for, written as each language writes it. */
export const theOfferPrice: Readonly<Record<Language, string>> = {
  en: 'One month free, then 19.50 euros a year, every year, value added tax included.',
  ru: 'Первый месяц бесплатно, затем 19,50 евро в год, каждый год, налог на добавленную стоимость включён.',
  es: 'Un mes gratis, después 19,50 euros al año, cada año, impuesto sobre el valor añadido incluido.',
};

/** Whether an amount a text names is half of the price, which is what the offer charges. */
export function isHalfOfThePrice(amount: string): boolean {
  return Number(amount) * 2 === Number(theOneAmount);
}

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

/** The currency, as each language of the site writes it after the figure. */
const currencyWord = 'euros?|евро';

/**
 * Every amount of money a text names. A currency sign or a currency word beside a figure makes
 * it money, and so does a separator with two places after it. The price carries no separator, so
 * the word beside the figure is the only thing that tells it from a count.
 *
 * A separator between thousands is not a separator between the parts of an amount, which is why
 * the two places have to be the last two digits of the figure. English writes a count of people as
 * 1,500 and Spanish writes it as 1.500, and the first four characters of both read as an amount of
 * money until a third digit is refused after them.
 */
export function amountsOfMoneyIn(text: string): string[] {
  const money = new RegExp(
    [
      // The sign in front of the figure, which is how English writes the euro, and the sign after
      // it, which is how Russian and Spanish write it.
      String.raw`[£€]\s?\d+(?:[.,]\d+)?`,
      String.raw`\d+(?:[.,]\d+)?\s?€`,
      // The currency spelled out after the figure, with or without a space. No word boundary
      // after it: a boundary is written for the Latin alphabet, and it asserts nothing at the end
      // of a Cyrillic word.
      String.raw`\d+(?:[.,]\d+)?\s?(?:${currencyWord})`,
      // A separator with two places after it is money with no sign and no word at all.
      String.raw`\d+[.,]\d{2}(?!\d)`,
    ].join('|'),
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

/**
 * The words that are allowed to name an amount. Every other word on the site sends her to one of
 * these to find out what Emi costs, so a figure anywhere else is a second place for the price to
 * live, and two places drift apart.
 */
export const theWordsThatNameMoney = [
  'accountPaidUntil',
  'accountRenewsOn',
  'blackFridayDescription',
  'blackFridayInsteadOf',
  'blackFridayPrice',
  'checkoutPay',
  'checkoutPlanAmount',
  'checkoutPrice',
  'price',
] as const;

/**
 * The words that may name half of the price, which are the words of the page that offers it. Every
 * other sentence of the site says what Emi costs, so half of it anywhere else is a figure a reader
 * meets with nothing to tell her why it is lower than the one she read a moment ago.
 */
export const theWordsThatNameTheOffer = ['blackFridayDescription', 'blackFridayPrice'] as const;

/** The words of one catalogue that name an amount, by the key a reader finds them under. */
export function wordsNamingMoneyIn(said: Readonly<Record<string, string>>): string[] {
  return Object.entries(said)
    .filter(([, value]) => amountsOfMoneyIn(value).length > 0)
    .map(([key]) => key)
    .sort();
}

/** The words of one catalogue that name half of the price, under the same kind of name. */
export function wordsNamingTheOfferIn(said: Readonly<Record<string, string>>): string[] {
  return Object.entries(said)
    .filter(([, value]) => amountsOfMoneyIn(value).map(theAmountOf).includes(theOfferAmount))
    .map(([key]) => key)
    .sort();
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
    const figure = theAmountOf(amount);

    if (figure !== theOneAmount && figure !== theOfferAmount) {
      problems.push(
        `${said.file} asks for ${amount}, and the price is ${theOneAmount} a year, ` +
          `or ${theOfferAmount} while the offer is open`,
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

  // The offer is the one amount beside the price, so a file that names it says what it is as well.
  // Half of a price with no sentence beside it reads as a second price nobody explained.
  if (
    amounts.map(theAmountOf).includes(theOfferAmount) &&
    !said.text.includes(theOfferPrice[whose])
  ) {
    problems.push(
      `${said.file} names half of the price outside the offer, which reads "${theOfferPrice[whose]}"`,
    );
  }

  return problems;
}

/** What is wrong with the period a price names, or nothing where it names the right one. */
export function problemsWithThePeriod(language: Language, said: string): string[] {
  if (said.endsWith(theOnePeriod[language])) {
    return [];
  }

  return [
    `"${said}" does not end "${theOnePeriod[language]}", which is the period the price covers`,
  ];
}

/** What is wrong with the addresses a file names, as one sentence for each one. */
export function problemsWithTheAddress(said: WhatOneFileSays): string[] {
  return hostsIn(said.text)
    .filter((host) => host.toLowerCase() !== theOneHost)
    .map((host) => `${said.file} names ${host}, and the one address is ${theOneHost}`);
}
