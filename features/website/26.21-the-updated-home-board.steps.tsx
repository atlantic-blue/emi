import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import { websiteFace, websiteFaceStack, websiteTabletWidth } from '@emi/tokens';

import HomePage from '../../apps/website/app/[lang]/page';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';
import { CARDS_ACROSS } from '../../apps/website/components/reviewRow';
import { JULIANS_PHOTOGRAPH } from '../../apps/website/lib/addresses';
import {
  A_NAME_NOBODY_HAS_SIGNED,
  A_REVIEW_NOBODY_HAS_WRITTEN,
} from '../../apps/website/lib/thePlaceholders';
import { classesIn, declarationsOf, stylesheetFor } from '../../apps/website/test/stylesheet';
import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';

const feature = loadFeature(join(__dirname, '26.21-the-updated-home-board.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

const designDirectory = join(repositoryRoot, 'docs', 'design', 'website', 'home-v2');

// Compiling the stylesheet of the whole page takes longer than the tier's own limit allows.
jest.setTimeout(180_000);

/** The three widths the board was drawn at, smallest first, as the suite reports them. */
const widths = [390, 834, 1280];

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

/**
 * The amount out of a sentence that names one, as the three languages write it. A page is read for
 * this rather than for any group of digits, because the ring and every drawing on the page are full
 * of numbers and none of them is money.
 */
function amountIn(said: string): string {
  return /\d+[.,]\d\d/.exec(said)?.[0] ?? '';
}

function theDesign(): string {
  return read(join(designDirectory, 'render', 'MainV2.html'));
}

/** Every opening tag of a kind of element, in the order a reader meets them. */
function openingTagsOf(markup: string, element: string): string[] {
  return [...markup.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'g'))].map(([tag]) => tag);
}

function classesOf(tag: string): string[] {
  const found = /class="([^"]*)"/.exec(tag);

  return found === null ? [] : (found[1] ?? '').split(/\s+/).filter((name) => name.length > 0);
}

/** What one element draws, as the declarations of every class on it, joined in one line. */
function drawnBy(tag: string, stylesheet: string): string {
  return classesOf(tag)
    .map((name) => declarationsOf(stylesheet, name))
    .join(' ');
}

/** What the board labels each of its bands with, which is the order of the page. */
function bandsOfTheDesign(): string[] {
  return openingTagsOf(theDesign(), 'section').map(
    (tag) => /aria-labelledby="([^"]+)"/.exec(tag)?.[1] ?? '',
  );
}

/** The element of a page that holds one piece of text, so what it draws can be read. */
function theTagAround(markup: string, text: string): string {
  const at = markup.indexOf(`>${text}<`);

  expect(at).toBeGreaterThanOrEqual(0);

  return markup.slice(markup.lastIndexOf('<', at), at + 1);
}

async function pageIn(language: Language): Promise<string> {
  return renderToStaticMarkup(await HomePage({ params: Promise.resolve({ lang: language }) }));
}

