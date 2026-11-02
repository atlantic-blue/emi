import { approvedDenials } from '../../../tools/pipeline/forbiddenClaims';
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

  it.each(languages)('ends the footer with the two approved denials, in %s', (language) => {
    const denials = approvedDenialsIn(language);

    expect(denials).toHaveLength(2);
    expect(wordsIn(language).footerLine.endsWith(denials.join(' '))).toBe(true);
  });

  it.each(languages)('says who makes Emi in front of them, in %s', (language) => {
    const line = wordsIn(language).footerLine;
    const denials = approvedDenialsIn(language);

    expect(line).toContain('Atlantic Blue Solutions Limited.');
    expect(line.indexOf('Atlantic Blue')).toBeLessThan(line.indexOf(denials[0] as string));
  });

  it('writes the brand line in English everywhere, because it says what the name stands for', () => {
    for (const language of languages) {
      expect(wordsIn(language).brandLine).toBe(english.brandLine);
    }
  });

  it('writes every other word of a language in that language', () => {
    const translated = Object.keys(english).filter((key) => key !== 'brandLine') as SiteWordKey[];

    expect(translated.length).toBeGreaterThan(0);

    for (const key of translated) {
      expect(russian[key]).not.toBe(english[key]);
      expect(spanish[key]).not.toBe(english[key]);
    }
  });
});
