import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import {
  bothOf,
  bothSetsOfBandsOf,
  howMuchOfItMovedOutside,
  pictureOf,
  theBandOfThePhone,
  theDesignAt,
} from './theDesignComparison';

/**
 * The approved design of the page that explains the encryption, as plain markup beside this suite.
 * It is opened as a file rather than served, for the reason the home design is: it is a record of a
 * drawing and not a page of the site, and the faces and the picture it asks for sit next to it.
 */
const theDesign = theDesignAt('protection', 'render', 'Protection.html');

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the privacy page beside the design the operator approved',
  async ({ page, looking }) => {
    expect(existsSync(theDesign), `The approved design is not at ${theDesign}.`).toBe(true);

    const window = page.viewportSize();

    if (window === null) {
      throw new Error('The browser reported no window size.');
    }

    // One band is left out of this page, the frame the phone sits in. The comparison reads a
    // list of them, because the home page leaves out two, so this one is a list of one.
    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`, window);
    looking.theBandsInTheDesign = [await theBandOfThePhone(page)];
    looking.atThePage = await pictureOf(page, '/en/privacy/', window);
    looking.theBandsOnThePage = [await theBandOfThePhone(page)];
  },
);

Then(
  'the privacy page is as tall as the design, so no section is missing and none was added',
  ({ looking }) => {
    const { design, page } = bothOf(looking);
    const { inTheDesign, onThePage } = bothSetsOfBandsOf(looking);
    const [drawn] = inTheDesign;
    const [built] = onThePage;

    expect(page.width).toBe(design.width);
    expect(page.height).toBe(design.height);

    // The frame the phone sits in is one size, set in both, so a crop that moved what is inside it
    // cannot have moved anything around it.
    expect((built?.to ?? 0) - (built?.from ?? 0)).toBe((drawn?.to ?? 0) - (drawn?.from ?? 0));
  },
);

Then(
  'what she reads about the encryption is the design, outside the phone, to within one pixel in a thousand',
  ({ looking }) => {
    howMuchOfItMovedOutside(looking, 'the-privacy-page');
  },
);
