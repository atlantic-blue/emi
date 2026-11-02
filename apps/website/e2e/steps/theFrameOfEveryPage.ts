import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

/**
 * The two landmarks a reader's software reads out as the top and the foot of a page. They are read
 * by role rather than by element, because that is what her software goes by: a `footer` written
 * inside a section of the page is not the foot of the page to her, however much it looks like one.
 */
const theBandAtTheTop = 'banner';

const theBandAtTheFoot = 'contentinfo';

const { Given, Then } = createBdd(test);

Given('a woman opens the page at {string}', async ({ page, answered }, address: string) => {
  const answer = await page.goto(address);

  answered.status = answer === null ? null : answer.status();
  answered.landedOn = new URL(page.url()).pathname;
});

Then('the page gives her one band at the top and one band at the foot', async ({ page }) => {
  await expect(page.getByRole(theBandAtTheTop)).toHaveCount(1);
  await expect(page.getByRole(theBandAtTheFoot)).toHaveCount(1);
});

Then(
  'both bands read in the language the page declares, which is {string}',
  async ({ page }, language: string) => {
    await expect(page.locator('html')).toHaveAttribute('lang', language);

    // The way home is the one press the band at the top offers at every width, so it is the one
    // that says which language the band is speaking on a phone as well as on a desktop.
    const wayHome = page.getByRole(theBandAtTheTop).getByRole('link').first();

    await expect(wayHome).toHaveAttribute('href', `/${language}/`);

    // The band at the foot marks the language she is reading in the list of three, so the mark
    // says the same thing from the other end of the page.
    const sheIsReading = page.getByRole(theBandAtTheFoot).locator('a[aria-current="page"]');

    await expect(sheIsReading).toHaveCount(1);
    await expect(sheIsReading).toHaveAttribute('href', `/${language}/`);
  },
);
