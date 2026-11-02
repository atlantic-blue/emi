import { colour, radius, space, typeScale } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { approvedDenials } from '../../../tools/pipeline/forbiddenClaims';
import HomePage, { PLACEHOLDER_ADDRESS } from '../app/[lang]/page';
import { type Language, languages, wordsIn } from '../app/words';
import { whatTheMarkupDraws } from './stylesheet';

/** Compiling the stylesheet takes a moment, and each case that reads it compiles its own markup. */
const longEnoughToCompile = 60_000;

async function pageIn(lang: string): Promise<string> {
  return renderToStaticMarkup(await HomePage({ params: Promise.resolve({ lang }) }));
}

/**
 * The two sentences the honesty gate approves, taken from the gate's own list rather than written
 * out here. The gate is the one place the wording is decided, and a copy of it in this file would
 * be a second opinion that could drift from the first.
 */
function denialsStartingWith(prefix: string): string[] {
  return approvedDenials.filter((denial) => denial.startsWith(prefix));
}

const theDenials: Readonly<Record<Language, string[]>> = {
  en: denialsStartingWith('Emi is not a'),
  ru: denialsStartingWith('Emi не является'),
  es: denialsStartingWith('Emi no es un'),
};

describe('the page a woman meets Emi on', () => {
  it.each(languages)('is drawn in %s', async (language) => {
    const words = wordsIn(language);
    const page = await pageIn(language);

    expect(page).toContain(words.brandLine);
    expect(page).toContain(words.tagline);
    expect(page).toContain(words.line);
    expect(page).toContain(words.price);
  });

  it.each(languages)('says what Emi costs, in %s', async (language) => {
    expect(await pageIn(language)).toContain(wordsIn(language).price);
  });

  it.each(languages)('says what Emi is not, in %s', async (language) => {
    const page = await pageIn(language);

    expect(theDenials[language]).toHaveLength(2);

    for (const denial of theDenials[language]) {
      expect(page).toContain(denial);
    }
  });

  it.each(languages)('offers the store and the beta, in %s', async (language) => {
    const words = wordsIn(language);
    const page = await pageIn(language);

    expect(page).toContain(words.store);
    expect(page).toContain(words.beta);
    expect(page.match(new RegExp(`href="${PLACEHOLDER_ADDRESS}"`, 'g'))?.length).toBeGreaterThan(1);
  });

  it('asks no other host for anything, in any language', async () => {
    for (const language of languages) {
      expect(await pageIn(language)).not.toMatch(/https?:\/\//);
    }
  });

  it('answers that there is no such page where the address names a language the site does not serve', async () => {
    await expect(pageIn('de')).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it(
    'draws the headline large and centred, in the two tones of the design',
    async () => {
      const drawn = await pageIn('en');
      const painted = Object.values(await whatTheMarkupDraws(drawn)).join(' ');

      expect(painted).toContain(`font-size: ${typeScale['display-lg-mobile'].size}px`);
      expect(painted).toContain(`color: ${colour.text}`);
      expect(painted).toContain(`color: ${colour.secondaryText}`);
      expect(painted).toContain('text-align: center');
    },
    longEnoughToCompile,
  );

  it(
    'puts the price in a card with no border, on a tinted band',
    async () => {
      const painted = Object.values(await whatTheMarkupDraws(await pageIn('en'))).join(' ');

      expect(painted).toContain(`background-color: ${colour.accentSoft}`);
      expect(painted).toContain(`background-color: ${colour.card}`);
      expect(painted).toContain(`border-radius: ${radius.xxl}px`);
      expect(painted).not.toContain('border-width');
    },
    longEnoughToCompile,
  );

  it(
    'draws the press to the store as a capsule a thumb can hit',
    async () => {
      const painted = Object.values(await whatTheMarkupDraws(await pageIn('en'))).join(' ');

      expect(painted).toContain(`background-color: ${colour.accent}`);
      expect(painted).toContain(`color: ${colour.onAccent}`);
      expect(painted).toContain(`border-radius: ${radius.full}px`);
      expect(painted).toContain(`min-height: ${space.marginLg}px`);
    },
    longEnoughToCompile,
  );
});

describe('the switcher in the band at the top', () => {
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

    expect(page).toContain('aria-label="English"');
    expect(page).toContain('aria-label="Русский"');
    expect(page).toContain('aria-label="Español"');
  });

  it.each(languages)('names the switcher itself in %s', async (language) => {
    expect(await pageIn(language)).toContain(`aria-label="${wordsIn(language).languageLabel}"`);
  });
});
