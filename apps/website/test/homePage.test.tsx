import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { websiteColour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { approvedDenials } from '../../../tools/pipeline/forbiddenClaims';
import RootLayout from '../app/[lang]/layout';
import HomePage from '../app/[lang]/page';
import { type Language, brandEyebrowOf, languages, wordsIn } from '../app/words';
import { CARDS_ACROSS } from '../components/reviewRow';
import { LANGUAGES_ANCHOR } from '../components/siteHeader';
import { JULIANS_PHOTOGRAPH } from '../lib/addresses';
import {
  A_NAME_NOBODY_HAS_SIGNED,
  A_REVIEW_NOBODY_HAS_WRITTEN,
  thePlaceholders,
} from '../lib/thePlaceholders';
import { whatTheMarkupDraws } from './stylesheet';
import { hostsAPageMayNotName } from './theHostsAPageMayName';

/** Compiling the stylesheet takes a moment, and each case that reads it compiles its own markup. */
const longEnoughToCompile = 60_000;

/**
 * The whole document she is sent, which is the page inside the layout. Next.js composes the two
 * and answers with one of them, and the band at the top and the band at the foot belong to the
 * layout, so a read of the page on its own would read less than she is handed.
 */
async function pageIn(lang: string): Promise<string> {
  const page = await HomePage({ params: Promise.resolve({ lang }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang }) }),
  );
}

/**
 * The band where the two people building Emi say why, cut out of the document she is handed. A
 * read of the whole document would be satisfied by a sentence anywhere on the page, and what each
 * case below asks is what stands in this one band.
 */
function theBandOfTheFoundersIn(page: string): string {
  const opens = page.indexOf('<section aria-labelledby="note-title"');
  const closes = page.indexOf('</section>', opens);

  if (opens < 0 || closes < 0) {
    throw new Error('The page draws no band of the founders.');
  }

  return page.slice(opens, closes);
}

/**
 * The one hole of the approved board that the page no longer draws. It is read out of the board
 * by the name it opens with rather than written out here, so the sentence lives in one place and
 * a second hole cannot arrive under the same exception.
 */
function theHoleSheHasSinceFilled(onTheBoard: readonly string[]): string {
  const found = onTheBoard.filter((hole) => hole.startsWith('[IULIIA'));

  expect(found).toHaveLength(1);

  return found[0] ?? '';
}

/** The note inside that band, which is the one part of it the approved board drew as a hole. */
function theNoteIn(page: string): string {
  const band = theBandOfTheFoundersIn(page);
  const opens = band.indexOf('<blockquote');
  const closes = band.indexOf('</blockquote>', opens);

  if (opens < 0 || closes < 0) {
    throw new Error('The band of the founders draws no note.');
  }

  return band.slice(opens, closes);
}

/**
 * The sentences the honesty gate approves, taken from the gate's own list rather than written out
 * here. The gate is the one place the wording is decided, and a copy of it in this file would be a
 * second opinion that could drift from the first.
 */
function denialsStartingWith(prefix: string): string[] {
  return approvedDenials.filter((denial) => denial.startsWith(prefix));
}

const theDenials: Readonly<Record<Language, string[]>> = {
  en: denialsStartingWith('Emi is not a'),
  ru: denialsStartingWith('Emi не является'),
  es: denialsStartingWith('Emi no es un'),
};

/**
 * Only the clock is stood in for where a case reads the forecast card. Next.js draws a page by
 * awaiting it, and a run that held the ordinary timers of the platform still would never finish
 * drawing one.
 */
function withTheClockOn(day: Date): void {
  jest.useFakeTimers({
    now: day,
    doNotFake: [
      'cancelAnimationFrame',
      'cancelIdleCallback',
      'clearImmediate',
      'clearInterval',
      'clearTimeout',
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'requestIdleCallback',
      'setImmediate',
      'setInterval',
      'setTimeout',
    ],
  });
}

