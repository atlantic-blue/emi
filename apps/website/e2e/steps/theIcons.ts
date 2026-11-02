import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import {
  addressOf,
  icoEntries,
  iconFiles,
  mediaTypeOf,
  pngSize,
  sizesOf,
} from '../../tools/theIcons';

import { test } from './fixtures';

const { Then } = createBdd(test);

/** What a png opens with, which is how an answer of one container is told from the other. */
const PNG_FIRST_BYTE = 0x89;

/** The one address a browser asks a site for without being told, which is why it is read apart. */
const ASKED_FOR_ON_ITS_OWN = '/favicon.ico';

interface Named {
  readonly address: string;
  readonly sizes: string;
  readonly kind: string;
}

/** Every square a document names, read the way a browser reads the head of a page. */
async function namedOn(page: Page, relation: string): Promise<Named[]> {
  const tags = await page.locator(`link[rel="${relation}"]`).all();

  return Promise.all(
    tags.map(async (tag) => ({
      address: (await tag.getAttribute('href')) ?? '',
      sizes: (await tag.getAttribute('sizes')) ?? '',
      kind: (await tag.getAttribute('type')) ?? '',
    })),
  );
}

/**
 * The size the file at an address really is, read out of the bytes the site sent back. A png says
 * so in its own header. An ico says so twice, in its directory and in the image the directory
 * points at, and the image is the one read here, so the two cannot disagree unnoticed.
 */
function sizeInside(bytes: Buffer): string {
  const png = bytes[0] === PNG_FIRST_BYTE ? bytes : bytes.subarray(icoEntries(bytes)[0]?.at ?? 0);
  const { width, height } = pngSize(png);

  return `${String(width)}x${String(height)}`;
}

Then('the page names a square for every size her browser asks for', async ({ page }) => {
  const expected = iconFiles
    .filter((file) => file.declaration === 'icon')
    .map((file) => ({ address: addressOf(file), sizes: sizesOf(file), kind: mediaTypeOf(file) }));

  expect(await namedOn(page, 'icon')).toEqual(expected);
});

Then(
  'each of those addresses answers her with a square of the size the page promised',
  async ({ page, request }) => {
    const named = [...(await namedOn(page, 'icon')), ...(await namedOn(page, 'apple-touch-icon'))];

    expect(named.length).toBe(iconFiles.length);

    for (const square of named) {
      const answer = await request.get(square.address);

      expect({ address: square.address, status: answer.status() }).toEqual({
        address: square.address,
        status: 200,
      });
      expect({ address: square.address, size: sizeInside(await answer.body()) }).toEqual({
        address: square.address,
        size: square.sizes,
      });
    }
  },
);

Then('the square her phone saves to its home screen is offered to it by name', async ({ page }) => {
  const forAPhone = iconFiles.filter((file) => file.declaration === 'apple');

  expect(await namedOn(page, 'apple-touch-icon')).toEqual(
    forAPhone.map((file) => ({
      address: addressOf(file),
      sizes: sizesOf(file),
      kind: mediaTypeOf(file),
    })),
  );
});

Then('the one address a browser asks for on its own answers her as well', async ({ request }) => {
  const answer = await request.get(ASKED_FOR_ON_ITS_OWN);

  expect(answer.status()).toBe(200);
  expect(sizeInside(await answer.body())).toBe('32x32');
});
