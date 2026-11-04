import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import {
  bothOf,
  bothBandsOf,
  howMuchOfItMovedOutside,
  pictureOf,
  theBandOfTheFounders,
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
    // document the picture was taken of and the next picture replaces it.
    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`, window);
    looking.theBandInTheDesign = await theBandOfTheFounders(page);
    looking.atThePage = await pictureOf(page, '/en/', window);
    looking.theBandOnThePage = await theBandOfTheFounders(page);
  },
);

Then(
  'the page she reads is as tall as the design, apart from the note one founder has written',
  ({ looking }) => {
    const { design, page } = bothOf(looking);
    const { inTheDesign, onThePage } = bothBandsOf(looking);

    expect(page.width).toBe(design.width);

    // Every row outside that one band lines up, so the whole of the difference in height is the
    // height her sentences take over the hole the board drew. A section that went missing or a
    // section somebody added shows up here as it did before.
    const grewBy = onThePage.to - onThePage.from - (inTheDesign.to - inTheDesign.from);

    expect(page.height - design.height).toBe(grewBy);
    expect(grewBy).toBeGreaterThanOrEqual(0);
  },
);

Then(
  'every band but the one the two founders sign is the design, to within one pixel in a thousand',
  ({ looking }) => {
    howMuchOfItMovedOutside(looking, 'the-home-page');
  },
);
