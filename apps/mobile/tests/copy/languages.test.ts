import type { Locale } from 'expo-localization';
import { getLocales } from 'expo-localization';

import { english } from '../../src/language/english';
import {
  type Language,
  fallbackLanguage,
  languageOf,
  languages,
} from '../../src/language/language';
import { spanish } from '../../src/language/spanish';
import {
  type Words,
  catalogueOf,
  forgetLanguage,
  pluralCategory,
  wordKeys,
  words,
} from '../../src/language/words';

/**
 * A word nobody translated fails here rather than drawing in English beside Spanish. A screen that
 * is half one language and half the other teaches a woman that the product is careless with her,
 * and she is reading it about her own body.
 */

const keysOf = (catalogue: Readonly<Record<string, Words>>): string[] =>
  Object.keys(catalogue).sort();

const pluralKeys = wordKeys.filter((key) => typeof english[key] !== 'string');

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const asAPhone = getLocales as jest.MockedFunction<typeof getLocales>;

describe('every language says the same things', () => {
  describe('the key set of each language', () => {
    it('is the same set, and it is the set the lookup reads', () => {
      for (const language of languages) {
        expect(keysOf(catalogueOf(language))).toEqual([...wordKeys]);
      }

      expect(languages.length).toBeGreaterThan(1);
      expect(wordKeys.length).toBeGreaterThan(100);
    });

    it('names Spanish, and the Spanish catalogue is not the English one', () => {
      expect([...languages]).toContain('es');
      expect(catalogueOf('es')).toBe(spanish);
      expect(catalogueOf('en')).toBe(english);
    });

    it('is compared whole, so a key missing from one language is named', () => {
      const untranslated: Record<string, Words> = { ...spanish };
      const [dropped] = wordKeys;
      delete untranslated[String(dropped)];

      expect(keysOf(untranslated)).not.toEqual([...wordKeys]);
      expect([...wordKeys].filter((key) => !(key in untranslated))).toEqual([dropped]);
    });

    it('is compared whole, so a key one language alone holds is named', () => {
      const extra: Record<string, Words> = { ...spanish, 'log.weight.nobodyAskedFor': 'Peso' };

      expect(keysOf(extra)).not.toEqual([...wordKeys]);
      expect(keysOf(extra).filter((key) => !(key in english))).toEqual([
        'log.weight.nobodyAskedFor',
      ]);
    });
  });

  describe('a word she reads', () => {
    it('is written in every language, and never left empty by accident', () => {
      // The four ordinal suffixes are the one place a language says nothing on purpose: Spanish
      // writes the 14 where English writes the 14th.
      const saysNothing = wordKeys.filter(
        (key) =>
          !key.startsWith('calendar.ordinal.') &&
          formsOf(spanish[key]).some((form) => form.trim().length === 0),
      );

      expect(saysNothing).toEqual([]);
    });

    it('is not the English word left behind, apart from the names that are the same', () => {
      const theSame = wordKeys.filter(
        (key) => formsOf(english[key]).join('|') === formsOf(spanish[key]).join('|'),
      );

      // Emi is a name, a wordmark is a picture, and a few words are spelled the same in both.
      expect(theSame.length).toBeLessThan(wordKeys.length / 10);
      expect(theSame).toContain('home.wordmark');
    });
  });

  describe('a key whose words change with the number', () => {
    it('carries both of the forms Spanish uses, and there are some to carry', () => {
      const missingAForm = pluralKeys.filter((key) => {
        const held = spanish[key];

        return typeof held === 'string' || held.one === undefined || held.other === undefined;
      });

      expect(missingAForm).toEqual([]);
      expect(pluralKeys.length).toBeGreaterThan(5);
    });

    it('is asked for the form the count takes, which Spanish counts as English does', () => {
      expect(pluralCategory('es', 1)).toBe('one');
      expect(pluralCategory('es', 0)).toBe('other');
      expect(pluralCategory('es', 2)).toBe('other');
    });
  });

  describe('the language her phone asks for', () => {
    it('is Spanish where she asks for Spanish, whatever region she is in', () => {
      expect(languageOf(['es'])).toBe('es');
      expect(languageOf(['es-MX'])).toBe('es');
      expect(languageOf(['ES-419'])).toBe('es');
    });

    it('is English where Emi does not hold what she asked for', () => {
      expect(languageOf(['ru-RU'])).toBe(fallbackLanguage);
      expect(languageOf([])).toBe('en');
    });

    it('is the first one on her list that Emi holds', () => {
      expect(languageOf(['ru-RU', 'es-ES', 'en-GB'])).toBe('es');
    });
  });

  describe('the words the lookup gives back', () => {
    afterEach(() => {
      forgetLanguage();
    });

    it('are Spanish on a Spanish phone, and the count picks the form', () => {
      readingIn('es');

      expect(words('log.flow.title')).toBe('Tu flujo');
      expect(words('export.dayCount', 1)).toBe('1 día');
      expect(words('export.dayCount', 3)).toBe('3 días');
    });

    it('fill a name inside braces the same way in either language', () => {
      readingIn('es');
      expect(words('log.energy.level', undefined, { level: 4 })).toBe('Nivel 4');

      forgetLanguage();
      readingIn('en');
      expect(words('log.energy.level', undefined, { level: 4 })).toBe('Level 4');
    });

    it('write a day of the month as Spanish writes it, with no English suffix on it', () => {
      readingIn('es');

      expect(words('calendar.ordinal.first')).toBe('');
      expect(words('calendar.ordinal.other')).toBe('');
    });
  });
});

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

/**
 * A phone set to one language. Only the tag is read, and the rest of what the platform reports is
 * filled in so the double answers the shape the real one answers.
 */
function aPhoneSetTo(tag: string): Locale {
  return {
    languageTag: tag,
    languageCode: tag.split('-')[0] ?? null,
    languageScriptCode: null,
    regionCode: null,
    languageRegionCode: null,
    currencyCode: null,
    currencySymbol: null,
    languageCurrencyCode: null,
    languageCurrencySymbol: null,
    decimalSeparator: null,
    digitGroupingSeparator: null,
    textDirection: 'ltr',
    measurementSystem: null,
    temperatureUnit: null,
  };
}

/** Hands the lookup a phone set to one language, rather than the one the runner reports. */
function readingIn(language: Language): void {
  asAPhone.mockReturnValue([aPhoneSetTo(language === 'es' ? 'es-ES' : 'en-GB')]);
  forgetLanguage();
}
