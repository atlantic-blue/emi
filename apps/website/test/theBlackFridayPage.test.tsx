import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';

import BlackFridayPage, {
  THE_BLACK_FRIDAY_PAGE,
  generateMetadata,
} from '../app/[lang]/black-friday/page';
import RootLayout from '../app/[lang]/layout';
import { type Language, languages, wordsIn } from '../app/words';
import {
  THE_BLACK_FRIDAY_OFFER,
  THE_BLACK_FRIDAY_OFFER_ENDS,
  theBlackFridayOfferIsOpen,
} from '../lib/theBlackFridayOffer';
import { theStoreListingIsOpen } from '../lib/theStoreListing';
import { amountsOfMoneyIn, theAmountOf, theOfferAmount } from '../lib/theOnePrice';
import {
  everyPageTheSiteServes,
  thePagesOfTheSite,
  thePagesTheSitemapLeavesOut,
} from '../tools/theFilesACrawlerReads';

/**
 * The page a woman buys Emi at half price on. She was handed the address, she reads what the offer
 * costs and when it ends, and she presses once.
 *
 * Every case drives the page the way Next.js drives it, which is by awaiting it inside the layout,
 * because the band at the top and the band at the foot belong to the layout and a read of the page
 * alone would read less than she is handed.
 *
 * The clock is stood in for where a case reads what the page does after the offer closes. The page
 * is drawn on each request, so the clock it reads is the clock of the moment she asks for it.
 */

/** A day inside the offer, which is the day the operator opened it. */
const whileTheOfferIsOpen = new Date('2026-11-22T10:00:00Z');

/** The first instant the offer is over, which is midnight in central Europe. */
const theMomentItCloses = THE_BLACK_FRIDAY_OFFER_ENDS;

/**
 * Only the clock is stood in for. Next.js draws a page by awaiting it, and a run that held the
 * ordinary timers of the platform still would never finish drawing one.
 */
