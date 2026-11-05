import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import {
  type ABandToLeaveOut,
  bothOf,
  bothSetsOfBandsOf,
  howMuchOfItMovedOutside,
  howMuchTheBandsGrewBy,
  pictureOf,
  theBandAtTheEnd,
  theBandAtTheFoot,
  theBandAtTheTop,
  theBandOfTheFounders,
  theBandOfTheHero,
  theBandOfTheReviews,
  theBandOfTheTwoOffers,
  theDesignAt,
  theForecastCard,
  theWordsOfThePromise,
} from './theDesignComparison';

/**
 * The approved design, as plain markup beside this suite. It is opened as a file rather than served,
 * because it is a record of a drawing and not a page of the site, and the faces and the pictures it
 * asks for sit next to it.
 */
const theDesign = theDesignAt('home-v2', 'render', 'MainV2.html');

/**
 * The nine parts this comparison leaves out, in the order a reader meets them down the page. Each
 * one is measured in each document, so what stands between them is still held to the board, pixel
 * for pixel.
 *
 * Five of the nine carry a press the site no longer draws, because the page behind it is still to
 * be built or, for the two presses to Apple's store, because Apple has issued no address for the
 * listing. The band of the two offers is nothing but those presses and the sentences explaining
 * them, and one of its two cards offers the support page, which is built, so the page draws that
 * card and not the other.
 *
 * Two are older. The board drew a hole where one of the two founders has since written her note,
 * and it draws a row of reviews that the page holds back until somebody has written one.
 *
 * The last two are sentences version 1 overtook. The card of the forecast names no confidence,
 * because the application names none, and it counts its week from the day it is drawn rather than
 * naming two days of October 2026. And the promise under the band of the founders says that her
 * records are encrypted on her phone, because an export is a readable file she holds. Each of
 * those two is the element that changed and not the band around it, so the rest of both bands is
 * still held to the board.
 */
const theBandsInOrder = [
  'the band at the top',
  'the band at the head of the page',
  'the card of the forecast',
  'the band the two founders sign',
  'the promise',
  'the band of reviews',
  'the band of the two offers',
  'the band at the end',
  'the band at the foot',
] as const;

type TheNameOfABand = (typeof theBandsInOrder)[number];

async function theBandsLeftOut(page: Page): Promise<ABandToLeaveOut[]> {
  return [
    await theBandAtTheTop(page),
    await theBandOfTheHero(page),
    await theForecastCard(page),
    await theBandOfTheFounders(page),
    await theWordsOfThePromise(page),
    await theBandOfTheReviews(page),
    await theBandOfTheTwoOffers(page),
    await theBandAtTheEnd(page),
    await theBandAtTheFoot(page),
  ];
}

/** One of those bands, by its name, so a step reads the band it is about and not a position. */
function theBand(
  bands: readonly ABandToLeaveOut[],
  called: TheNameOfABand,
): { readonly from: number; readonly to: number; readonly tall: number } {
  const band = bands[theBandsInOrder.indexOf(called)];

  if (band === undefined) {
    throw new Error(`${called} was not measured.`);
  }

  return { from: band.from, to: band.to, tall: band.to - band.from };
}

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the home page beside the design the operator approved',
  async ({ page, looking }) => {
    expect(existsSync(theDesign), `The approved design is not at ${theDesign}.`).toBe(true);

    const window = page.viewportSize();

    if (window === null) {
      throw new Error('The browser reported no window size.');
    }

    // Each band is measured while that side is still open, because the measurement is of the
    // document the picture was taken of and the next picture replaces it. The two are kept in the
    // order a reader meets them down the page, which is the order the comparison reads them in.
    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`, window);
    looking.theBandsInTheDesign = await theBandsLeftOut(page);
    looking.atThePage = await pictureOf(page, '/en/', window);
    looking.theBandsOnThePage = await theBandsLeftOut(page);
  },
);

Then(
  'the page she reads is as tall as the design, apart from the nine parts it draws differently',
  ({ looking }) => {
    const { design, page } = bothOf(looking);
    const { inTheDesign, onThePage } = bothSetsOfBandsOf(looking);

    expect(page.width).toBe(design.width);
    expect(onThePage).toHaveLength(theBandsInOrder.length);

    // Every row outside those nine lines up, so the whole of the difference in height is what the
    // nine do: her sentences over the hole the board drew, less the two bands the page does not
    // draw, less the two presses to the store, and whatever the two sentences version 1 rewrote
    // cost in height. A section that went missing or a section somebody added shows up here as it
    // did before.
    expect(page.height - design.height).toBe(howMuchTheBandsGrewBy(inTheDesign, onThePage));

    // The note is taller on the page than the hole on the board, because she wrote more than the
    // hole held.
    expect(theBand(onThePage, 'the band the two founders sign').tall).toBeGreaterThanOrEqual(
      theBand(inTheDesign, 'the band the two founders sign').tall,
    );

    // The band of reviews is a band on the board and no rows at all on the page, which is the
    // whole of what holding it back costs in height.
    expect(theBand(inTheDesign, 'the band of reviews').tall).toBeGreaterThan(0);
    expect(theBand(onThePage, 'the band of reviews').tall).toBe(0);

    // The band of the two offers is on both, with two cards on the board and one on the page. One
    // card is never taller than two: at this width they stand side by side and the band is the
    // same height, and narrower than that they stack and the board is the taller.
    expect(theBand(onThePage, 'the band of the two offers').tall).toBeGreaterThan(0);
    expect(
      theBand(onThePage, 'the band of the two offers').tall >
        theBand(inTheDesign, 'the band of the two offers').tall,
    ).toBe(false);

    // The band at the head of the page draws one press to the store on the board and none on the
    // page, and the band at the end is the same press again, so neither is taller on the page.
    // Neither is always shorter either: at the width of a desktop the ring beside the words is
    // what sets the height of the band at the head, and the press stood in a row under words that
    // are shorter than the ring. What the two bands really cost in height is in the arithmetic
    // above, which holds at every width.
    for (const called of ['the band at the head of the page', 'the band at the end'] as const) {
      expect({
        called,
        taller: theBand(onThePage, called).tall > theBand(inTheDesign, called).tall,
      }).toEqual({ called, taller: false });
    }
  },
);

Then(
  'every part of the page but those nine is the design, to within one pixel in a thousand',
  ({ looking }) => {
    howMuchOfItMovedOutside(looking, 'the-home-page');
  },
);
