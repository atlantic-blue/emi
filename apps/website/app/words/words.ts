import type { Language } from './language';

/** Every word one page needs, in one language. */
export type SiteWords = Readonly<Record<SiteWordKey, string>>;

export type SiteWordKey =
  | 'brandLine'
  | 'tagline'
  | 'line'
  | 'store'
  | 'beta'
  | 'price'
  | 'footerLine'
  | 'languageLabel'
  | 'pageDescription';

export const siteWordKeys: readonly SiteWordKey[] = [];

export function wordsIn(_language: Language): SiteWords {
  throw new Error('myemi.app holds no words yet');
}
