import { english } from './english';
import { type Language, phoneLanguage } from './language';
import { russian } from './russian';
import { spanish } from './spanish';

/** The plural categories a language can use, named as the standard names them. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * The categories each language uses for a whole number, and the whole reason the lookup has taken
 * a count since the first step. English and Spanish use two. Russian uses three: two is few, five
 * is many, twenty one is one, and eleven is many.
 *
 * Russian carries no `other`, and that is not an omission. The standard gives that category to a
 * fraction, and Emi counts days and cycles, which are whole. A fraction reaching the lookup is a
 * fault in the caller, so it is refused rather than answered with the wrong words.
 */
export const pluralCategories = {
  en: ['one', 'other'],
  es: ['one', 'other'],
  ru: ['one', 'few', 'many'],
} as const satisfies Readonly<Record<Language, readonly PluralCategory[]>>;

/**
 * A key whose words change with the number, carrying one form for each category its own language
 * uses. The conditional spreads over the languages rather than collecting them, so a Russian entry
 * is held to the three Russian forms and never to the English two.
 */
export type PluralWordsIn<Spoken extends Language> = Spoken extends Language
  ? Readonly<Record<(typeof pluralCategories)[Spoken][number], string>>
  : never;

export type WordsIn<Spoken extends Language> = string | PluralWordsIn<Spoken>;

export type WordKey = keyof typeof english;

export type CatalogueIn<Spoken extends Language> = Readonly<Record<WordKey, WordsIn<Spoken>>>;

/** What any language may hold, for the code that reads a catalogue without knowing which it is. */
export type Words = WordsIn<Language>;

export type Catalogue = Readonly<Record<WordKey, Words>>;

/** What a name inside braces is filled with. */
export type WordValues = Readonly<Record<string, string | number>>;

const catalogues: Readonly<Record<Language, Catalogue>> = {
  en: english,
  es: spanish,
  ru: russian,
};

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

  const forms: Readonly<Partial<Record<PluralCategory, string>>> = held;
  const category = pluralCategory(language, count);
  const chosen = forms[category];

  if (chosen === undefined) {
    throw new Error(`${language} writes no ${category} form, and a count of ${count} asks for one`);
  }

  return chosen;
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
