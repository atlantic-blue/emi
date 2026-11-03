import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { NO_PAGE_YET, THE_EMI_COMMUNITY } from '../../lib/addresses';
import { wordsIn } from '../../app/words';
import type { Language } from '../../app/words';
import { test } from './fixtures';
import type { APressSheCanMake } from './fixtures';

/**
 * The two landmarks the presses are divided by. Read by role rather than by element, because that
 * is what her software goes by.
 */
const thePageItself = 'main';

const theBandAtTheFoot = 'contentinfo';

const { Then, When } = createBdd(test);

When('she reads every press the page offers her', async ({ page, pressing }) => {
  // The cards of the two carousels move on by themselves, and a press that is moving while it is
  // read is read in two places. The reader is told she asked for less motion, which is what the
  // page itself reads to hold them still.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);

  pressing.reading = (await page.locator('html').getAttribute('lang')) ?? '';

  for (const [role, into] of [
    [thePageItself, pressing.inThePage],
    [theBandAtTheFoot, pressing.atTheFoot],
  ] as const) {
    into.push(...(await pressesInside(page, role)));
  }

  // A read that found nothing to read reports the same as a page where every press is right, so
  // the count of what was read is part of the scenario.
  expect(pressing.inThePage.length).toBeGreaterThan(8);
  expect(pressing.atTheFoot.length).toBeGreaterThan(8);
});

Then('each press she can see moves her somewhere', ({ pressing }) => {
  const language = pressing.reading;

  expect(language).not.toBe('');

  const leadingSomewhere = pressing.inThePage.filter((press) => press.address !== NO_PAGE_YET);

  expect(leadingSomewhere.length).toBeGreaterThan(6);

  for (const press of leadingSomewhere) {
    // A page of this site sits under the language she is reading, and the one address that is not
    // of this site is the community's.
    expect({
      called: press.called,
      takesHerOn: press.address.startsWith(`/${language}/`) || press.address === THE_EMI_COMMUNITY,
    }).toEqual({ called: press.called, takesHerOn: true });
  }
});

Then('the only presses that lead nowhere are the two to the store', ({ pressing }) => {
  const words = wordsIn(pressing.reading as Language);
  const leadingNowhere = pressing.inThePage.filter((press) => press.address === NO_PAGE_YET);

  expect(leadingNowhere.map((press) => press.called)).toEqual([words.store, words.store]);
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
