import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import { bothOf, howMuchOfItMoved, pictureOf, theDesignAt } from './theDesignComparison';

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

    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`, window);
    looking.atThePage = await pictureOf(page, '/en/', window);
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
  howMuchOfItMoved(looking, 'the-home-page');
});
