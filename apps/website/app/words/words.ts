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
