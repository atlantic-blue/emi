import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type Page, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { createBdd } from 'playwright-bdd';

import { type WhatSheIsLookingAt, test } from './fixtures';

/**
 * The approved design, as plain markup beside this suite. It is opened as a file rather than served,
 * because it is a record of a drawing and not a page of the site, and the faces and the pictures it
 * asks for sit next to it.
 */
const theDesign = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'docs',
  'design',
  'website',
  'home-v2',
  'render',
  'MainV2.html',
);

/** Where a failure leaves the picture of the difference, which is what the pipeline keeps. */
const whereTheDiffGoes = resolve(__dirname, '..', '..', 'test-results');

/**
 * How far one pixel may sit from the pixel it is held against before it counts as different. This
 * is pixelmatch's own sensitivity, and it is not the budget below: a pixel inside it is the same
 * pixel, a pixel outside it is counted.
 */
const howCloseAPixelMustBe = 0.1;

/**
 * How much of the page may differ: one pixel in a thousand. A section that moved by 8 px, a tint a
 * shade off, a rule that grew to four sides, a face that did not load: each of those is far past
 * this. What it leaves room for is the edge of a letter, which two rendering paths can round
 * differently without anybody reading a different page.
 */
const howMuchOfThePageMayDiffer = 0.001;

/**
 * Both pages are drawn by the one browser the scenario runs in, at the one width its project gives
 * it. Two browsers draw one page into different bytes, so a comparison across two of them would
 * report on the machine rather than on the page.
 *
 * The window is grown to the whole height of the page before the picture is taken. Playwright can
 * stitch a picture of a page taller than its window, and a stitched picture carries the seam, which
 * reads as a difference nobody wrote.
 */
async function pictureOf(page: Page, address: string): Promise<PNG> {
  await page.goto(address);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  const window = page.viewportSize();

  if (window === null) {
    throw new Error('The browser reported no window size.');
  }

  const height = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  );

  await page.setViewportSize({ width: window.width, height });
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  return PNG.sync.read(await page.screenshot());
}

function bothOf(looking: WhatSheIsLookingAt): { design: PNG; page: PNG } {
  const { atTheDesign, atThePage } = looking;

  if (atTheDesign === null || atThePage === null) {
    throw new Error('Both pictures have to be taken before they can be held against each other.');
  }

  return { design: atTheDesign, page: atThePage };
}

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the home page beside the design the operator approved',
  async ({ page, looking }) => {
    expect(existsSync(theDesign), `The approved design is not at ${theDesign}.`).toBe(true);

    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`);
    looking.atThePage = await pictureOf(page, '/en/');
  },
);

Then(
  'the page she reads is as tall as the design, so no section is missing and none was added',
  ({ looking }) => {
    const { design, page } = bothOf(looking);

    expect(page.width).toBe(design.width);
    expect(page.height).toBe(design.height);
  },
);

Then('what she is looking at is the design, to within one pixel in a thousand', ({ looking }) => {
  const { design, page } = bothOf(looking);
  const { width, height } = design;
  const difference = new PNG({ width, height });

  const differing = pixelmatch(design.data, page.data, difference.data, width, height, {
    threshold: howCloseAPixelMustBe,
  });

  const share = differing / (width * height);

  if (share > howMuchOfThePageMayDiffer) {
    mkdirSync(whereTheDiffGoes, { recursive: true });

    const picture = join(whereTheDiffGoes, `the-home-page-against-the-design-${width}.png`);

    writeFileSync(picture, PNG.sync.write(difference));

    throw new Error(
      `At ${width} px wide, ${differing} of ${width * height} pixels differ, which is ` +
        `${(share * 100).toFixed(3)} per cent of the page against a budget of ` +
        `${howMuchOfThePageMayDiffer * 100} per cent. ` +
        `The difference is drawn in ${picture}.`,
    );
  }
});
