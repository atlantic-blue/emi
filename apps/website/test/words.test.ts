import { approvedDenials, claimsIn } from '../../../tools/pipeline/forbiddenClaims';
import { english as applicationEnglish } from '../../mobile/src/language/english';
import { russian as applicationRussian } from '../../mobile/src/language/russian';
import { spanish as applicationSpanish } from '../../mobile/src/language/spanish';
import {
  type Language,
  type SiteWordKey,
  english,
  fallbackLanguage,
  isLanguage,
  languages,
  russian,
  siteWordKeys,
  spanish,
  wordsIn,
} from '../app/words';

/** The application's own catalogues, which this site copies its price line from. */
const theApplication: Readonly<Record<Language, Readonly<Record<string, unknown>>>> = {
  en: applicationEnglish,
  ru: applicationRussian,
  es: applicationSpanish,
};

/** Where each language writes a denial, which is how the two are picked out of the gate's list. */
const denialOpening: Readonly<Record<Language, string>> = {
  en: 'Emi is not a',
  ru: 'Emi не является',
  es: 'Emi no es un',
};

function approvedDenialsIn(language: Language): string[] {
  return approvedDenials.filter((denial) => denial.startsWith(denialOpening[language]));
}

describe('the languages the site serves', () => {
  it('serves one language for each catalogue the application holds', () => {
    expect([...languages].sort()).toEqual(Object.keys(theApplication).sort());
  });

  it('reads a language it serves and refuses one it does not', () => {
    expect(languages.every((spoken) => isLanguage(spoken))).toBe(true);
    expect(isLanguage('de')).toBe(false);
    expect(isLanguage('')).toBe(false);
    expect(isLanguage('EN')).toBe(false);
  });

  it('falls back to a language it serves', () => {
    expect(isLanguage(fallbackLanguage)).toBe(true);
  });
});

describe('the words of one page in three languages', () => {
  it.each(languages)('%s holds every word the page draws, and none of them empty', (language) => {
    const held = wordsIn(language);

    expect(Object.keys(held).sort()).toEqual([...siteWordKeys]);

    for (const key of siteWordKeys) {
      expect(held[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('holds the same keys in each language, so no page says less than another', () => {
    expect(Object.keys(russian).sort()).toEqual(Object.keys(english).sort());
    expect(Object.keys(spanish).sort()).toEqual(Object.keys(english).sort());
  });

  it.each(languages)('says what Emi costs in the words the application uses, in %s', (language) => {
    expect(wordsIn(language).price).toBe(theApplication[language]['onboarding.tour.price.line']);
  });

  it.each(languages)('opens the foot of the page with an approved denial, in %s', (language) => {
    const disclaimer = wordsIn(language).footerDisclaimer;
    const denials = approvedDenialsIn(language);
    const [said] = disclaimer.split('. ');

    // The board writes both denials as one sentence and the approved home design carries it word
    // for word, so the gate holds that sentence rather than the two it is built from.
    expect(denials).toContain(`${said ?? ''}.`);
    expect(disclaimer.startsWith(said ?? '')).toBe(true);
  });

  it.each(languages)('says what Emi is not before anything else it says, in %s', (language) => {
    const disclaimer = wordsIn(language).footerDisclaimer;

    expect(claimsIn('the footer', disclaimer)).toEqual([]);
    expect(disclaimer.split('. ')).toHaveLength(3);
  });

  it.each(languages)('names who she would be paying, in %s', (language) => {
    expect(wordsIn(language).footerCopyright).toContain('Atlantic Blue Solutions Limited.');
  });

  it('writes the brand line in English everywhere, because it says what the name stands for', () => {
    for (const language of languages) {
      expect(wordsIn(language).brandLine).toBe(english.brandLine);
    }
  });

  /**
   * The words that stay in English in all three languages. Each one is a name rather than a word:
   * the brand line says what the four letters stand for, Emi is called Emi everywhere, Apple's
   * store carries one name in every country, and the person building Emi is called what he is
   * called. A sixth entry here is a translation somebody forgot.
   */
  const namesRatherThanWords: readonly SiteWordKey[] = [
    'brandLine',
    'headerEmi',
    'footerEmiGroup',
    'footerAppStore',
    'founderName',
  ];

  it('writes every other word of a language in that language', () => {
    const translated = Object.keys(english).filter(
      (key) => !namesRatherThanWords.includes(key as SiteWordKey),
    ) as SiteWordKey[];

    expect(translated.length).toBeGreaterThan(30);

    for (const key of translated) {
      expect(russian[key]).not.toBe(english[key]);
      expect(spanish[key]).not.toBe(english[key]);
    }
  });

  it('keeps a name the same in all three, and keeps that list short', () => {
    for (const key of namesRatherThanWords) {
      expect(russian[key]).toBe(english[key]);
      expect(spanish[key]).toBe(english[key]);
    }

    expect(namesRatherThanWords.length).toBeLessThan(6);
  });
});
