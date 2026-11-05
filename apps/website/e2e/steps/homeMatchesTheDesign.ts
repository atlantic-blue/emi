import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import {
  bothOf,
  bothSetsOfBandsOf,
  howMuchOfItMovedOutside,
  howMuchTheBandsGrewBy,
  pictureOf,
  theBandOfTheFounders,
  theBandOfTheReviews,
  theDesignAt,
} from './theDesignComparison';

/**
 * The approved design, as plain markup beside this suite. It is opened as a file rather than served,
 * because it is a record of a drawing and not a page of the site, and the faces and the pictures it
 * asks for sit next to it.
 */
const theDesign = theDesignAt('home-v2', 'render', 'MainV2.html');

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
    looking.theBandsInTheDesign = [
      await theBandOfTheFounders(page),
      await theBandOfTheReviews(page),
    ];
    looking.atThePage = await pictureOf(page, '/en/', window);
    looking.theBandsOnThePage = [await theBandOfTheFounders(page), await theBandOfTheReviews(page)];
  },
);

Then(
  'the page she reads is as tall as the design, apart from the note one founder has written and the band of reviews it does not draw',
  ({ looking }) => {
    const { design, page } = bothOf(looking);
    const { inTheDesign, onThePage } = bothSetsOfBandsOf(looking);
    const [theNote, theReviews] = onThePage;
    const [theHole, theBandOnTheBoard] = inTheDesign;

    expect(page.width).toBe(design.width);

    // Every row outside those two bands lines up, so the whole of the difference in height is the
    // height her sentences take over the hole the board drew, less the band of reviews the page
    // does not draw. A section that went missing or a section somebody added shows up here as it
    // did before.
    expect(page.height - design.height).toBe(howMuchTheBandsGrewBy(inTheDesign, onThePage));

    // The note is taller on the page than the hole on the board, because she wrote more than the
    // hole held.
    expect((theNote?.to ?? 0) - (theNote?.from ?? 0)).toBeGreaterThanOrEqual(
      (theHole?.to ?? 0) - (theHole?.from ?? 0),
    );

    // And the band of reviews is a band on the board and no rows at all on the page, which is the
    // whole of what hiding it costs in height.
    expect((theBandOnTheBoard?.to ?? 0) - (theBandOnTheBoard?.from ?? 0)).toBeGreaterThan(0);
    expect(theReviews?.to).toBe(theReviews?.from);
  },
);

Then(
  'every band but the one the two founders sign and the one with no reviews in it is the design, to within one pixel in a thousand',
  ({ looking }) => {
    howMuchOfItMovedOutside(looking, 'the-home-page');
  },
);