function withTheClockOn(moment: Date): void {
  jest.useFakeTimers({
    now: moment,
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

async function theWholePageIn(language: string): Promise<string> {
  const page = await BlackFridayPage({ params: Promise.resolve({ lang: language }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: language }) }),
  );
}

/** The page as a reader meets it on a day inside the offer. */
async function thePageWhileItIsOpenIn(language: Language): Promise<string> {
  withTheClockOn(whileTheOfferIsOpen);

  try {
    return await theWholePageIn(language);
  } finally {
    jest.useRealTimers();
  }
}

/**
 * Where the page sends her, and with what answer, read off what Next.js throws to move a reader.
 * The address is in the digest rather than in the message, which is what a server reads to write
 * the answer her browser follows.
 */
async function whereItSendsHerFrom(
  language: string,
  moment: Date,
): Promise<{ address: string; answered: string }> {
  withTheClockOn(moment);

  try {
    await theWholePageIn(language);
  } catch (thrown) {
    const digest = (thrown as { digest?: string }).digest ?? '';
    const [, address = '', answered = ''] = /NEXT_REDIRECT;[^;]+;([^;]+);(\d+)/.exec(digest) ?? [];

    return { address, answered };
  } finally {
    jest.useRealTimers();
  }

  return { address: '', answered: '' };
}

/**
 * Which card a chat is asked to draw. The type of the metadata holds several shapes of card and
 * names the kind on only some of them, so it is read off the value rather than through the type.
 */
function theKindOfCard(twitter: unknown): string | undefined {
  return (twitter as { card?: string } | undefined)?.card;
}

/** Every band of the page, by the name it is labelled with, in the order a reader meets them. */
function theBandsOf(markup: string): string[] {
  return [...markup.matchAll(/<section aria-labelledby="([^"]+)"/g)].map(([, name]) => name ?? '');
}

/** The bands of the home page, which is the board this page draws. */
async function theBandsOfTheHomePage(): Promise<string[]> {
  const HomePage = (await import('../app/[lang]/page')).default;
  const page = await HomePage({ params: Promise.resolve({ lang: 'en' }) });

  return theBandsOf(renderToStaticMarkup(page as never));
}

describe('the Black Friday page', () => {
  describe('what it says the offer is', () => {
    it.each(languages)(
      'draws what it costs, the free month and the end, in %s',
      async (language) => {
        const words = wordsIn(language);
        const page = await thePageWhileItIsOpenIn(language);

        expect(page).toContain(words.blackFridayEyebrow);
        expect(page).toContain(words.blackFridayHeading);
        expect(page).toContain(words.blackFridayPrice);
        expect(page).toContain(words.blackFridayInsteadOf);
        expect(page).toContain(words.blackFridayEnds);

        // The free month is part of the price it asks for, so the sentence carries both, and
        // the figure is half of the one the home page sends her to the till with.
        expect(amountsOfMoneyIn(words.blackFridayPrice).map(theAmountOf)).toEqual([theOfferAmount]);
        expect(words.blackFridayPrice).toContain(words.price.split(',')[0] ?? '');
      },
    );

    it.each(languages)(
      'says half of the price and names the price it halves, in %s',
      async (language) => {
        const page = await thePageWhileItIsOpenIn(language);
        const half = language === 'en' ? '19.50' : '19,50';

        expect(page).toContain(half);
        expect(page.includes('39')).toBe(true);
      },
    );

    it('draws the same bands as the home page, in the same order', async () => {
      const onTheOfferPage = theBandsOf(await thePageWhileItIsOpenIn('en'));

      expect(onTheOfferPage).toEqual(await theBandsOfTheHomePage());
      expect(onTheOfferPage.length).toBeGreaterThan(7);
    });
  });

  describe('where a press takes her', () => {
    it.each(languages)(
      'sends every buy press to the till with the offer, in %s',
      async (language) => {
        const page = await thePageWhileItIsOpenIn(language);
        const till = `/${language}/checkout/?offer=${THE_BLACK_FRIDAY_OFFER}`;
        const presses = [...page.matchAll(/href="([^"]*checkout[^"]*)"/g)].map(
          ([, found]) => found,
        );

        expect(presses.length).toBe(2);
        expect(presses).toEqual([till, till]);
        expect(THE_BLACK_FRIDAY_OFFER).toBe('black-friday');
      },
    );

    it('offers no press to the store, because Apple has not opened the listing', async () => {
      const words = wordsIn('en');
      const page = await thePageWhileItIsOpenIn('en');

      expect(theStoreListingIsOpen).toBe(false);
      expect(page).not.toContain(`aria-label="${words.store}"`);
      expect(page).not.toContain(words.storeSmall);
    });
  });

  describe('what happens once the offer is over', () => {
    it('draws while the offer is open', () => {
      expect(theBlackFridayOfferIsOpen(whileTheOfferIsOpen)).toBe(true);
      expect(theBlackFridayOfferIsOpen(new Date(theMomentItCloses.getTime() - 1))).toBe(true);
    });

    it.each(languages)(
      'sends her to the home page from the moment it closes, in %s',
      async (language) => {
        expect(theBlackFridayOfferIsOpen(theMomentItCloses)).toBe(false);
        expect(await whereItSendsHerFrom(language, theMomentItCloses)).toEqual({
          address: `/${language}/`,
          // A move for this moment rather than a permanent one, because the address is a page the
          // site serves and a browser that kept the move would never ask for it again.
          answered: '307',
        });
      },
    );

    it('sends her to the home page a week later too', async () => {
      const aWeekLater = new Date(theMomentItCloses.getTime() + 7 * 24 * 60 * 60 * 1000);

      expect((await whereItSendsHerFrom('en', aWeekLater)).address).toBe('/en/');
    });

    it('draws nothing of the offer once it is over, because she is moved instead', async () => {
      await expect(async () => {
        withTheClockOn(theMomentItCloses);

        try {
          await theWholePageIn('en');
        } finally {
          jest.useRealTimers();
        }
      }).rejects.toThrow(/NEXT_REDIRECT/);
    });
  });

  describe('what a chat draws when somebody sends her the address', () => {
    it.each(languages)('carries its own title and sentence, in %s', async (language) => {
      const words = wordsIn(language);
      const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });

      expect(head.title).toBe(words.blackFridayTitle);
      expect(head.description).toBe(words.blackFridayDescription);
      expect(head.openGraph?.title).toBe(words.blackFridayTitle);
      expect(head.openGraph?.description).toBe(words.blackFridayDescription);
      expect(head.twitter?.title).toBe(words.blackFridayTitle);
      expect(head.twitter?.description).toBe(words.blackFridayDescription);
    });

    // A page that wrote its own group of tags would replace the layout's whole, and the first
    // thing it would lose is the picture, so the card is read for that as well as for the words.
    it.each(languages)('keeps the picture the site shares, in %s', async (language) => {
      const words = wordsIn(language);
      const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });
      const [picture] = (head.openGraph?.images ?? []) as { url?: string; alt?: string }[];

      expect(picture?.url).toBe('https://myemi.app/share-preview.png');
      expect(picture?.alt).toBe(words.sharePictureAlt);
      expect(head.openGraph?.url).toBe(`https://myemi.app/${language}/${THE_BLACK_FRIDAY_PAGE}`);
      expect(theKindOfCard(head.twitter)).toBe('summary_large_image');
    });

    it.each(languages)(
      'names its own address, and the same page in each language, in %s',
      async (language) => {
        const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });

        expect(head.alternates?.canonical).toBe(
          `https://myemi.app/${language}/${THE_BLACK_FRIDAY_PAGE}`,
        );
        expect(head.alternates?.languages?.[language]).toBe(
          `https://myemi.app/${language}/${THE_BLACK_FRIDAY_PAGE}`,
        );
        expect(head.alternates?.languages?.['x-default']).toBe(
          `https://myemi.app/en/${THE_BLACK_FRIDAY_PAGE}`,
        );
      },
    );
  });

  describe('where the site serves it', () => {
    it('is a page the site serves, and one the sitemap leaves out', () => {
      expect(everyPageTheSiteServes().map((page) => page.path)).toContain(THE_BLACK_FRIDAY_PAGE);
      expect(thePagesTheSitemapLeavesOut.map((page) => page.path)).toContain(THE_BLACK_FRIDAY_PAGE);
      expect(thePagesOfTheSite.map((page) => page.path)).not.toContain(THE_BLACK_FRIDAY_PAGE);
      expect(THE_BLACK_FRIDAY_PAGE).toBe('black-friday/');
    });

    it('is in no list of addresses the site keeps for a crawler', () => {
      const sitemap = readFileSync(join(__dirname, '..', 'public', 'sitemap.xml'), 'utf8');

      expect(sitemap).not.toContain('black-friday');

      for (const language of languages) {
        expect(sitemap).not.toContain(`https://myemi.app/${language}/${THE_BLACK_FRIDAY_PAGE}`);
      }
    });

    it.each(languages)('asks a search engine not to keep it, in %s', async (language) => {
      const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });
      const robots = head.robots as { index?: boolean; follow?: boolean } | undefined;

      expect(robots?.index).toBe(false);

      // The links on it still lead somewhere worth reading, so a crawler is asked to follow them.
      expect(robots?.follow).toBe(true);
    });

    it('answers that there is no such page where the address names a language the site does not serve', async () => {
      await expect(thePageWhileItIsOpenIn('de' as Language)).rejects.toThrow(
        /NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    });

    it('is linked from nowhere on the home page or the bands the site shares', async () => {
      const HomePage = (await import('../app/[lang]/page')).default;
      const home = renderToStaticMarkup(
        await RootLayout({
          children: await HomePage({ params: Promise.resolve({ lang: 'en' }) }),
          params: Promise.resolve({ lang: 'en' }),
        }),
      );

      expect(home).not.toContain(THE_BLACK_FRIDAY_PAGE);
    });
  });
});
