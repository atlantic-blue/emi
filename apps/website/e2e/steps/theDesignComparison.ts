import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import type { WhatSheIsLookingAt } from './fixtures';

/** The window the project running this scenario gives it, which every picture starts from. */
export interface AWindow {
  readonly width: number;
  readonly height: number;
}

/**
 * How a page of the site is held against the design it was drawn from. Two pages are built from
 * two boards and each has a scenario of its own, so the sentences differ and the reading does not.
 * One reading, because a second copy of it is a second set of numbers somebody can move.
 */

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

/** The design beside this suite, as a browser opens it: a file, because it is a record of a drawing. */
export function theDesignAt(...where: string[]): string {
  return resolve(__dirname, '..', '..', '..', '..', 'docs', 'design', 'website', ...where);
}

/**
 * Both pages are drawn by the one browser the scenario runs in, at the one width its project gives
 * it. Two browsers draw one page into different bytes, so a comparison across two of them would
 * report on the machine rather than on the page.
 *
 * The window is grown to the whole height of the page before the picture is taken. Playwright can
 * stitch a picture of a page taller than its window, and a stitched picture carries the seam, which
 * reads as a difference nobody wrote.
 *
 * The browser is told the reader asked for less motion before either page is opened. Two bands of
 * the home page carry a carousel that moves on by one card every seven seconds, and the design is
 * one still picture of it, so a page whose cards had moved would differ from the design for a
 * reason nobody wrote. Pressing the page's own Pause would not do: the press renames itself Play,
 * and the design says Pause.
 */
export async function pictureOf(page: Page, address: string, window: AWindow): Promise<PNG> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Back to the window the project gives this run, because the picture before this one left the
  // window as tall as whatever it was reading. A page whose frame is a screen tall measures as
  // tall as the window it sits in, so a short page read in a tall window reports the height of
  // the page before it, and a comparison of heights then agrees whatever the page did.
  await page.setViewportSize(window);
  await page.goto(address);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  const height = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  );

  await page.setViewportSize({ width: window.width, height });
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  return PNG.sync.read(await page.screenshot());
}

export function bothOf(looking: WhatSheIsLookingAt): { design: PNG; page: PNG } {
  const { atTheDesign, atThePage } = looking;

  if (atTheDesign === null || atThePage === null) {
    throw new Error('Both pictures have to be taken before they can be held against each other.');
  }

  return { design: atTheDesign, page: atThePage };
}

/**
 * The comparison itself. The name is part of the failure and part of the file the failure leaves,
 * because a run reads three widths of two pages and the reader has to know which one moved.
 */
export function howMuchOfItMoved(looking: WhatSheIsLookingAt, called: string): void {
  const { design, page } = bothOf(looking);
  const { width, height } = design;
  const difference = new PNG({ width, height });

  const differing = pixelmatch(design.data, page.data, difference.data, width, height, {
    threshold: howCloseAPixelMustBe,
  });

  const share = differing / (width * height);

  if (share > howMuchOfThePageMayDiffer) {
    mkdirSync(whereTheDiffGoes, { recursive: true });

    const picture = join(whereTheDiffGoes, `${called}-against-the-design-${width}.png`);

    writeFileSync(picture, PNG.sync.write(difference));

    throw new Error(
      `At ${width} px wide, ${differing} of ${width * height} pixels differ, which is ` +
        `${(share * 100).toFixed(3)} per cent of the page against a budget of ` +
        `${howMuchOfThePageMayDiffer * 100} per cent. ` +
        `The difference is drawn in ${picture}.`,
    );
  }
}
