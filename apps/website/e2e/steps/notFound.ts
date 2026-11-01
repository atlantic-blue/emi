import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

/**
 * The words are written out here rather than imported from the page. A test that reads them from
 * the same constant the page draws them from agrees with the page whatever the page says.
 */
const theHeadlineSheReads = 'This page does not exist';

const thePressBackToEmi = 'Go to the Emi home page';

const { Given, Then } = createBdd(test);

Given(
  'a woman opens {string}, which this site does not have',
  async ({ page, answered }, address: string) => {
    const answer = await page.goto(address);

    answered.status = answer === null ? null : answer.status();
  },
);

Then('the site answers that there is no such page', async ({ answered }) => {
  expect(answered.status).toBe(404);
});

Then('she reads that the page does not exist', async ({ page }) => {
  await expect(page.getByText(theHeadlineSheReads)).toBeVisible();
});

Then('the press back to Emi is on the page, inside the screen she holds', async ({ page }) => {
  const pressBack = page.getByRole('link', { name: thePressBackToEmi });

  await expect(pressBack).toBeVisible();
  await expect(pressBack).toHaveAttribute('href', '/');

  const screen = page.viewportSize();
  const box = await pressBack.boundingBox();

  if (screen === null || box === null) {
    throw new Error('The browser reported no screen size, or no box for the press back to Emi.');
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(screen.width);
});