/** What the card says on 4 November 2026: the week of the 16th, twelve days after that day. */
const theWindowAServerDraws: Readonly<Record<Language, string>> = {
  en: 'Between the 16th and the 22nd of November',
  ru: 'Между 16 и 22 ноября',
  es: 'Entre el 16 y el 22 de noviembre',
};

/** What it says on 19 December 2026, where the week runs over the turn of the year. */
const theWindowAcrossTheYear: Readonly<Record<Language, string>> = {
  en: 'Between the 31st of December and the 6th of January',
  ru: 'Между 31 декабря и 6 января',
  es: 'Entre el 31 de diciembre y el 6 de enero',
};

/**
 * Every sentence of the approved board, by the name the catalogues give it, in the order a reader
 * meets it down the page. A page that stops drawing one of these says less than the board the
 * operator approved, and the pixel comparison would only say that something moved.
 *
 * The window of the forecast card is not here. It is the one sentence the page works out rather
 * than draws, so it is read in the cases below for the day it is drawn on.
 */
const theWordsOfTheBoard = [
  'heroHeadline',
  'heroLine',
  'storeSmall',
  'heroPriceLine',
  'heroCancel',
  'ringOfAbout',
  'ringMove',
  'cycleEyebrow',
  'cycleHeadline',
  'cycleLine',
  'cycleNextLabel',
  'cycleNextConfidence',
  'cycleDenial',
  'learnEyebrow',
  'learnHeadline',
  'learnLine',
  'learnPeriodLabel',
  'learnPeriodTitle',
  'learnFollicularLabel',
  'learnFollicularTitle',
  'learnOvulationLabel',
  'learnOvulationTitle',
  'learnLutealLabel',
  'learnLutealTitle',
  'communityEyebrow',
  'communityHeadline',
  'communityLine',
  'communityJoin',
  'parentsEyebrow',
  'parentsHeadline',
  'parentsLine',
  'noteEyebrow',
  'founderIuliiaRole',
  'founderIuliiaNote',
  'privacyHeadline',
  'privacyLink',
  'reviewsEyebrow',
  'reviewsHeadline',
  'reviewsRating',
  'reviewFromTheStore',
  'reviewFromTheCommunity',
  'reviewFromTheBeta',
  'carouselPause',
  'tryTitle',
  'tryLine',
  'tryLink',
  'askTitle',
  'askLine',
  'askLink',
] as const;

