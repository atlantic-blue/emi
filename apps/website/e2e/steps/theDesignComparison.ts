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

export function bothSetsOfBandsOf(looking: WhatSheIsLookingAt): {
  inTheDesign: readonly ABandToLeaveOut[];
  onThePage: readonly ABandToLeaveOut[];
} {
  const { theBandsInTheDesign, theBandsOnThePage } = looking;

  if (theBandsInTheDesign === null || theBandsOnThePage === null) {
    throw new Error('The bands have to be measured on both sides before they can be left out.');
  }

  return { inTheDesign: theBandsInTheDesign, onThePage: theBandsOnThePage };
}

/**
 * The stretches of a picture a comparison reads: from the top to the first band left out, between
 * one band and the next, and from the last band to the foot. A band left out is named rather than
 * painted over, so every row outside the bands is still held to the design.
 */
function theRowsBetween(bands: readonly ABandToLeaveOut[], height: number): ABandToLeaveOut[] {
  const rows: ABandToLeaveOut[] = [];
  let from = 0;

  for (const band of bands) {
    if (band.from < from || band.to < band.from) {
      throw new Error(`A band from ${band.from} to ${band.to} is out of order or inside out.`);
    }

    rows.push({ from, to: band.from });
    from = band.to;
  }

  rows.push({ from, to: height });

  return rows;
}

/** What the failure calls one of those stretches, so a reader knows which part of the page moved. */
function theNameOfTheRows(at: number, of: number): string {
  if (at === 0) {
    return 'above-the-bands';
  }

  if (at === of - 1) {
    return 'under-the-bands';
  }

  return of > 3 ? `between-the-bands-${at}` : 'between-the-bands';
}

