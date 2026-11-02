import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

/**
 * What each language's page says, written out here rather than imported from the site. A test that
 * reads the words from the same file the page draws them from agrees with the page whatever the
 * page says.
 *
 * Four sentences each: the headline, what the first month costs, the press to Apple's store, and
 * the press that reads the free calculator instead. The last two are the only two things this page
 * asks her to do. The approved board names no amount here, so neither does this list.
 */
const theLanguages = {
  English: {
    address: '/en/',
    tag: 'en',
    headline: 'Understand your body, safely.',
    firstMonth: 'Free for your first month.',
    store: 'Download on the App Store',
    instead: 'When is my next period?',
  },
  Russian: {
    address: '/ru/',
    tag: 'ru',
    headline: 'Понимайте своё тело бережно.',
    firstMonth: 'Первый месяц бесплатно.',
    store: 'Загрузите в App Store',
    instead: 'Когда мои следующие месячные?',
  },
  Spanish: {
    address: '/es/',
    tag: 'es',
    headline: 'Entiende tu cuerpo, con calma.',
    firstMonth: 'Tu primer mes es gratis.',
    store: 'Descárgala en el App Store',
    instead: '¿Cuándo es mi próximo periodo?',
  },
} as const;

type LanguageName = keyof typeof theLanguages;

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

Then(
  'she reads the headline and what the first month costs, in {word}',
  async ({ page }, language: string) => {
    const words = theLanguages[asKnown(language)];

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(words.headline);
    await expect(page.getByText(words.firstMonth).first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', words.tag);
  },
);

Then(
  'the press to the store and the press to the calculator are both on the page, inside the screen she holds',
  async ({ page, reading }) => {
    const words = theLanguages[asKnown(reading.language)];
    const screen = page.viewportSize();

    if (screen === null) {
      throw new Error('The browser reported no screen size.');
    }

    for (const press of [
      page.getByRole('link', { name: words.store }).first(),
      page.getByRole('link', { name: new RegExp(words.instead) }),
    ]) {
      await expect(press).toBeVisible();

      const box = await press.boundingBox();

      if (box === null) {
        throw new Error('The browser reported no box for a press she has to be able to reach.');
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
  await expect(page.getByText(theLanguages.Russian.firstMonth).first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(theLanguages.Russian.address);
});