defineFeature(feature, (test) => {
  test('the home page matches the approved design pixel for pixel', ({ given, then, and }) => {
    const drawn: Partial<Record<Language, string>> = {};
    let stylesheet = '';

    given('a woman opens the home page of myemi.app', async () => {
      for (const language of languages) {
        drawn[language] = await pageIn(language);
      }

      stylesheet = await stylesheetFor(classesIn(drawn.en ?? ''));
    });

    then('she reads the nine bands of the board the operator drew last, in its order', () => {
      const wanted = bandsOfTheDesign();
      const found = openingTagsOf(drawn.en ?? '', 'section').map(
        (tag) => /aria-labelledby="([^"]+)"/.exec(tag)?.[1] ?? '',
      );

      expect(wanted).toHaveLength(9);
      expect(found).toEqual(wanted);

      // The band of one price left and the band of reviews took its place. Naming both says which
      // way round the change went, so a page that kept the old one fails here and not only on a
      // count of nine.
      expect(wanted).toContain('reviews-title');
      expect(wanted).not.toContain('price-title');
    });

    and(
      'the heading of every band is set in the face the board sets it in, at the weight it names',
      () => {
        const written = declarationsOf(stylesheet, 'font-display');

        // The board's own list, in its own order, with the served family named where the board
        // names the family a machine may already hold.
        for (const family of websiteFaceStack.display) {
          expect(written).toContain(family);
        }

        expect(written.indexOf('var(')).toBeLessThan(written.indexOf(websiteFace.display));
        expect(websiteFaceStack.display).not.toContain('Newsreader');
        expect(drawn.en).not.toContain('Newsreader');

        // The weight and the tracking the new board gives a large heading, read off the board
        // itself rather than written out here, so the two cannot drift apart.
        const asTheBoardDraws =
          /<h2 id="reviews-title"[^>]*style="([^"]*)"/.exec(theDesign())?.[1] ?? '';
        const weight = /font-weight: (\d+)/.exec(asTheBoardDraws)?.[1] ?? '';
        const tracking = /letter-spacing: ([^;"]+)/.exec(asTheBoardDraws)?.[1] ?? '';

        expect(weight).toBe('600');
        expect(tracking).toBe('-0.015em');

        const headline = theTagAround(drawn.en ?? '', wordsIn('en').reviewsHeadline);
        const drawnAs = drawnBy(headline, stylesheet);

        // Tailwind writes a weight through a property of its own, so the value it stands for is
        // read from the stylesheet as well as the name the heading asks for.
        expect(classesOf(headline)).toContain('font-semibold');
        expect(stylesheet).toContain(`--font-weight-semibold: ${weight}`);
        expect(drawnAs).toContain(`letter-spacing: ${tracking}`);
      },
    );

    and(
      'no band of the page names an amount, because the board took the amount off this page',
      () => {
        for (const language of languages) {
          const words = wordsIn(language);

          // The amount is read off the line the till says, so this cannot drift from the price: it
          // asks whether the number a reader is charged appears on a page that no longer names one.
          expect(amountIn(words.price)).toMatch(/\d/);
          expect(drawn[language]).not.toContain(amountIn(words.price));
          expect(drawn[language]).not.toMatch(/[£$€]/);
          expect(drawn[language]).toContain(words.heroPriceLine);
          expect(drawn[language]).toContain(words.heroCancel);
        }

        // The board says it twice, under the hero and in the closing band, and the second time as
        // one sentence rather than two lines.
        const words = wordsIn('en');

        expect((drawn.en ?? '').split(words.heroCancel)).toHaveLength(3);
        expect(drawn.en).toContain(`${words.heroPriceLine} ${words.heroCancel}`);
      },
    );

    and('the two people building Emi stand one at a time, with Iuliia first', () => {
      for (const language of languages) {
        const page = drawn[language] ?? '';
        const words = wordsIn(language);

        expect(page).toContain('Iuliia Nikolaeva');
        expect(page).toContain(words.founderIuliiaRole);

        // The board drew her note as a hole and she has since written it, so the page draws the
        // sentences she sent in the language this reader opened it in.
        expect(page).toContain(words.founderIuliiaNote);
        expect(page).not.toContain('[IULIIA');

        // One at a time: the other founder is behind a press, so nothing of him is on the page a
        // reader is handed.
        expect(page).not.toContain('Julian Tellez');
        expect(page).not.toContain(words.founderJulianNote);

        // Two dots, because there are two of them, and a round badge of initials for the one of
        // them who has not sent a photograph. His stands in that circle instead, and it is behind
        // the press with the rest of him.
        expect(page).toContain('>IN<');
        expect(page).not.toContain(JULIANS_PHOTOGRAPH);
        expect(page).toContain(words.noteEyebrow);
      }

      // A name is a name in every language, so no catalogue holds one to translate by mistake.
      for (const language of languages) {
        expect(Object.values(wordsIn(language))).not.toContain('Iuliia Nikolaeva');
      }
    });

    and('six reviews stand three at a time, two on a tablet and one on a phone', () => {
      const page = drawn.en ?? '';
      const cards = openingTagsOf(page, 'figure');

      // One figure for the founder note and three for the row of reviews.
      expect(cards).toHaveLength(CARDS_ACROSS + 1);
      expect(page.split(A_REVIEW_NOBODY_HAS_WRITTEN)).toHaveLength(CARDS_ACROSS + 1);
      expect(page.split(A_NAME_NOBODY_HAS_SIGNED)).toHaveLength(CARDS_ACROSS + 1);

      // Six dots under the row, because the board holds six cards and shows three of them.
      expect(page).toContain(wordsIn('en').reviewsRating);

      // The third card goes at the tablet width and the second goes at the phone width, so a
      // reader at either width never meets a card cut off the side of her screen. The first figure
      // of the page is the founder note, so the row of reviews is the three after it.
      const [first, second, third] = cards.slice(-CARDS_ACROSS);

      expect(drawnBy(first ?? '', stylesheet)).not.toContain('display: none');
      expect(drawnBy(second ?? '', stylesheet)).toContain('display: none');
      expect(drawnBy(third ?? '', stylesheet)).toContain('display: none');
      expect(`${second}`).toContain('phone:hidden');
      expect(`${third}`).toContain('tablet:hidden');
      expect(declarationsOf(stylesheet, 'tablet:grid-cols-2')).toContain('repeat(2');
      expect(declarationsOf(stylesheet, 'phone:grid-cols-1')).toContain('repeat(1');
      expect(stylesheet).toContain(`${websiteTabletWidth}px`);
    });

    and(
      'one press holds both bands still, and a reader who asked for less motion is never moved',
      () => {
        const page = drawn.en ?? '';
        const words = wordsIn('en');

        // The press that holds them still is drawn twice, once beside each band, and both copies
        // read Pause on the page a reader is handed.
        expect(page.split(`>${words.carouselPause}<`)).toHaveLength(3);
        expect(page).not.toContain(`>${words.carouselPlay}<`);

        // Every press that holds only a drawing says what it does, because a reader who cannot see
        // the drawing has nothing else to go on.
        for (const label of [
          words.founderPrevious,
          words.founderNext,
          words.reviewPrevious,
          words.reviewNext,
          words.founderControlsLabel,
          words.reviewControlsLabel,
        ]) {
          expect(page).toContain(`aria-label="${label}"`);
        }

        // One clock and one paused state for both bands, which is one place rather than two.
        const clock = read(join(websiteWorkspace, 'components', 'carousels.tsx'));

        expect(clock.match(/setInterval\(/g)).toHaveLength(1);
        expect(clock).toContain('prefers-reduced-motion: reduce');

        // The two bands that move are proved moving by the cases beside the components, which
        // drive the real clock rather than reading the markup it produced.
        const cases = read(join(websiteWorkspace, 'test', 'theCarousels.test.tsx'));

        expect(cases).toContain('advanceTimersByTime');
        expect(cases).toContain('websiteCarouselWait');
      },
    );

    and(
      'a browser holds the page against the board at all three widths, and keeps the picture of any difference',
      () => {
        const suite = asPlaywrightReadsIt();
        const sentence = 'the home page matches the approved design pixel for pixel';
        const theFeature = read(
          join(websiteWorkspace, 'e2e', 'features', 'homeMatchesTheDesign.feature'),
        );
        // The sentences of the scenario and the reading behind them. The reading sits in a file
        // of its own, because two pages of the site are each held to a board of their own and one
        // set of numbers is read by both.
        const theSteps = [
          read(join(websiteWorkspace, 'e2e', 'steps', 'homeMatchesTheDesign.ts')),
          read(join(websiteWorkspace, 'e2e', 'steps', 'theDesignComparison.ts')),
        ].join('\n');

        expect(theFeature).toContain(`Scenario: ${sentence}`);
        expect([...suite.widths]).toEqual(widths);

        expect(theSteps).toContain('MainV2.html');
        expect(theSteps).toContain("'/en/'");
        expect(theSteps).toContain('pixelmatch');
        expect(theSteps).toContain('writeFileSync');

        // Four parts are read on their own: the note, where the board drew a hole one of the two
        // has since filled, and the three sentences version 1 overtook. The rows between them are
        // still held to the board, so the scenario says which parts of the page it leaves out and
        // nothing else.
        expect(theFeature).toContain(
          'every part of the page the board still describes is the design',
        );
        expect(theSteps).toContain('note-title');
        expect(theSteps).toContain('the-forecast-card');
        expect(theSteps).toContain('the-promise');
        expect(theSteps).toContain('above-');
        expect(theSteps).toContain('under-the-last-area');

        // The comparison is taken with the reader's own settings asking for less motion, so both
        // carousels stand on their first card while the picture is taken. Pressing the page's own
        // Pause would rename the press to Play, and the board says Pause.
        expect(theSteps).toContain("reducedMotion: 'reduce'");
      },
    );
  });
});
