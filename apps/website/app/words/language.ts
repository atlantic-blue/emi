/** The languages myemi.app will serve. Nothing serves them yet. */
export const languages = ['en', 'ru', 'es'] as const;

export type Language = (typeof languages)[number];

export const fallbackLanguage: Language = 'en';

export function isLanguage(_tag: string): _tag is Language {
  return false;
}
