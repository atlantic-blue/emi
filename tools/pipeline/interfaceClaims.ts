import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { theProductsEmiSells } from '../../apps/mobile/src/services/store/theProducts';
import { SITE_ORIGIN } from '../../apps/website/lib/addresses';

import type { Claim } from './forbiddenClaims';
import {
  approvedDenials,
  claimsIn,
  forbiddenWording,
  interfaceOnlyWording,
  searchableText,
} from './forbiddenClaims';
import { interfaceFilesOf, interfaceRoot } from './singleDayForecast';

/**
 * The scan in forbiddenClaims.ts reads every tracked file against one list. This one reads the
 * application and the store listing against a longer list, because a document has room to explain
 * what a fertile window is and a screen does not. A woman reads the word on its own.
 *
 * It is a grep over the whole source rather than over the words a screen happens to render, so a
 * comment and a variable are held to it as well as a sentence. The only way to write one of these
 * words is a sentence from approvedDenials, which denies the claim rather than making it.
 */

/**
 * A module specifier is a package name and not a word anybody reads, so it comes out before the
 * search. `react-native-safe-area-context` is the one this exists for: importing it would otherwise
 * read as a claim about a day.
 */
const moduleSpecifier = /\b(from|import|require|mock)(\s*\(?\s*)(['"])(?:[^'"\\]|\\.)*?\3/g;

export function withoutModuleSpecifiers(source: string): string {
  return source.replace(
    moduleSpecifier,
    (_whole, keyword: string, between: string, quote: string) =>
      `${keyword}${between}${quote}${quote}`,
  );
}

const CONTEXT_CHARACTERS = 40;

function contextAround(text: string, at: number, length: number): string {
  return text.slice(Math.max(0, at - CONTEXT_CHARACTERS), at + length + CONTEXT_CHARACTERS).trim();
}

/**
 * The three words the interface adds are ordinary English, so each one is matched whole. A name
 * built around one, `SafeAreaView` among them, is not a word she reads and is left alone. Every
 * entry on the repository list is a phrase Emi could only write on purpose, so those stay a
 * substring search and catch a plural along the way.
 */
function wordClaimsIn(file: string, text: string, words: readonly string[]): Claim[] {
  const found: Claim[] = [];

  for (const word of words) {
    const at = text.search(new RegExp(`\\b${word}\\b`, 'i'));

    if (at < 0) {
      continue;
    }

    found.push({ file, wording: word, context: contextAround(text, at, word.length) });
  }

  return found;
}

/**
 * The website is the other place a woman can pay, and App Store guideline 3.1.1(a) refuses an
 * application that points her at one outside the United States. So the host is refused everywhere
 * the application draws from. A woman who paid there reaches her days by signing in instead.
 */
export const theHostOfTheWebsite = new URL(SITE_ORIGIN).host;

/**
 * Every amount the application may name, in euro cents, read from the module that holds the three
 * products rather than written again here. A figure anywhere else is a second home for a price,
 * and two homes drift apart until one of them is the number she meets at the till.
 */
export const theAmountsTheApplicationMayName: readonly number[] = theProductsEmiSells.map(
  (product) => product.priceInEuroCents,
);

/**
 * The module the amounts above are read from, so this scan reads every other file against it and
 * leaves it alone. Its own words say why the Black Friday product asks 19.99 euros rather than half
 * of the yearly price, and that sentence has to name the amount the website asks and the host that
 * asks it. The test beside the module holds each value instead.
 */
export const theFileThatHoldsThePrices = join(interfaceRoot, 'services', 'store', 'theProducts.ts');

/** The currency, as each language of the application writes it after the figure. */
const currencyWord = 'euros?|евро';

interface AnAmount {
  readonly said: string;
  readonly at: number;
}

/**
 * Every amount of money a text names. A currency sign or a currency word beside the figure makes
 * it money, and nothing else does.
 *
 * The same rule on the website also reads a bare figure with two places after the separator as
 * money, because it reads a catalogue of sentences. This scan reads the whole source of the
 * application, which is built on figures that are not amounts: an opacity of 0.42, a corner
 * radius, a line height. So the currency has to be beside the figure for it to be a price.
 */
function amountsIn(text: string): AnAmount[] {
  const money = new RegExp(
    [
      // The sign in front of the figure, which is how English writes the euro, and the sign after
      // it, which is how Russian and Spanish write it.
      String.raw`[£€]\s?\d+(?:[.,]\d+)?`,
      String.raw`\d+(?:[.,]\d+)?\s?€`,
      // The currency spelled out after the figure. No word boundary after it: a boundary is
      // written for the Latin alphabet, and it asserts nothing at the end of a Cyrillic word.
      String.raw`\d+(?:[.,]\d+)?\s?(?:${currencyWord})`,
    ].join('|'),
    'gi',
  );

  return [...text.matchAll(money)].map((match) => ({ said: match[0], at: match.index }));
}

export function amountsOfMoneyIn(text: string): string[] {
  return amountsIn(text).map(({ said }) => said);
}

/** One amount in euro cents, so two amounts written in different languages can be compared. */
export function theAmountInCents(said: string): number {
  const figure = said.replace(new RegExp(`[£€\\s]|${currencyWord}`, 'gi'), '').replace(',', '.');

  return Math.round(Number(figure) * 100);
}

/**
 * The host and the money, which are the two things a screen may not invent. Every other file is
 * read against the products module, and the products module itself is read from.
 */
function priceAndAddressClaimsIn(file: string, text: string): Claim[] {
  if (file === theFileThatHoldsThePrices) {
    return [];
  }

  const found: Claim[] = [];
  const host = text.toLowerCase().indexOf(theHostOfTheWebsite.toLowerCase());

  if (host >= 0) {
    found.push({
      file,
      wording: theHostOfTheWebsite,
      context: contextAround(text, host, theHostOfTheWebsite.length),
    });
  }

  for (const { said, at } of amountsIn(text)) {
    if (!theAmountsTheApplicationMayName.includes(theAmountInCents(said))) {
      found.push({ file, wording: said, context: contextAround(text, at, said.length) });
    }
  }

  return found;
}

/**
 * The one address on the website the application may name, written exactly as the application
 * writes it, with the language left as a hole.
 *
 * Apple asks every subscription to link to a privacy policy, and Emi has one page for it. The
 * rule the host is refused under is guideline 3.1.1(a), which refuses a press towards another way
 * to pay, and this page sells nothing. The line is removed from the text before the host is
 * looked for, so the host in any other sentence, under any other path, is still refused.
 */
export const approvedAddresses: readonly string[] = [
  'https://myemi.app/{language}/privacy-policy/',
];

function withoutApprovedAddresses(source: string): string {
  return approvedAddresses.reduce((text, address) => text.split(address).join(' '), source);
}

/**
 * Her answers on the Sex page, from the sexPage board. Each one names what she used, which is a
 * fact about her day and not a promise Emi makes, so the word is allowed as that exact catalogue
 * entry and nowhere else. The same word in any other sentence, or under any other key, is refused.
 */
export const approvedAnswerLabels: readonly string[] = [
  "'sex.sex.with': 'Protected'",
  "'sex.sex.with': 'Con protección'",
  "'sex.sex.without': 'Sin protección'",
];

function withoutAnswerLabels(source: string): string {
  return approvedAnswerLabels.reduce((text, label) => text.split(label).join(' '), source);
}

export function interfaceClaimsIn(file: string, contents: string): Claim[] {
  const source = withoutApprovedAddresses(withoutAnswerLabels(withoutModuleSpecifiers(contents)));
  const text = searchableText(source);

  return [
    ...claimsIn(file, source, approvedDenials, forbiddenWording),
    ...wordClaimsIn(file, text, interfaceOnlyWording),
    ...priceAndAddressClaimsIn(file, text),
  ];
}

export function interfaceClaimsUnder(root: string, files: readonly string[]): Claim[] {
  return files.flatMap((file) => interfaceClaimsIn(file, readFileSync(join(root, file), 'utf8')));
}

/**
 * Where feature 7 step 6 writes the words a stranger reads before she has the application. Each
 * file joins the scan on the day it is written, so that step needs no change here.
 */
export const storeListingFiles: readonly string[] = [
  'docs/store-listing.md',
  'docs/privacy-answers.md',
];

export function writtenStoreListingFiles(root: string): string[] {
  return storeListingFiles.filter((file) => existsSync(join(root, file)));
}

/** Everything held to the longer list: every file the application draws from, then the listing. */
export function scannedInterfaceFiles(root: string): string[] {
  return [...interfaceFilesOf(root), ...writtenStoreListingFiles(root)];
}