describe('the page a woman meets Emi on', () => {
  it.each(languages)('draws every sentence of the approved board, in %s', async (language) => {
    const words = wordsIn(language);
    const page = await pageIn(language);
    const absent = theWordsOfTheBoard.filter((key) => !page.includes(words[key]));

    expect(absent).toEqual([]);
  });

  /**
   * The forecast card, drawn the way a server draws it, which is what a reader whose scripts never
   * run is handed. The board wrote two days in October 2026 into it, so the page served a forecast
   * for a week that had already gone to everybody who read it after that.
   *
   * The clock is stood in for, so the sentence is a sentence and not the arithmetic read back at
   * itself. Her browser counting it again is read in `theForecastCard.test.tsx`.
   */
  it.each(languages)('names a week that is still ahead of her, in %s', async (language) => {
    withTheClockOn(new Date(2026, 10, 4));

    try {
      const page = await pageIn(language);

      expect(page).toContain(theWindowAServerDraws[language]);
      expect(page).toContain(wordsIn(language).cycleNextLabel);
      expect(page).not.toContain(wordsIn(language).cycleMonthOctober);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(languages)('counts the window from the day it is drawn on, in %s', async (language) => {
    withTheClockOn(new Date(2026, 11, 19));

    try {
      expect(await pageIn(language)).toContain(theWindowAcrossTheYear[language]);
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * The one promise the whole product rests on, which the page makes twice: at the end of the hero
   * and again as a band of its own. It used to say her data is always encrypted, and an export is a
   * readable file she holds, so it now says where the encryption happens and what it covers.
   */
  it.each(languages)(
    'promises the encryption of her records on her phone, twice, in %s',
    async (language) => {
      const words = wordsIn(language);
      const page = await pageIn(language);

      expect(words.heroLine.endsWith(words.privacyHeadline)).toBe(true);
      expect(page.split(words.privacyHeadline)).toHaveLength(3);
    },
  );

  it.each(languages)(
    'says the first month is free, and names no amount, in %s',
    async (language) => {
      const words = wordsIn(language);
      const page = await pageIn(language);

      expect(page).toContain(words.heroPriceLine);
      expect(page).toContain(words.heroCancel);

      // The approved board took the amount off this page. The till is the one place a reader is told
      // what a month costs, so a number here would be a second place for it to live, and two places
      // for one price is how the page and the till come to say different things. The amount comes out
      // of the till's own line, because the ring is full of numbers that are not money.
      const amount = /\d+[.,]\d\d/.exec(words.price)?.[0] ?? '';

      expect(amount).toMatch(/\d/);
      expect(page).not.toContain(amount);
      expect(page).not.toMatch(/[£$€]/);
    },
  );

  it.each(languages)(
    'stands the first founder first, with the other beside her, in %s',
    async (language) => {
      const words = wordsIn(language);
      const page = await pageIn(language);

      expect(theBandOfTheFoundersIn(page)).toContain('Iuliia Nikolaeva');
      expect(page).toContain(words.founderIuliiaRole);

      // The note she wrote, in this reader's own language, drawn in the ink of the band rather
      // than in the quieter tone the board drew the hole in. The band is read rather than the
      // document, because a sentence anywhere on the page would satisfy a read of the document
      // while the band she signed stayed a hole.
      expect(theNoteIn(page)).toContain(words.founderIuliiaNote);
      expect(theNoteIn(page)).toContain('text-siteText');
      expect(theNoteIn(page)).not.toContain('text-siteQuietText');
      expect(theNoteIn(page)).not.toMatch(/\[[A-Z]/);

      // The second founder is one press away rather than on the page she is handed, so his note,
      // his role and his photograph are not drawn until the band moves.
      expect(page).not.toContain(words.founderJulianNote);
      expect(page).not.toContain(JULIANS_PHOTOGRAPH);
    },
  );

  /**
   * The photograph is a file the site serves, so the name the page points at and the name the
   * folder holds are read against each other. A page pointing at a file nobody committed draws an
   * empty circle, and every test that reads words would still pass.
   */
  it('serves the photograph the band points at', () => {
    expect(JULIANS_PHOTOGRAPH).toBe('/julian-tellez.jpg');
    expect(statSync(join(__dirname, '..', 'public', JULIANS_PHOTOGRAPH)).isFile()).toBe(true);
  });

  it.each(languages)(
    'draws three of the six review cards, each still a hole, in %s',
    async (language) => {
      const page = await pageIn(language);
      const cards = page.split(A_REVIEW_NOBODY_HAS_WRITTEN);

      expect(cards).toHaveLength(CARDS_ACROSS + 1);
      expect(page.split(A_NAME_NOBODY_HAS_SIGNED)).toHaveLength(CARDS_ACROSS + 1);
      expect(page).toContain(wordsIn(language).reviewsRating);
    },
  );

  /**
   * The board marks the text nobody has written yet in capitals inside square brackets, so a
   * reader can tell a hole from a promise. The page is held to the board's own set of them: a hole
   * the board does not leave is a hole somebody added, and a hole the board leaves and the page
   * drops is a sentence that reads as finished while it is not.
   *
   * One hole is the exception, and it is named rather than filtered by a pattern, so filling the
   * next one is a deliberate edit here. The first founder wrote her note after the board was
   * approved, and the board is a record of a drawing that nobody edits for a sentence that
   * arrived later, so the page draws her sentences where the board still draws the hole.
   */
  it('leaves the holes the board leaves, and no others', async () => {
    const bracketed = (text: string): string[] =>
      [...new Set([...text.matchAll(/\[[A-Z][^\]]*\]/g)].map(([found]) => found))].sort();

    const board = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        '..',
        'docs',
        'design',
        'website',
        'home-v2',
        'render',
        'MainV2.html',
      ),
      'utf8',
    );

    const onTheBoard = bracketed(board);
    const filled = theHoleSheHasSinceFilled(onTheBoard);
    const stillAHole = onTheBoard.filter((hole) => hole !== filled);

    expect(onTheBoard.length).toBeGreaterThan(0);
    expect(bracketed(await pageIn('en'))).toEqual(stillAHole);

    // Each of the two the board leaves standing on its own is held in one place, away from the
    // catalogues, because a hole is not a word and reads the same in every language.
    for (const waiting of thePlaceholders) {
      expect(stillAHole).toContain(waiting);
    }
  });

  // The board puts the brand line over the hero in capitals, and it is the one line that stays in
  // English in all three languages, so it is derived from that line rather than held again.
  it.each(languages)('stands the brand line over the hero in capitals, in %s', async (language) => {
    expect(await pageIn(language)).toContain(brandEyebrowOf(wordsIn(language)));
  });

  // The page denies both claims twice: once beside the forecast, where a reader decides what a
  // forecast is, and once in the band at the foot. Both are the board's own sentence, which is one
  // of the gate's approved denials.
  it.each(languages)('says what Emi is not, twice, in %s', async (language) => {
    const page = await pageIn(language);
    const carried = theDenials[language].filter((denial) => page.includes(denial));

    expect(theDenials[language].length).toBeGreaterThan(0);
    expect(carried).toHaveLength(1);
    expect(page.split(wordsIn(language).cycleDenial)).toHaveLength(3);
  });

  it.each(languages)(
    'offers Apple store twice, at the top and at the end, in %s',
    async (language) => {
      const page = await pageIn(language);
      const words = wordsIn(language);

      expect(page.split(`aria-label="${words.store}"`)).toHaveLength(3);
      expect(page.split(words.footerAppStore).length).toBeGreaterThan(3);
    },
  );

  it('names no host but the community chat she chooses to open, in any language', async () => {
    for (const language of languages) {
      expect(hostsAPageMayNotName(await pageIn(language))).toEqual([]);
    }
  });

  it('answers that there is no such page where the address names a language the site does not serve', async () => {
    await expect(pageIn('de')).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it(
    'paints the nine bands of the board in the palette the board paints them in',
    async () => {
      const painted = Object.values(await whatTheMarkupDraws(await pageIn('en'))).join(' ');

      for (const ground of [
        'siteGround',
        'siteCard',
        'siteTint',
        'siteNight',
        'siteTintDeep',
      ] as const) {
        expect(painted).toContain(`background-color: ${websiteColour[ground]}`);
      }

      expect(painted).toContain(`color: ${websiteColour.siteAccent}`);
      expect(painted).toContain(`color: ${websiteColour.siteNightAccent}`);
      expect(painted).toContain(`color: ${websiteColour.siteQuietText}`);
    },
    longEnoughToCompile,
  );
});

describe('the switcher in the band at the foot', () => {
  it.each(languages)('offers all three languages from the %s page', async (language) => {
    const page = await pageIn(language);

    for (const spoken of languages) {
      expect(page).toContain(`href="/${spoken}/"`);
      expect(page).toContain(`hrefLang="${spoken}"`);
    }
  });

  it.each(languages)('marks the %s page as the one she is reading', async (language) => {
    const page = await pageIn(language);
    const current = new RegExp(`<a[^>]*aria-current="page"[^>]*href="/${language}/"`);

    expect(page).toMatch(current);
    expect(page.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it('names each language the way that language names itself', async () => {
    const page = await pageIn('en');

    expect(page).toContain('>English</a>');
    expect(page).toContain('>Русский</a>');
    expect(page).toContain('>Español</a>');
  });

  it.each(languages)(
    'offers the way to that list from the band at the top, in %s',
    async (language) => {
      const page = await pageIn(language);

      expect(page).toContain(`aria-label="${wordsIn(language).headerLanguageLabel}"`);
      expect(page).toContain(`href="#${LANGUAGES_ANCHOR}"`);
      expect(page).toContain(`id="${LANGUAGES_ANCHOR}"`);
    },
  );
});
