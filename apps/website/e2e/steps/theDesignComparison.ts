import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type Page, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import type { WhatSheIsLookingAt } from './fixtures';

/** The window the project running this scenario gives it, which every picture starts from. */
export interface AWindow {
  readonly width: number;
  readonly height: number;
}

/**
 * The rows of a picture that a comparison reads, counted down from the top. A band whose height
 * one side cannot match is named this way rather than painted over, so the rows above it and the
 * rows below it are each still held to the design, pixel for pixel.
 */
export interface ABandToLeaveOut {
  /** The first row of the band, which is the last row the comparison above it reads. */
  readonly from: number;
  /** The row under the band, which is the first row the comparison below it reads. */
  readonly to: number;
}

/**
 * One area of a page a comparison leaves out, found by the element it starts at the top of and the
 * element it ends at the bottom of, and named by what a reader calls that part of the page.
 *
 * Both documents are asked for the same two elements, so an area is the same part of the page on
 * each side however far down the page it has moved. Where one document draws more there than the
 * other, the two ends can be two different elements on the page and one element in the design.
 */
export interface AnAreaOfAPage {
  readonly called: string;
  readonly from: string;
  readonly to: string;
}

/** Where one of those areas stands in a picture, in rows, with the name it was asked for. */
export interface AnAreaMeasured extends ABandToLeaveOut {
  readonly called: string;
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

/**
 * The rows of a picture from one row to another, as a picture of its own, so the comparison below
 * reads one rectangle of each side rather than two whole pages that no longer line up.
 */
function rowsOf(picture: PNG, from: number, to: number): PNG {
  const height = to - from;
  const cut = new PNG({ width: picture.width, height });

  picture.data.copy(cut.data, 0, from * picture.width * 4, to * picture.width * 4);

  return cut;
}

export function bothOf(looking: WhatSheIsLookingAt): { design: PNG; page: PNG } {
  const { atTheDesign, atThePage } = looking;

  if (atTheDesign === null || atThePage === null) {
    throw new Error('Both pictures have to be taken before they can be held against each other.');
  }

  return { design: atTheDesign, page: atThePage };
}

export function bothSetsOfAreasOf(looking: WhatSheIsLookingAt): {
  inTheDesign: AnAreaMeasured[];
  onThePage: AnAreaMeasured[];
} {
  const { theAreasInTheDesign, theAreasOnThePage } = looking;

  if (theAreasInTheDesign.length === 0 || theAreasOnThePage.length === 0) {
    throw new Error('Every area has to be measured on both sides before it can be left out.');
  }

  return { inTheDesign: theAreasInTheDesign, onThePage: theAreasOnThePage };
}

/**
 * The comparison itself. The name is part of the failure and part of the file the failure leaves,
 * because a run reads three widths of two pages and the reader has to know which one moved.
 */
export function howMuchOfItMoved(looking: WhatSheIsLookingAt, called: string): void {
  const { design, page } = bothOf(looking);

  holdOneAgainstTheOther(design, page, called);
}

/**
 * The same comparison, with the named areas of each side left out. Each area is a place the page
 * and the design are allowed to differ, and each one is allowed to be a different height on the
 * two sides, so the rows between one area and the next are read from the bottom of the area above
 * them on each side. Nothing is painted over and nothing is skipped past: every row outside the
 * areas is held to the design, pixel for pixel.
 *
 * Each stretch between two areas has to be the same height on both sides, or the pages differ
 * somewhere other than the areas and the comparison would be reading one part of the page against
 * another. That is what the height of each stretch being equal says, and a failure names the area
 * the stretch sits above.
 */
export function howMuchOfItMovedOutsideTheAreas(looking: WhatSheIsLookingAt, called: string): void {
  const { design, page } = bothOf(looking);
  const { inTheDesign, onThePage } = bothSetsOfAreasOf(looking);

  expect(page.width).toBe(design.width);
  expect(onThePage.map((area) => area.called)).toEqual(inTheDesign.map((area) => area.called));

  let downTheDesign = 0;
  let downThePage = 0;

  for (const [at, area] of inTheDesign.entries()) {
    const onTheOther = onThePage[at];

    if (onTheOther === undefined) {
      throw new Error(`${area.called} was not measured on the page.`);
    }

    holdOneAgainstTheOther(
      rowsOf(design, downTheDesign, area.from),
      rowsOf(page, downThePage, onTheOther.from),
      `${called}-above-${area.called}`,
    );

    downTheDesign = area.to;
    downThePage = onTheOther.to;
  }

  holdOneAgainstTheOther(
    rowsOf(design, downTheDesign, design.height),
    rowsOf(page, downThePage, page.height),
    `${called}-under-the-last-area`,
  );
}

/**
 * How much taller the page is than the design inside the areas that were left out, which is the
 * whole of the difference in the height of the two documents where nothing else moved.
 */
export function howMuchTheAreasGrew(looking: WhatSheIsLookingAt): number {
  const { inTheDesign, onThePage } = bothSetsOfAreasOf(looking);

  return onThePage.reduce((grown, area, at) => {
    const inTheOther = inTheDesign[at];

    if (inTheOther === undefined) {
      throw new Error(`${area.called} was not measured in the design.`);
    }

    return grown + (area.to - area.from) - (inTheOther.to - inTheOther.from);
  }, 0);
}

function holdOneAgainstTheOther(design: PNG, page: PNG, called: string): void {
  const { width, height } = design;
  const difference = new PNG({ width, height });

  expect(page.width).toBe(width);
  expect(page.height).toBe(height);
  expect(height).toBeGreaterThan(0);

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

/**
 * Where each named area stands in the document a browser is looking at, in rows down the page.
 * Read in the browser rather than written down, because the page and the design put the same part
 * of the page at different heights, and both are measured the same way.
 *
 * The areas come back in the order they were asked for, and that order has to be the order they
 * stand in down the page, or the stretches between them would overlap and a comparison of them
 * would be reading one part of the page against another.
 */
export async function theAreasToLeaveOut(
  page: Page,
  areas: readonly AnAreaOfAPage[],
): Promise<AnAreaMeasured[]> {
  const measured: AnAreaMeasured[] = [];

  for (const area of areas) {
    const rows = await page.evaluate(
      ([from, to]) => {
        const opens = document.querySelector(from as string);
        const closes = document.querySelector(to as string);

        if (opens === null || closes === null) {
          throw new Error(`The document holds no ${from} or no ${to}.`);
        }

        return {
          top: opens.getBoundingClientRect().top + window.scrollY,
          bottom: closes.getBoundingClientRect().bottom + window.scrollY,
        };
      },
      [area.from, area.to] as const,
    );

    const from = Math.floor(rows.top);
    const to = Math.ceil(rows.bottom);
    const above = measured.at(-1);

    if (to <= from) {
      throw new Error(`The area called ${area.called} measured ${to - from} px tall.`);
    }

    if (above !== undefined && from < above.to) {
      throw new Error(
        `The area called ${area.called} starts at row ${from}, which is above the bottom of ` +
          `${above.called} at row ${above.to}. The areas have to be named down the page.`,
      );
    }

    measured.push({ called: area.called, from, to });
  }

  return measured;
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
 * The window is grown to the whole page first, for the reason `pictureOf` grows it: a part that
 * sits below the fold is not drawn at all until the window reaches it, and a stitched picture
 * carries a seam that reads as a difference nobody wrote.
 */
async function picturesOfTheParts(
  page: Page,
  address: string,
  window: AWindow,
  parts: readonly APartOfAPage[],
): Promise<PNG[]> {
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
