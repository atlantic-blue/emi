import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { type Language, wordsIn } from '../../app/words';
import { THE_BLACK_FRIDAY_OFFER, theBlackFridayOfferIsOpen } from '../../lib/theBlackFridayOffer';
import { test } from './fixtures';

/**
 * The page of the Black Friday offer, read in a browser.
 *
 * Every sentence here holds whether the offer is open or over, because the same sentences are read
 * against the live host after every deploy and the offer closes on a day of its own. Which half is
 * read is decided by the one function the page decides it by, so a page that went on offering a
 * price nobody sells would fail this rather than pass it on a technicality.
 */

/** The language each example names, by the name a reader of the scenario writes. */
const theLanguages: Readonly<Record<string, Language>> = {
  English: 'en',
  Russian: 'ru',
  Spanish: 'es',
};

function asKnown(language: string): Language {
  const found = theLanguages[language];

  if (found === undefined) {
    throw new Error(`This suite holds no words for ${language}.`);
  }

  return found;
}

/** Where a press that buys takes her, which is the till with the offer in the address. */
function theTill(language: Language): string {
  return `/${language}/checkout/?offer=${THE_BLACK_FRIDAY_OFFER}`;
}

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the page of the offer in {word}',
  async ({ page, answered, reading }, language: string) => {
    const answer = await page.goto(`/${asKnown(language)}/black-friday/`);

    answered.status = answer === null ? null : answer.status();
    answered.landedOn = new URL(page.url()).pathname;
    reading.language = language;
  },
);

Then('the site answers her with a page', ({ answered }) => {
  expect(answered.status).toBe(200);
});

Then(
  'she reads what the offer costs and the day it ends, or the home page once the offer is over, in {word}',
  async ({ page, answered }, language: string) => {
    const tongue = asKnown(language);
    const words = wordsIn(tongue);

    if (!theBlackFridayOfferIsOpen(new Date())) {
      expect(answered.landedOn).toBe(`/${tongue}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(words.heroHeadline);

      return;
    }

    expect(answered.landedOn).toBe(`/${tongue}/black-friday/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(words.blackFridayHeading);

    for (const said of [
      words.blackFridayPrice,
      words.blackFridayInsteadOf,
      words.blackFridayEnds,
    ]) {
      await expect(page.getByText(said).first()).toBeVisible();
    }
  },
);

Then(
  'every press that buys carries the offer to the till, or there is none once the offer is over',
  async ({ page, reading }) => {
    const tongue = asKnown(reading.language);
    const words = wordsIn(tongue);
    const buying = page.getByRole('link', { name: words.blackFridayPress });

    if (!theBlackFridayOfferIsOpen(new Date())) {
      await expect(buying).toHaveCount(0);

      return;
    }

    // The hero and the band at the end, which are the two places the page asks her.
    await expect(buying).toHaveCount(2);

    for (const press of await buying.all()) {
      await expect(press).toBeVisible();
      await expect(press).toHaveAttribute('href', theTill(tongue));
    }

    const answer = await page.request.get(theTill(tongue), { maxRedirects: 0 });

    expect(answer.status()).toBe(200);
  },
);
