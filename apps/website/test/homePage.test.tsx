import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { websiteColour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { approvedDenials } from '../../../tools/pipeline/forbiddenClaims';
import HomePage from '../app/[lang]/page';
import { type Language, brandEyebrowOf, languages, wordsIn } from '../app/words';
import { CARDS_ACROSS } from '../components/reviewRow';
import { LANGUAGES_ANCHOR } from '../components/siteHeader';
import {
  A_NAME_NOBODY_HAS_SIGNED,
  A_REVIEW_NOBODY_HAS_WRITTEN,
  THE_NOTE_IULIIA_HAS_NOT_WRITTEN,
  thePlaceholders,
} from '../lib/thePlaceholders';
import { whatTheMarkupDraws } from './stylesheet';

/** Compiling the stylesheet takes a moment, and each case that reads it compiles its own markup. */
const longEnoughToCompile = 60_000;

async function pageIn(lang: string): Promise<string> {
  return renderToStaticMarkup(await HomePage({ params: Promise.resolve({ lang }) }));
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
 * Every sentence of the approved board, by the name the catalogues give it, in the order a reader
 * meets it down the page. A page that stops drawing one of these says less than the board the
 * operator approved, and the pixel comparison would only say that something moved.
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

      expect(page.indexOf('Iuliia Nikolaeva')).toBeGreaterThan(-1);
      expect(page).toContain(THE_NOTE_IULIIA_HAS_NOT_WRITTEN);
      expect(page).toContain(words.founderIuliiaRole);

      // The second founder is one press away rather than on the page she is handed, so his note and
      // his role are not drawn until the band moves.
      expect(page).not.toContain(words.founderJulianNote);
    },
  );

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

    expect(onTheBoard.length).toBeGreaterThan(0);
    expect(bracketed(await pageIn('en'))).toEqual(onTheBoard);

    // Each of the three the board leaves standing on its own is held in one place, away from the
    // catalogues, because a hole is not a word and reads the same in every language.
    for (const waiting of thePlaceholders) {
      expect(onTheBoard).toContain(waiting);
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

  it('asks no other host for anything, in any language', async () => {
    for (const language of languages) {
      expect(await pageIn(language)).not.toMatch(/https?:\/\//);
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
