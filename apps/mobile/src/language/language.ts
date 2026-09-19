import { getLocales } from 'expo-localization';

/**
 * Every language Emi is written in. Each one is a catalogue beside the others rather than a
 * branch in any screen.
 */
export const languages = ['en', 'es', 'ru'] as const;

export type Language = (typeof languages)[number];

/** What she reads when her phone asks for a language Emi does not hold. */
export const fallbackLanguage: Language = 'en';

function isLanguage(tag: string): tag is Language {
  return (languages as readonly string[]).includes(tag);
}

/**
 * The first language on her list that Emi holds. A tag carries a region after the language, and
 * the region changes no word, so only the part before the first dash is read.
 */
export function languageOf(tags: readonly string[]): Language {
  for (const tag of tags) {
    const spoken = (tag.split('-')[0] ?? '').toLowerCase();

    if (isLanguage(spoken)) {
      return spoken;
    }
  }

  return fallbackLanguage;
}

/** The languages her phone asks for, in the order she put them in her own settings. */
export function phoneLanguageTags(): string[] {
  return getLocales().map((locale) => locale.languageTag);
}

export function phoneLanguage(): Language {
  return languageOf(phoneLanguageTags());
}
