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
