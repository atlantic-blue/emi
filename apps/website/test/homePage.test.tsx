import { websiteColour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { approvedDenials } from '../../../tools/pipeline/forbiddenClaims';
import HomePage from '../app/[lang]/page';
import { type Language, brandEyebrowOf, languages, wordsIn } from '../app/words';
import { LANGUAGES_ANCHOR } from '../components/siteHeader';
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
  'noteBody',
  'founderName',
  'founderRole',
  'privacyHeadline',
  'privacyLink',
  'priceEyebrow',
  'priceHeadline',
  'priceLine',
  'priceAppStoreNote',
  'priceCardTitle',
  'priceCardNote',
  'priceStarsTitle',
  'priceStarsNote',
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

  it.each(languages)('says what Emi costs where the board says it, in %s', async (language) => {
    const words = wordsIn(language);
    const page = await pageIn(language);

    expect(page).toContain(words.heroPriceLine);
    expect(page).toContain(words.priceHeadline);
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
