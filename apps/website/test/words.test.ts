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
import { theHolesOfThePolicy } from '../lib/thePlaceholders';

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

/** The twelve months of the forecast card, as this site names them and as the application does. */
const theMonths: readonly [SiteWordKey, string][] = [
  ['cycleMonthJanuary', 'january'],
  ['cycleMonthFebruary', 'february'],
  ['cycleMonthMarch', 'march'],
  ['cycleMonthApril', 'april'],
  ['cycleMonthMay', 'may'],
  ['cycleMonthJune', 'june'],
  ['cycleMonthJuly', 'july'],
  ['cycleMonthAugust', 'august'],
  ['cycleMonthSeptember', 'september'],
  ['cycleMonthOctober', 'october'],
  ['cycleMonthNovember', 'november'],
  ['cycleMonthDecember', 'december'],
];

/** The four endings a day of a month takes, under both names. */
const theDayEndings: readonly [SiteWordKey, string][] = [
  ['cycleDayFirst', 'first'],
  ['cycleDaySecond', 'second'],
  ['cycleDayThird', 'third'],
  ['cycleDayOther', 'other'],
];

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

  /**
   * The forecast card is a picture of her home screen, so what it says about the window has to be
   * what the screen says about it. The application never names a confidence: a word such as high
   * reads as a promise about her body rather than as arithmetic on her own cycles, so the screen
   * says only how many cycles the window was taken from, and this card now says the same.
   *
   * The count is the board's six, written into the sentence here, because the page has none of her
   * cycles to count.
   */
  it.each(languages)(
    'says how sure the forecast is in the application’s words, in %s',
    (language) => {
      const said = theApplication[language]['forecast.confidence.sentence'];

      expect(typeof said).toBe('string');
      expect(wordsIn(language).cycleNextConfidence).toBe(`${said}`.replace('{cycles}', '6'));
      expect(wordsIn(language).cycleNextConfidence).not.toMatch(/\{/);
    },
  );

  it.each(languages)('names the twelve months in the application’s words, in %s', (language) => {
    const words = wordsIn(language);
    const application = theApplication[language];

    for (const [key, month] of theMonths) {
      expect({ month, said: words[key] }).toEqual({
        month,
        said: application[`calendar.month.${month}`],
      });
    }

    expect(theMonths).toHaveLength(12);
  });

  /**
   * The application keeps the ending of a day of a month on its own, and this site keeps the whole
   * day, because a word of this site is never empty and Russian and Spanish add nothing to the
   * number. So the two are read against each other through a day rather than directly.
   *
   * The two sentences the day is written into are the board's own and not the application's. The
   * application writes the Russian window shorter than the board drew it, and the board is what
   * this page is held to.
   */
  it.each(languages)(
    'writes a day of a month the way the application writes it, in %s',
    (language) => {
      const words = wordsIn(language);
      const application = theApplication[language];

      for (const [key, ending] of theDayEndings) {
        expect({ ending, said: words[key].replace('{day}', '4') }).toEqual({
          ending,
          said: `4${application[`calendar.ordinal.${ending}`] as string}`,
        });
      }
    },
  );

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
   * the brand line says what the four letters stand for, Emi is called Emi everywhere, and Apple's
   * store carries one name in every country. A sixth entry here is a translation somebody forgot.
   *
   * The names of the two people building Emi are not here, because they are not words of a
   * catalogue at all. They sit beside the band that draws them, where nobody can translate them.
   */
  const namesRatherThanWords: readonly SiteWordKey[] = [
    'brandLine',
    'headerEmi',
    'footerEmiGroup',
    'footerAppStore',
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

  /**
   * A page leaves a hole for text nobody has written yet, and a hole reads the same in every
   * language until the text arrives. A hole kept in a catalogue would be refused by the case above
   * as an untranslated word, so it is kept beside the page instead, and this says so.
   */
  it('holds no hole of a page, because a hole is not a word', () => {
    for (const language of languages) {
      const held = Object.values(wordsIn(language));

      expect(held.filter((said) => theHolesOfThePolicy.some((hole) => said === hole))).toEqual([]);
    }

    expect(theHolesOfThePolicy.length).toBeGreaterThan(0);
    expect(theHolesOfThePolicy.every((hole) => /^\[/.test(hole))).toBe(true);
  });
});
