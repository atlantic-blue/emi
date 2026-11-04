import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * How a part of a page of the site is held against the part of the design it was drawn from. Three
 * pages are built from three boards and each has a scenario of its own, so the sentences differ and
 * the reading does not. One reading, because a second copy of it is a second set of numbers
 * somebody can move.
 *
 * A part rather than a whole page. Every board of the site was drawn before some of its presses
 * waited for a page, so a board draws presses the site holds back, and the bands that carry them
 * would report the same difference every run. Each scenario names the parts its board still
 * describes.
 */

/** The window the project running this scenario gives it, which every picture starts from. */
export interface AWindow {
  readonly width: number;
  readonly height: number;
}

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

/** One part of a page, held against the same part of the design it was drawn from. */
export interface APairOfPictures {
  readonly called: string;
  readonly design: PNG;
  readonly page: PNG;
}

/**
 * A part of a page, named by what a reader calls it and found by the element that holds it. The
 * box is read in each document rather than given, because the two documents are not the same
 * height and the same part therefore sits at two different places down the page.
 */
export interface APartOfAPage {
  readonly called: string;
  /** The element the part starts at the top of, and the one it ends at the bottom of. */
  readonly from: string;
  readonly to: string;
}

/** What a picture of one part is taken of: the whole width, and the rows that part occupies. */
export interface AClip {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The box of one part, in the document a browser currently holds, rounded to whole pixels. */
async function boxOf(page: Page, part: APartOfAPage, width: number): Promise<AClip> {
  const measured = await page.evaluate(
    ([from, to]) => {
      const opens = document.querySelector(from as string);
      const closes = document.querySelector(to as string);

      if (opens === null || closes === null) {
        throw new Error(`The page holds no ${from} or no ${to}.`);
      }

      return {
        top: opens.getBoundingClientRect().top + window.scrollY,
        bottom: closes.getBoundingClientRect().bottom + window.scrollY,
      };
    },
    [part.from, part.to] as const,
  );

  const top = Math.round(measured.top);
  const height = Math.round(measured.bottom) - top;

  if (height <= 0) {
    throw new Error(`The part called ${part.called} measured ${height} px tall.`);
  }

  return { x: 0, y: top, width, height };
}

/**
 * A picture of each named part of one document, in the one browser the scenario runs in.
 *
 * The window is grown to the whole page first: a part that sits below the fold is not drawn at all
 * until the window reaches it, and Playwright stitches a picture of a page taller than its window,
 * which carries a seam that reads as a difference nobody wrote.
 */
async function picturesOfTheParts(
  page: Page,
  address: string,
  window: AWindow,
  parts: readonly APartOfAPage[],
): Promise<PNG[]> {
  // The reader is told she asked for less motion before either document is opened. Two bands of
  // the home page carry a carousel that moves on by one card every seven seconds, and a board is
  // one still picture of it, so a page whose cards had moved would differ for a reason nobody
  // wrote. Pressing the page's own Pause would not do: the press renames itself Play, and the
  // board says Pause.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Back to the window the project gives this run, because the reading before this one left the
  // window as tall as whatever it was looking at.
  await page.setViewportSize(window);
  await page.goto(address);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  const height = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  );

  await page.setViewportSize({ width: window.width, height });
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  const taken: PNG[] = [];

  for (const part of parts) {
    const clip = await boxOf(page, part, window.width);

    taken.push(PNG.sync.read(await page.screenshot({ clip })));
  }

  return taken;
}

/**
 * Each named part of the design, beside the same part of the page the site serves. Both documents
 * are read by the one browser the scenario runs in, at the one width its project gives it, because
 * two browsers draw one page into different bytes.
 */
export async function thePartsHeldAgainstTheDesign(
  page: Page,
  design: string,
  served: string,
  window: AWindow,
  parts: readonly APartOfAPage[],
): Promise<APairOfPictures[]> {
  const drawn = await picturesOfTheParts(page, design, window, parts);
  const built = await picturesOfTheParts(page, served, window, parts);

  return parts.map((part, at) => {
    const one = drawn[at];
    const other = built[at];

    if (one === undefined || other === undefined) {
      throw new Error(`No picture was taken of ${part.called}.`);
    }

    return { called: part.called, design: one, page: other };
  });
}

/**
 * The comparison of one part, named by the part rather than by the page, because a run reads
 * several parts of two pages and the reader has to know which one moved.
 */
export function howMuchOfThePartMoved(pair: APairOfPictures): void {
  const { called, design, page } = pair;
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
      `At ${width} px wide, ${called} differs in ${differing} of ${width * height} pixels, ` +
        `which is ${(share * 100).toFixed(3)} per cent of it against a budget of ` +
        `${howMuchOfThePageMayDiffer * 100} per cent. ` +
        `The difference is drawn in ${picture}.`,
    );
  }
}
