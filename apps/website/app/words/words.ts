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

export function pageTitleOf(words: SiteWords): string {
  return words.brandLine;
}
