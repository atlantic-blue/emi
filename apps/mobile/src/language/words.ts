import { english } from './english';
import { type Language, phoneLanguage } from './language';

/**
 * The plural categories a language can use. English uses two of them and Russian uses four, which
 * is the whole reason the lookup takes a count from the first step: a call site that never passed
 * one could not gain a fourth form later without being rewritten.
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** A key whose words change with the number beside them. Every language carries `other`. */
export type PluralWords = Partial<Record<PluralCategory, string>> & { readonly other: string };

export type Words = string | PluralWords;

export type WordKey = keyof typeof english;

export type Catalogue = Readonly<Record<WordKey, Words>>;

/** What a name inside braces is filled with. */
export type WordValues = Readonly<Record<string, string | number>>;

const catalogues: Readonly<Record<Language, Catalogue>> = { en: english };

export const wordKeys: readonly WordKey[] = Object.keys(english).sort() as WordKey[];

export function catalogueOf(language: Language): Catalogue {
  return catalogues[language];
}

/**
 * The language she reads Emi in, asked of the phone once. Nothing here changes while the
 * application is open, so a later call reads the answer rather than the phone.
 */
let spoken: Language | undefined;

export function readingLanguage(): Language {
  spoken ??= phoneLanguage();

  return spoken;
}

/** Forgets the answer, so a test can hand the lookup a different phone. */
export function forgetLanguage(): void {
  spoken = undefined;
}

/**
 * Which form of a plural key the count takes. `Intl` picks it, because it already holds the rule
 * for every language and a rule written here would be a second copy of it that drifts.
 */
export function pluralCategory(language: Language, count: number): PluralCategory {
  return new Intl.PluralRules(language).select(count) as PluralCategory;
}

function formOf(held: Words, language: Language, count: number | undefined): string {
  if (typeof held === 'string') {
    return held;
  }

  if (count === undefined) {
    throw new Error('a key whose words change with the number was read without one');
  }

  return held[pluralCategory(language, count)] ?? held.other;
}

function filled(text: string, count: number | undefined, values: WordValues | undefined): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    if (name === 'count' && count !== undefined) {
      return String(count);
    }

    const value = values?.[name];

    return value === undefined ? whole : String(value);
  });
}

/**
 * The words behind a key. The count is given wherever the words change with it, and it fills
 * `{count}` as well as choosing the form, so a sentence that names its own number says it once.
 */
export function words(key: WordKey, count?: number, values?: WordValues): string {
  const language = readingLanguage();
  const held = catalogueOf(language)[key];

  if (held === undefined) {
    throw new Error(`${language} holds no words under ${key}`);
  }

  return filled(formOf(held, language, count), count, values);
}
