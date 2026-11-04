import { fallbackLanguage, languages, type Language } from '@/app/words';

import { SITE_ORIGIN } from './addresses';

/**
 * The page every language of the site has today: the language, and nothing under it. A page added
 * later passes its own path instead, written with the slash at the end that every address of this
 * site carries.
 */
export const THE_HOME_PAGE = '';

/**
 * The language tag a search engine reads for a reader whose language the site does not serve. It
 * is not a language, so it sits beside the three rather than among them.
 */
export const FOR_A_READER_OF_NONE = 'x-default';

/** What one page tells a search engine: its own address, and the same page in each language. */
export interface TheLinksOfAPage {
  readonly canonical: string;
  readonly languages: Readonly<Record<string, string>>;
}

/**
 * The address of a page, whole. A search engine keeps a page under the address the page gives it,
 * so the address names the host rather than beginning with a slash: a path would be kept under
 * whichever host the reader happened to arrive on.
 */
export function theAddressOf(language: Language, page: string = THE_HOME_PAGE): string {
  return `${SITE_ORIGIN}/${language}/${page}`;
}

/**
 * The links of one page of the site, built from the one host and the list of languages the site
 * keeps. A fourth language added to that list carries its own links from here, and the page it is
 * offered to a reader of none of them stays the language the site falls back to.
 */
export function theLinksOf(language: Language, page: string = THE_HOME_PAGE): TheLinksOfAPage {
  return {
    canonical: theAddressOf(language, page),
    languages: {
      ...Object.fromEntries(languages.map((each) => [each, theAddressOf(each, page)])),
      [FOR_A_READER_OF_NONE]: theAddressOf(fallbackLanguage, page),
    },
  };
}
