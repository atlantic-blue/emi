/**
 * The three languages myemi.app serves, in the order the switcher draws them.
 *
 * The application asks the phone which language a woman reads and keeps the answer. A page is
 * asked by its own address instead, so the language arrives in the address and nothing here reads
 * a device. That is also why this list is its own and not the application's: the application holds
 * the same three languages, and `test/words.test.ts` reads the two lists against each other.
 */
export const languages = ['en', 'ru', 'es'] as const;

export type Language = (typeof languages)[number];

/** What a page is drawn in when the address names a language the site does not serve. */
export const fallbackLanguage: Language = 'en';

export function isLanguage(tag: string): tag is Language {
  return (languages as readonly string[]).includes(tag);
}

/**
 * The language and the region a page is written for, as a chat application wants it: a tag of two
 * halves, where the list above holds only the first. The region is the one Emi is sold in, so
 * English is the British one, because the price on every page of this site is in pounds.
 */
const locales: Readonly<Record<Language, string>> = {
  en: 'en_GB',
  ru: 'ru_RU',
  es: 'es_ES',
};

export function localeOf(language: Language): string {
  return locales[language];
}
