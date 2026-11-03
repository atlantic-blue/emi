import { type Language } from '@/app/words';

/** The page every language of the site has today, which sits at the language and nothing under it. */
export const THE_HOME_PAGE = '';

/**
 * The language tag for a reader whose language the site does not serve. A search engine reads it as
 * the page to offer when none of the three is what the reader asked for.
 */
export const FOR_A_READER_OF_NONE = 'x-default';

/** The one address of a page, and the same page in every language the site serves. */
export interface TheLinksOfAPage {
  readonly canonical: string;
  readonly languages: Readonly<Record<string, string>>;
}

export function theAddressOf(language: Language, page: string = THE_HOME_PAGE): string {
  return `/${language}/${page}`;
}

export function theLinksOf(language: Language, page: string = THE_HOME_PAGE): TheLinksOfAPage {
  return { canonical: theAddressOf(language, page), languages: {} };
}
