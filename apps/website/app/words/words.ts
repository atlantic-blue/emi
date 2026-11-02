import type { Language } from './language';

import { english } from './english';
import { russian } from './russian';
import { spanish } from './spanish';

export type SiteWordKey = keyof typeof english;

/** Every word one page needs, in one language. A key the site draws is a key all three hold. */
export type SiteWords = Readonly<Record<SiteWordKey, string>>;

const catalogues: Readonly<Record<Language, SiteWords>> = {
  en: english,
  ru: russian,
  es: spanish,
};

export function wordsIn(language: Language): SiteWords {
  return catalogues[language];
}

export const siteWordKeys: readonly SiteWordKey[] = Object.keys(english).sort() as SiteWordKey[];

/**
 * The brand line as the board sets it over the hero: the same words in capitals, with the full stop
 * between the two halves drawn as a separator.
 *
 * It is derived rather than held as a word of its own. The line says what the four letters of the
 * name stand for, so it stays in English in every language, and a second copy of it in each
 * catalogue is a second thing somebody can translate by mistake.
 */
export function brandEyebrowOf(words: SiteWords): string {
  return words.brandLine.toUpperCase().replace('. ', ' · ').replace(/\.$/, '');
}

/**
 * What a tab says, and what a chat draws as the first line of the card when somebody sends the
 * address on: the name, and then the sentence the page itself opens with.
 *
 * Derived from the headline rather than held as a word of its own, for the reason the line above
 * is: a second copy of a sentence is a second thing somebody can translate by mistake, and the tab
 * and the first line of the page would then say two different things in the same language. The
 * headline is a sentence and this is a title, so it loses the full stop, and it follows a colon,
 * so it starts in lower case.
 */
export function pageTitleOf(words: SiteWords): string {
  const sentence = words.heroHeadline.replace(/\.$/, '');

  return `Emi: ${sentence.charAt(0).toLocaleLowerCase()}${sentence.slice(1)}`;
}
