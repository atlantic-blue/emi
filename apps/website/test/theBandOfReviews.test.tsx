import { renderToStaticMarkup } from 'react-dom/server';

import { websiteTabletWidth } from '@emi/tokens';

import HomePage from '../app/[lang]/page';
import { languages, wordsIn } from '../app/words';
import type { ARealReview } from '../lib/theReviews';
import { classesIn, declarationsOf, stylesheetFor } from './stylesheet';

/**
 * The band of reviews, read both ways: held back while nobody has written one, and on the page the
 * moment somebody has.
 *
 * The page reads `lib/theReviews.ts`, and that list is empty, so a case that only opened the page
 * would prove the band is absent and never that adding a review brings it back. The list is
 * answered here instead, so one case empties it and the next one puts a review in it, and the
 * sentence "adding one entry is the whole edit" is a thing this file actually carries out.
 *
 * `test/homePage.test.tsx` reads the page the site serves today, with the real list.
 */

/** Compiling the stylesheet takes a moment, and the case that reads it compiles its own. */
const longEnoughToCompile = 60_000;

/** The list the page reads, answered by this file so a case can decide what is in it. */
const theList: ARealReview[] = [];

jest.mock('../lib/theReviews', () => ({
  ...jest.requireActual('../lib/theReviews'),
  get theRealReviews() {
    return theList;
  },
}));

/** One person who said something about Emi in the beta, and agreed to it being printed. */
const whatSheSaid: ARealReview = {
  quote: 'I stopped paying the other one and nothing left my phone.',
  name: 'A. R.',
  said: 'beta',
};

async function pageIn(language: string): Promise<string> {
  return renderToStaticMarkup(await HomePage({ params: Promise.resolve({ lang: language }) }));
}

function hold(...reviews: ARealReview[]): void {
  theList.length = 0;
  theList.push(...reviews);
}

afterEach(() => {
  hold();
});

describe('the band of what other people say about Emi', () => {
  it.each(languages)('is not on the page while the list is empty, in %s', async (language) => {
    hold();

    const page = await pageIn(language);

    expect(page).not.toContain('reviews-title');
    expect(page).not.toContain(wordsIn(language).reviewsHeadline);
  });

  it.each(languages)(
    'is on the page as soon as one person has written one, in %s',
    async (language) => {
      hold(whatSheSaid);

      const words = wordsIn(language);
      const page = await pageIn(language);

      // The band, with her own words and the name she agreed to, under the heading of the board.
      expect(page).toContain('reviews-title');
      expect(page).toContain(words.reviewsEyebrow);
      expect(page).toContain(words.reviewsHeadline);
      expect(page).toContain(whatSheSaid.quote);
      expect(page).toContain(whatSheSaid.name);

      // Where she said it is a word of this reader's own language, and the two other places are not
      // on the page, because one review was written in one place.
      expect(page).toContain(words.reviewFromTheBeta);
      expect(page).not.toContain(words.reviewFromTheStore);
      expect(page).not.toContain(words.reviewFromTheCommunity);

      // One review, one card. The row shows what it holds rather than printing her words three
      // times across the band to fill the three cards the board draws.
      expect(page.match(/<figure\b/g)).toHaveLength(2);
    },
  );

  it('shows three of six cards when six people have written one', async () => {
    const six = Array.from({ length: 6 }, (_nothing, at) => ({
      quote: `What reader ${at + 1} said about Emi.`,
      name: `Reader ${at + 1}`,
      said: 'community' as const,
    }));

    hold(...six);

    const page = await pageIn('en');

    // Three cards on a desktop, which is the band the board draws, and the first three of the six
    // in it: the other three are a press or a wait away.
    expect(page.match(/<figure\b/g)).toHaveLength(4);
    expect(page).toContain('What reader 1 said about Emi.');
    expect(page).toContain('What reader 3 said about Emi.');
    expect(page).not.toContain('What reader 4 said about Emi.');
  });

  it(
    'comes back at the measures the board gives the row',
    async () => {
      hold(
        ...Array.from({ length: 6 }, (_nothing, at) => ({
          quote: `What reader ${at + 1} said about Emi.`,
          name: `Reader ${at + 1}`,
          said: 'store' as const,
        })),
      );

      const page = await pageIn('en');
      const stylesheet = await stylesheetFor(classesIn(page));
      const cards = [...page.matchAll(/<figure\b[^>]*>/g)].map(([tag]) => tag).slice(1);
      const drawnBy = (tag: string): string =>
        (/class="([^"]*)"/.exec(tag)?.[1] ?? '')
          .split(/\s+/)
          .map((name) => declarationsOf(stylesheet, name))
          .join(' ');

      // Three cards across on a desktop, two on a tablet and one on a phone, which is the board's
      // own shape: the third card goes at the tablet width and the second goes at the phone width,
      // so a reader at either width never meets a card cut off the side of her screen.
      expect(cards).toHaveLength(3);
      expect(declarationsOf(stylesheet, 'grid-cols-3')).toContain('repeat(3');
      expect(declarationsOf(stylesheet, 'tablet:grid-cols-2')).toContain('repeat(2');
      expect(declarationsOf(stylesheet, 'phone:grid-cols-1')).toContain('repeat(1');
      expect(stylesheet).toContain(`${websiteTabletWidth}px`);

      const [first, second, third] = cards;

      expect(drawnBy(first ?? '')).not.toContain('display: none');
      expect(drawnBy(second ?? '')).toContain('display: none');
      expect(drawnBy(third ?? '')).toContain('display: none');
      expect(`${second}`).toContain('phone:hidden');
      expect(`${third}`).toContain('tablet:hidden');
    },
    longEnoughToCompile,
  );

  it('goes again when the one review is taken out of the list', async () => {
    hold(whatSheSaid);

    expect(await pageIn('en')).toContain(whatSheSaid.quote);

    hold();

    const page = await pageIn('en');

    expect(page).not.toContain(whatSheSaid.quote);
    expect(page).not.toContain('reviews-title');
  });
});
