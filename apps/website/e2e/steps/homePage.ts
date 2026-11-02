import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

/**
 * What each language's page says, written out here rather than imported from the site. A test that
 * reads the words from the same file the page draws them from agrees with the page whatever the
 * page says.
 *
 * The brand line stays in English on all three pages, so the headline read here is the line under
 * it, which is translated.
 */
const theLanguages = {
  English: {
    address: '/en/',
    tag: 'en',
    headline: 'Get to know yourself better.',
    price: 'One month free, then 29.99 pounds a month.',
    store: 'Download on the App Store',
    beta: 'Join the beta on TestFlight ›',
  },
  Russian: {
    address: '/ru/',
    tag: 'ru',
    headline: 'Узнайте себя лучше.',
    price: 'Первый месяц бесплатно, затем 29,99 фунта в месяц.',
    store: 'Загрузите в App Store',
    beta: 'Присоединиться к бета-версии в TestFlight ›',
  },
  Spanish: {
    address: '/es/',
    tag: 'es',
    headline: 'Conócete mejor.',
    price: 'Un mes gratis, después 29,99 libras al mes.',
    store: 'Descárgala en el App Store',
    beta: 'Únete a la beta en TestFlight ›',
  },
} as const;

type LanguageName = keyof typeof theLanguages;

const theBrandLine = 'Emi. Every Month Insights.';

function asKnown(language: string): LanguageName {
  if (language in theLanguages) {
    return language as LanguageName;
  }

  throw new Error(`This suite holds no words for ${language}.`);
}

const { Given, When, Then } = createBdd(test);

Given(
  'a woman opens the home page in {word}',
  async ({ page, answered, reading }, language: string) => {
    const answer = await page.goto(theLanguages[asKnown(language)].address);

    answered.status = answer === null ? null : answer.status();
    reading.language = language;
  },
);

Then('the site answers with a page', async ({ answered }) => {
  expect(answered.status).toBe(200);
});

Then('she reads the headline and what Emi costs, in {word}', async ({ page }, language: string) => {
  const words = theLanguages[asKnown(language)];

  await expect(page.getByText(theBrandLine)).toBeVisible();
  await expect(page.getByText(words.headline)).toBeVisible();
  await expect(page.getByText(words.price)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', words.tag);
});

Then(
  'the press to the store and the press to the beta are both on the page, inside the screen she holds',
  async ({ page, reading }) => {
    const words = theLanguages[asKnown(reading.language)];
    const screen = page.viewportSize();

    if (screen === null) {
      throw new Error('The browser reported no screen size.');
    }

    for (const name of [words.store, words.beta]) {
      const press = page.getByRole('link', { name });

      await expect(press).toBeVisible();

      const box = await press.boundingBox();

      if (box === null) {
        throw new Error(`The browser reported no box for ${name}.`);
      }

      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(screen.width);
    }
  },
);

Then('the page asked no other host for anything', async ({ page, asked }) => {
  const here = new URL(page.url()).host;

  expect(asked.of.length).toBeGreaterThan(0);
  expect(asked.of.filter((host) => host !== here)).toEqual([]);
});

Then('the page kept nothing on her machine', async ({ page }) => {
  expect(await page.context().cookies()).toEqual([]);
});

When('she presses Russian in the header', async ({ page }) => {
  await page.getByRole('link', { name: 'Русский' }).click();
});

Then('the page she gets is in Russian', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', theLanguages.Russian.tag);
  await expect(page.getByText(theLanguages.Russian.price)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(theLanguages.Russian.address);
});
