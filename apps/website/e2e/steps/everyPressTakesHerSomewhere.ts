import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import {
  NO_PAGE_YET,
  THE_APP_STORE_LISTING,
  THE_EMI_BETA,
  THE_EMI_CODE,
  THE_EMI_COMMUNITY,
  THE_PRIVACY_INBOX,
  THE_SUPPORT_INBOX,
} from '../../lib/addresses';
import { LANGUAGES_ANCHOR } from '../../components/siteHeader';
import { wordsIn } from '../../app/words';
import type { Language } from '../../app/words';
import { test } from './fixtures';
import type { APressSheCanMake } from './fixtures';

/**
 * The three landmarks the presses are divided by. Read by role rather than by element, because
 * that is what her software goes by. The band at the top carries the ways into the product, so a
 * read that left it out would read fewer presses than she meets.
 */
const theBandAtTheTop = 'banner';

const thePageItself = 'main';

const theBandAtTheFoot = 'contentinfo';

/**
 * Every address a press may carry that this site does not serve: the three hosts outside it, and
 * the two inboxes her mail application answers. Each is written out whole in `lib/addresses.ts`.
 *
 * None of the five is asked for. This site asks no other company for anything, and a press she has
 * not made yet asks nobody for anything, so the rule here is that the address is one of these and
 * not that somebody else's host answered a request from a pipeline.
 */
const theAddressesOffTheSite = [
  THE_EMI_COMMUNITY,
  THE_EMI_CODE,
  THE_EMI_BETA,
  THE_PRIVACY_INBOX,
  THE_SUPPORT_INBOX,
  // The listing in Apple's store, on the day Apple issues its address. It is empty until then, and
  // no press to the store is drawn while it is empty, so it joins the five only once it is real.
  ...(THE_APP_STORE_LISTING === '' ? [] : [THE_APP_STORE_LISTING]),
];

const { Then, When } = createBdd(test);

When('she reads every press the page offers her', async ({ page, pressing }) => {
  // The cards of the two carousels move on by themselves, and a press that is moving while it is
  // read is read in two places. The reader is told she asked for less motion, which is what the
  // page itself reads to hold them still.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);

  pressing.reading = (await page.locator('html').getAttribute('lang')) ?? '';

  for (const [role, into] of [
    [theBandAtTheTop, pressing.atTheTop],
    [thePageItself, pressing.inThePage],
    [theBandAtTheFoot, pressing.atTheFoot],
  ] as const) {
    into.push(...(await pressesInside(page, role)));
  }

  // A read that found nothing to read reports the same as a page where every press is right, so
  // the count of what was read is part of the scenario. At the width of a phone the row of ways
  // into the product folds into the menu button, so what is left up there is the way home and the
  // way to the list of languages.
  expect(pressing.atTheTop.length).toBeGreaterThan(1);
  expect(pressing.inThePage.length).toBeGreaterThan(1);
  expect(pressing.atTheFoot.length).toBeGreaterThan(6);
});

Then(
  'each press she can see answers 200, or leaves the site for an address this site names',
  async ({ page, pressing }) => {
    const language = pressing.reading;

    expect(language).not.toBe('');

    const everyPress = [...pressing.atTheTop, ...pressing.inThePage, ...pressing.atTheFoot];

    expect(everyPress.length).toBeGreaterThan(10);

    const ofThisSite = new Set<string>();

    for (const press of everyPress) {
      if (press.address === `#${LANGUAGES_ANCHOR}`) {
        // The list of languages stands on the page she is already reading, so there is no address
        // to ask for. What is read instead is that the list is there to be moved to.
        await expect(page.locator(`#${LANGUAGES_ANCHOR}`)).toHaveCount(1);
        continue;
      }

      if (press.address.startsWith('/')) {
        // A page of this site sits under a language, because the site serves no page at the root
        // and the edge moves the root on to one.
        expect({
          called: press.called,
          underALanguage: /^\/(en|ru|es)\//.test(press.address),
        }).toEqual({ called: press.called, underALanguage: true });

        ofThisSite.add(press.address);
        continue;
      }

      expect({ called: press.called, address: press.address, named: true }).toEqual({
        called: press.called,
        address: press.address,
        named: theAddressesOffTheSite.includes(press.address),
      });
    }

    expect(ofThisSite.size).toBeGreaterThan(3);

    for (const address of [...ofThisSite].sort()) {
      const answer = await page.request.get(address, { maxRedirects: 0 });

      expect({ address, status: answer.status() }).toEqual({ address, status: 200 });
    }
  },
);

Then('no press takes her to a page that is still to be built', ({ pressing }) => {
  const everyPress = [...pressing.atTheTop, ...pressing.inThePage, ...pressing.atTheFoot];
  const leadingNowhere = everyPress.filter((press) => press.address === NO_PAGE_YET);

  expect(leadingNowhere.map((press) => press.called)).toEqual([]);

  // The five pages nobody has built yet. A press to one of them is not drawn at all, so none of
  // the five appears at the end of any address on the page. The support page was the sixth of
  // these; it is built, so a press to it is read in the step below as a press the site answers
  // 200 for.
  for (const path of ['buy/', 'calculator/', 'pulse/', 'sign-in/', 'terms/']) {
    expect({
      waitingFor: path,
      pressed: everyPress.some((press) => press.address.endsWith(`/${path}`)),
    }).toEqual({ waitingFor: path, pressed: false });
  }
});

Then(
  'the press that offers her the community opens Telegram in the tab she is reading in',
  ({ pressing }) => {
    const words = wordsIn(pressing.reading as Language);

    expect(THE_EMI_COMMUNITY).not.toBe(NO_PAGE_YET);
    expect(new URL(THE_EMI_COMMUNITY).host).toBe('t.me');

    expect(pressing.inThePage.filter((press) => press.called === words.communityJoin)).toEqual([
      {
        address: THE_EMI_COMMUNITY,
        called: words.communityJoin,
        opensWhereSheIs: true,
        handsNothingBack: true,
      },
    ]);

    expect(pressing.atTheFoot.filter((press) => press.called === words.footerCommunity)).toEqual([
      {
        address: THE_EMI_COMMUNITY,
        called: words.footerCommunity,
        opensWhereSheIs: true,
        handsNothingBack: true,
      },
    ]);
  },
);

/**
 * Every press she can reach inside one landmark of the page. A press the page draws with no box, or
 * hides, is a press she never meets, so it is left out: holding the page to a promise she cannot
 * read is how a scenario fails for a reason that is nothing to do with her.
 */
async function pressesInside(
  page: Page,
  role: Parameters<Page['getByRole']>[0],
): Promise<APressSheCanMake[]> {
  return page
    .getByRole(role)
    .first()
    .evaluate((landmark: Element) =>
      [...landmark.querySelectorAll('a[href]')]
        .map((press) => {
          const box = press.getBoundingClientRect();
          const drawn = getComputedStyle(press);
          const named = press.getAttribute('aria-label');

          return {
            address: press.getAttribute('href') ?? '',
            called: named === null ? (press.textContent ?? '').replace(/\s+/g, ' ').trim() : named,
            opensWhereSheIs: press.getAttribute('target') === null,
            handsNothingBack: (press.getAttribute('rel') ?? '').split(' ').includes('noopener'),
            hidden:
              drawn.visibility === 'hidden' ||
              drawn.display === 'none' ||
              box.width === 0 ||
              box.height === 0,
          };
        })
        .filter((press) => !press.hidden)
        .map(({ called, address, opensWhereSheIs, handsNothingBack }) => ({
          address,
          called,
          opensWhereSheIs,
          handsNothingBack,
        })),
    );
}
