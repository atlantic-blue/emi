import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { pngSize } from '../../tools/theIcons';

import { test } from './fixtures';

const { Then } = createBdd(test);

/** The whole address of the picture, which is the one thing a chat cannot work out for itself. */
const THE_PICTURE = 'https://myemi.app/share-preview.png';

/** What the picture is, in pixels, which a chat lays the card out from before it has the file. */
const THE_SIZE = { width: 1200, height: 630 };

/**
 * One tag out of the head, read the way a chat application reads it. Open Graph marks its tags
 * with `property` and Twitter marks its own with `name`, and a page may write either, so both are
 * asked for and whichever answers is the answer.
 */
async function content(page: Page, tag: string): Promise<string | null> {
  const written = page.locator(`meta[property="${tag}"], meta[name="${tag}"]`);

  return (await written.count()) === 0 ? null : written.first().getAttribute('content');
}

/**
 * The path of an address, which is what the site under test is asked for. The tag is the whole
 * address on the real host, and a run against a copy started here serves 127.0.0.1, so a fetch of
 * the whole address would leave this checkout and read the live site instead of the change.
 */
function pathOf(address: string): string {
  return new URL(address).pathname;
}

Then('the card her sister would see is titled {string}', async ({ page }, title: string) => {
  await expect(page).toHaveTitle(title);
  expect(await content(page, 'og:title')).toBe(title);
  expect(await content(page, 'twitter:title')).toBe(title);
});

Then('the card says what Emi is, in the words of that page', async ({ page }) => {
  const said = await content(page, 'description');

  expect(said === null ? '' : said.length).toBeGreaterThan(0);
  expect(await content(page, 'og:description')).toBe(said);
  expect(await content(page, 'twitter:description')).toBe(said);
});

Then('the card names the language and region {string}', async ({ page }, locale: string) => {
  expect(await content(page, 'og:locale')).toBe(locale);

  // The address of the page is read on the chat's server too, so it is whole for the same reason.
  const address = await content(page, 'og:url');

  expect(address).toBe(`https://myemi.app${new URL(page.url()).pathname}`);
});

Then(
  'the card points at the picture with a whole address, on https://myemi.app',
  async ({ page }) => {
    expect(await content(page, 'og:image')).toBe(THE_PICTURE);
    expect(await content(page, 'twitter:image')).toBe(THE_PICTURE);
    expect(await content(page, 'og:image:width')).toBe(String(THE_SIZE.width));
    expect(await content(page, 'og:image:height')).toBe(String(THE_SIZE.height));
  },
);

Then('the picture is there, and it is the size the card promised', async ({ page, request }) => {
  const address = await content(page, 'og:image');
  const answer = await request.get(pathOf(address ?? ''));

  expect(answer.status()).toBe(200);
  expect(pngSize(await answer.body())).toEqual(THE_SIZE);
});

Then('the card is the kind a chat draws large', async ({ page }) => {
  expect(await content(page, 'twitter:card')).toBe('summary_large_image');
});