/** How much taller the page is than the design, which is the bands left out and nothing else. */
export function howMuchTheBandsGrewBy(
  inTheDesign: readonly ABandToLeaveOut[],
  onThePage: readonly ABandToLeaveOut[],
): number {
  return onThePage.reduce((grown, band, at) => {
    const drawn = inTheDesign[at];

    if (drawn === undefined) {
      throw new Error(`The design has no band to hold band ${at} of the page against.`);
    }

    return grown + (band.to - band.from) - (drawn.to - drawn.from);
  }, 0);
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
 * The same comparison, with named bands of each side left out. A band left out is where the page
 * and the design are allowed to differ, and it is allowed to be a different height on each side,
 * so the stretches between them are read in order from the top of both pictures. Nothing is
 * painted over and nothing is skipped past: every row outside those bands is held to the design as
 * before.
 *
 * Each pair of stretches has to be the same height, or the pages differ somewhere other than the
 * bands and the comparison would be reading one section of the page against another.
 */
export function howMuchOfItMovedOutside(looking: WhatSheIsLookingAt, called: string): void {
  const { design, page } = bothOf(looking);
  const { inTheDesign, onThePage } = bothSetsOfBandsOf(looking);

  expect(page.width).toBe(design.width);
  expect(onThePage).toHaveLength(inTheDesign.length);
  expect(inTheDesign.length).toBeGreaterThan(0);

  const drawn = theRowsBetween(inTheDesign, design.height);
  const built = theRowsBetween(onThePage, page.height);
  let rowsRead = 0;

  for (const [at, rows] of drawn.entries()) {
    const against = built[at];

    if (against === undefined) {
      throw new Error(`The page has no rows to hold stretch ${at} of the design against.`);
    }

    // Two bands that meet leave no rows between them, and a band at the top or at the foot of a
    // page leaves none outside it. A stretch of no rows on both sides says nothing about either
    // document, so it is passed over. A stretch of no rows on one side only is a real difference
    // and goes to the comparison, which refuses it on the heights.
    if (rows.to === rows.from && against.to === against.from) {
      continue;
    }

    rowsRead += rows.to - rows.from;

    holdOneAgainstTheOther(
      rowsOf(design, rows.from, rows.to),
      rowsOf(page, against.from, against.to),
      `${called}-${theNameOfTheRows(at, drawn.length)}`,
    );
  }

  // A reading that passed over every stretch reports the same as a page that is the design, so the
  // rows it did read are part of the reading.
  expect(rowsRead).toBeGreaterThan(0);
}

function holdOneAgainstTheOther(design: PNG, page: PNG, called: string): void {
  const { width, height } = design;
  const difference = new PNG({ width, height });

  expect(page.width).toBe(width);
  expect(page.height).toBe(height);
  // A stretch of no rows at all compares clean whatever either side draws, and a band that swallowed
  // the whole page would leave every stretch empty, so an empty one is refused rather than passed.
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
 * Where the band of the two founders stands in the page a browser is looking at: the top of the
 * note, and the row under the band that holds it. Read in the browser rather than written down,
 * because the page and the design put the band at different heights and both are measured the same
 * way.
 */
export async function theBandOfTheFounders(page: Page): Promise<ABandToLeaveOut> {
  return await page.evaluate(() => {
    const band = document.querySelector('section[aria-labelledby="note-title"]');
    const note = band?.querySelector('blockquote');

    if (band === null || band === undefined || note === null || note === undefined) {
      throw new Error('The page draws no band of the two founders.');
    }

    const top = note.getBoundingClientRect().top + window.scrollY;
    const under = band.getBoundingClientRect().bottom + window.scrollY;

    return { from: Math.floor(top), to: Math.ceil(under) };
  });
}

/**
 * Where the band of reviews stands in the document a browser is looking at. The design draws it,
 * and the page draws it only once somebody has written a review, so a document that holds the band
 * is measured by the band itself and a document without it reports the row where it would stand
 * and no height. The row is the foot of the band above it, which is the top of the band in the
 * document that has one, so the two sides line up to the pixel.
 */
export async function theBandOfTheReviews(page: Page): Promise<ABandToLeaveOut> {
  return await page.evaluate(() => {
    const down = (box: DOMRect): { from: number; to: number } => ({
      from: Math.round(box.top + window.scrollY),
      to: Math.round(box.bottom + window.scrollY),
    });

    const band = document.querySelector('section[aria-labelledby="reviews-title"]');

    if (band !== null) {
      return down(band.getBoundingClientRect());
    }

    const above = document.querySelector('section[aria-labelledby="privacy-title"]');

    if (above === null) {
      throw new Error('The document draws no band above where the reviews would stand.');
    }

    const row = Math.round(above.getBoundingClientRect().bottom + window.scrollY);

    return { from: row, to: row };
  });
}

/**
 * Where the band at the top of every page stands in the document a browser is looking at.
 *
 * It is left out of every comparison, because the board draws six ways into the product and the
 * site draws the two whose page exists. It is the same height on both sides, so what is under it
 * still lines up to the pixel.
 */
export async function theBandAtTheTop(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(page, 'body > div > header', 'band at the top');
}

/**
 * Where the band at the foot of every page stands. It is left out for the reason the band at the
 * top is: the board draws twelve presses and four groups, and the site draws the four presses
 * whose page exists, in three groups.
 */
export async function theBandAtTheFoot(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(page, 'body > div > footer', 'band at the foot');
}

/**
 * Where the band at the head of the home page stands. The board draws a press to Apple's store in
 * it, and Apple has issued no address for the listing, so the site draws the words beside where
 * that press stood and the band is shorter.
 */
export async function theBandOfTheHero(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(page, 'section[aria-labelledby="hero-title"]', 'band at the head');
}

/**
 * Where the card of the forecast stands on the home page. The board writes two days of October
 * 2026 into it and the page counts a week from the day it is drawn for, so the two hold different
 * words in a card whose height the longer sentence can change.
 */
export async function theForecastCard(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(
    page,
    'section[aria-labelledby="forecast-title"] div div div',
    'forecast card',
  );
}

/**
 * Where the one promise of the home page stands. The board promises that her data is always
 * encrypted, and an export is a readable file she holds, so the page says where the encryption
 * happens and what it covers, in a sentence that is longer.
 */
export async function theWordsOfThePromise(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(page, '#privacy-title', 'promise under the band of the founders');
}

/**
 * Where the opening of the page that explains the encryption stands: from the top of the first
 * paragraph to the foot of the last one. The board draws one paragraph there and the page draws a
 * second under it, about the account, the payments and the anonymous reports.
 */
export async function theOpeningOfTheEncryptionPage(page: Page): Promise<ABandToLeaveOut> {
  return await page.evaluate(() => {
    const opens = document.querySelector('main > section:nth-of-type(1) > p');
    const closes = document.querySelector('main > section:nth-of-type(1) > p:last-of-type');

    if (opens === null || closes === null) {
      throw new Error('The document draws no opening paragraph on the encryption page.');
    }

    return {
      from: Math.round(opens.getBoundingClientRect().top + window.scrollY),
      to: Math.round(closes.getBoundingClientRect().bottom + window.scrollY),
    };
  });
}

/**
 * Where the first of the three steps stands: the whole card, not the sentence inside it.
 *
 * The board says she can log a note and there is no note to log yet, so the page names one thing
 * fewer and the sentence is a line shorter. The card is the smallest box that holds every row that
 * differs: on a desktop the three cards stand in one row and the row is as tall as the tallest of
 * them, so the card is the same height on both sides while the design draws a second line of text
 * where the page draws the ground of the card. Leaving out the sentence alone would leave those
 * rows in the comparison and count a height the band never lost.
 */
export async function theFirstStepCard(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(
    page,
    'main > section:nth-of-type(2) > div > div > div:first-child',
    'first of the three steps',
  );
}

/**
 * Where the card that says she holds a recovery code stands, on the dark band. No screen of the
 * application shows her one, so the page carries the badge that says it is designed and not built,
 * and the card is taller than the board's.
 */
export async function theCardOfTheRecoveryCode(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(
    page,
    'main > section:nth-of-type(3) > div > div > div:nth-child(2)',
    'card of the recovery code',
  );
}

/**
 * Where the first of the four limits stands. The board tells her to keep a code, and nothing
 * restores a lost phone yet, so the page tells her to download her data instead.
 */
export async function theFirstLimit(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(
    page,
    'main > section:nth-of-type(4) > div > div:nth-child(2) > div:first-child',
    'first limit',
  );
}

/** Where the band at the end of the home page stands, which draws the second press to the store. */
export async function theBandAtTheEnd(page: Page): Promise<ABandToLeaveOut> {
  return await rowsOfTheFirst(page, 'section[aria-labelledby="end-title"]', 'band at the end');
}

/**
 * Where the band of the two offers stands in the document a browser is looking at.
 *
 * The board draws it, and the site draws it only once the free calculator and the support page
 * exist, because each of its two cards is a press and the sentence explaining the press. A
 * document that holds the band is measured by the band itself, and a document without it reports
 * the row where it would stand and no height, which is the foot of the band above it.
 */
export async function theBandOfTheTwoOffers(page: Page): Promise<ABandToLeaveOut> {
  return await page.evaluate(() => {
    const down = (box: DOMRect): { from: number; to: number } => ({
      from: Math.round(box.top + window.scrollY),
      to: Math.round(box.bottom + window.scrollY),
    });

    const band = document.querySelector('section[aria-labelledby="try-title"]');

    if (band !== null) {
      return down(band.getBoundingClientRect());
    }

    // The band of reviews stands above it on the board. The page draws neither, so the row is the
    // foot of the band above that one, which is the same row the band of reviews reports.
    const above =
      document.querySelector('section[aria-labelledby="reviews-title"]') ??
      document.querySelector('section[aria-labelledby="privacy-title"]');

    if (above === null) {
      throw new Error('The document draws no band above where the two offers would stand.');
    }

    const row = Math.round(above.getBoundingClientRect().bottom + window.scrollY);

    return { from: row, to: row };
  });
}

/**
 * The rows one element of a document occupies, read in the browser rather than written down,
 * because the page and the design are not the same height and the same band therefore sits at two
 * different places down each of them.
 */
async function rowsOfTheFirst(
  page: Page,
  selector: string,
  called: string,
): Promise<ABandToLeaveOut> {
  return await page.evaluate(
    ([selector, called]) => {
      const band = document.querySelector(selector as string);

      if (band === null) {
        throw new Error(`The document draws no ${called as string}.`);
      }

      const box = band.getBoundingClientRect();

      return {
        from: Math.round(box.top + window.scrollY),
        to: Math.round(box.bottom + window.scrollY),
      };
    },
    [selector, called] as const,
  );
}

/**
 * Where the phone stands in the page a browser is looking at: the rows its frame occupies.
 *
 * The board and the page draw the same screenshot in the same frame, and the board crops it to its
 * top edge, which stops part way down a row of the screen. The page pulls the picture up so the
 * frame stops on the rule under that row instead, so the two sides differ inside the frame and
 * nowhere else. The frame is the same height on both, so the rows above it and the rows below it
 * are each still held to the design, pixel for pixel.
 *
 * Read in the browser rather than written down, because the page and the design are not the same
 * height and the frame therefore sits at two different places down the page.
 */
export async function theBandOfThePhone(page: Page): Promise<ABandToLeaveOut> {
  return await page.evaluate(() => {
    const phone = document.querySelector('main img');

    if (phone === null) {
      throw new Error('The page draws no phone under its title.');
    }

    const box = phone.getBoundingClientRect();

    return {
      from: Math.floor(box.top + window.scrollY),
      to: Math.ceil(box.bottom + window.scrollY),
    };
  });
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
