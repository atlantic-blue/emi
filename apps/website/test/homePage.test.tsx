import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { websiteColour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { approvedDenials } from '../../../tools/pipeline/forbiddenClaims';
import RootLayout from '../app/[lang]/layout';
import HomePage from '../app/[lang]/page';
import { type Language, type SiteWordKey, brandEyebrowOf, languages, wordsIn } from '../app/words';
import { LANGUAGES_ANCHOR } from '../components/siteHeader';
import { JULIANS_PHOTOGRAPH } from '../lib/addresses';
import { theRealReviews } from '../lib/theReviews';
import { theStoreListingIsOpen } from '../lib/theStoreListing';
import { theKeysTheHomePageHoldsBack } from './theWordsAPressTookWithIt';
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
 * The one hole of the approved board that the page fills. It is read out of the board by the name
 * it opens with rather than written out here, so the sentence lives in one place and a second hole
 * cannot arrive under the same exception.
 */
function theHoleSheHasSinceFilled(onTheBoard: readonly string[]): string {
  const found = onTheBoard.filter((hole) => hole.startsWith('[IULIIA'));

  expect(found).toHaveLength(1);

  return found[0] ?? '';
}

/** The approved board, as the plain render of it committed beside the page. */
function theBoard(): string {
  return readFileSync(
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
}

/** The band of reviews as the board draws it, which is the band the page holds back. */
function theBandOfReviewsInTheBoard(): string {
  const board = theBoard();
  const opens = board.indexOf('<section aria-labelledby="reviews-title"');
  const closes = board.indexOf('</section>', opens);

  if (opens < 0 || closes < 0) {
    throw new Error('The approved board draws no band of reviews.');
  }

  return board.slice(opens, closes);
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
 * Every sentence of the approved board the page still draws, by the name the catalogues give it,
 * in the order a reader meets it down the page. A page that stops drawing one of these says less
 * than the board the operator approved, and the pixel comparison would only say that something
 * moved.
 *
 * The sentences a press took with it are not here, and the case under the list names them: a press
 * whose page nobody has built is not drawn, and the two sentences of the store go with the two
 * presses to it.
 */
const theWordsOfTheBoard = [
  'heroHeadline',
  'heroLine',
  'heroPriceLine',
  'heroCancel',
  'ringOfAbout',
  'ringMove',
  'cycleEyebrow',
  'cycleHeadline',
  'cycleLine',
  'cycleNextLabel',
  'cycleNextRange',
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
  'carouselPause',
] as const;

/**
 * The sentences of the one band the board draws and the page does not. Nobody has written a review
 * yet, so the band is held back whole, and every word of it is held back with it: a page that drew
 * the heading over an empty row would still be telling a reader that other people have spoken.
 */
const theWordsOfTheBandHeldBack: readonly SiteWordKey[] = [
  'reviewsEyebrow',
  'reviewsHeadline',
  'reviewsRating',
  'reviewFromTheStore',
  'reviewFromTheCommunity',
  'reviewFromTheBeta',
];

describe('the page a woman meets Emi on', () => {
  it.each(languages)('draws every sentence of the approved board, in %s', async (language) => {
    const words = wordsIn(language);
    const page = await pageIn(language);
    const absent = theWordsOfTheBoard.filter((key) => !page.includes(words[key]));

    expect(absent).toEqual([]);
  });

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

  /**
   * The band of reviews is the one band of the board the page does not draw. Nobody has said
   * anything about Emi yet, so the board's six cards stood on the live page as six holes in
   * brackets, under a rating and a count that were holes as well.
   *
   * The list the band is drawn from is read here too, because it is the thing that decides: a band
   * that went missing for some other reason would pass a read of the markup alone.
   */
  it.each(languages)(
    'draws no band of reviews while nobody has written one, in %s',
    async (language) => {
      const words = wordsIn(language);
      const page = await pageIn(language);

      expect(theRealReviews).toEqual([]);
      expect(page).not.toContain('reviews-title');

      for (const key of theWordsOfTheBandHeldBack) {
        expect(page).not.toContain(words[key]);
      }

      // The one figure left on the page is the note the two founders sign. The band of reviews drew
      // three of them, so a count says the cards are gone and not only their words.
      expect(page.match(/<figure\b/g)).toHaveLength(1);

      // The presses of the band go with it, and the one press that holds both carousels still is
      // drawn once rather than twice, beside the band that is left.
      expect(page).not.toContain(`aria-label="${words.reviewControlsLabel}"`);
      expect(page).not.toContain(`aria-label="${words.reviewPrevious}"`);
      expect(page).not.toContain(`aria-label="${words.reviewNext}"`);
      expect(page.split(`>${words.carouselPause}<`)).toHaveLength(2);
    },
  );

  /**
   * The band of reviews is held back by the list being empty and by nothing else, so the day
   * somebody writes a review the band is on the page with her words in it. The band itself is
   * proved drawing in test/theBandOfReviews.test.tsx, which renders the page with one review in
   * the list.
   *
   * The band of the two offers is held back by the two pages behind its two presses not existing.
   * It is a press to the free calculator and a press to support, and the sentence explaining each,
   * so it has nothing left to say without them.
   */
  it('draws the seven bands of the board it still draws, in the board’s order', async () => {
    const order = (markup: string): string[] =>
      [...markup.matchAll(/<section aria-labelledby="([^"]+)"/g)].map(([, name]) => name ?? '');

    const heldBack = ['reviews-title', 'try-title'];
    const onTheBoard = order(theBoard());
    const onThePage = order(await pageIn('en'));

    expect(onTheBoard).toHaveLength(9);

    for (const band of heldBack) {
      expect({ band, onTheBoard: onTheBoard.includes(band) }).toEqual({ band, onTheBoard: true });
    }

    expect(onThePage).toEqual(onTheBoard.filter((band) => !heldBack.includes(band)));
    expect(onThePage).toHaveLength(7);
  });

  /**
   * The board marks the text nobody has written yet in capitals inside square brackets, so a
   * reader can tell a hole from a promise. The page is held to the board's own set of them: a hole
   * the board does not leave is a hole somebody added, and a hole the board leaves and the page
   * drops is a sentence that reads as finished while it is not.
   *
   * Both exceptions are read off the board rather than written out here, so the next hole to be
   * filled or held back is a deliberate edit of this file. The first founder wrote her note after
   * the board was approved, and the board is a record of a drawing that nobody edits for a
   * sentence that arrived later, so the page draws her sentences where the board draws the hole.
   * Every other hole the board leaves stands in the band of reviews, and the page holds that band
   * back whole, so a reader meets no hole at all.
   */
  it('leaves none of the holes the board leaves, because each one is filled or held back', async () => {
    const bracketed = (text: string): string[] =>
      [...new Set([...text.matchAll(/\[[A-Z][^\]]*\]/g)].map(([found]) => found))].sort();

    const onTheBoard = bracketed(theBoard());
    const filled = theHoleSheHasSinceFilled(onTheBoard);
    const inTheBandHeldBack = bracketed(theBandOfReviewsInTheBoard());

    expect(onTheBoard.length).toBeGreaterThan(0);
    expect(inTheBandHeldBack.length).toBeGreaterThan(0);

    // Nothing in brackets is left on the page a reader opens, in any language.
    for (const language of languages) {
      expect(bracketed(await pageIn(language))).toEqual([]);
    }

    // And each hole the board leaves is accounted for: the note she has since written, or a card,
    // a rating or a count of the band the page does not draw.
    expect(onTheBoard.filter((hole) => hole !== filled).sort()).toEqual(inTheBandHeldBack);
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
    'offers no press to the store, because Apple has not opened the listing, in %s',
    async (language) => {
      const page = await pageIn(language);
      const words = wordsIn(language);

      expect(theStoreListingIsOpen).toBe(false);
      expect(page).not.toContain(`aria-label="${words.store}"`);
      expect(page).not.toContain(words.storeSmall);
    },
  );

  it.each(languages)(
    'holds back every sentence that belongs to a press with no page, in %s',
    async (language) => {
      const words = wordsIn(language);
      const page = await pageIn(language);
      const stillSaid = theKeysTheHomePageHoldsBack.filter((key) => page.includes(words[key]));

      expect(stillSaid).toEqual([]);
    },
  );

  it.each(languages)('says what each phase is, and presses nowhere, in %s', async (language) => {
    const words = wordsIn(language);
    const page = await pageIn(language);

    // The four cards of the phases keep their words. The guide behind each one is not written, so
    // the card is a card and not a press, and nothing on the page points at the calculator.
    for (const key of [
      'learnPeriodTitle',
      'learnFollicularTitle',
      'learnOvulationTitle',
      'learnLutealTitle',
    ] as const) {
      expect(page).toContain(words[key]);
    }

    expect(page).not.toContain(`href="/${language}/calculator/"`);
    expect(page).not.toContain(`href="/${language}/support/"`);
  });

  it('names no host but the three she chooses to open, in any language', async () => {
    for (const language of languages) {
      expect(hostsAPageMayNotName(await pageIn(language))).toEqual([]);
    }
  });

  it('answers that there is no such page where the address names a language the site does not serve', async () => {
    await expect(pageIn('de')).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it(
    'paints the bands of the board in the palette the board paints them in',
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
