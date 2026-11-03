import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import { bothOf, howMuchOfItMoved, pictureOf, theDesignAt } from './theDesignComparison';

/**
 * The approved design of the privacy policy, as plain markup beside this suite. It is opened as a
 * file rather than served, for the reason the other two designs are: it is a record of a drawing
 * and not a page of the site, and the faces and the drawings it asks for sit next to it.
 */
const theDesign = theDesignAt('privacy-policy', 'render', 'Privacy.html');

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the privacy policy beside the design the operator approved',
  async ({ page, looking }) => {
    expect(existsSync(theDesign), `The approved design is not at ${theDesign}.`).toBe(true);

    const window = page.viewportSize();

    if (window === null) {
      throw new Error('The browser reported no window size.');
    }

    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`, window);
    looking.atThePage = await pictureOf(page, '/en/privacy-policy/', window);
  },
);

Then(
  'the privacy policy is as tall as the design, so no section is missing and none was added',
  ({ looking }) => {
    const { design, page } = bothOf(looking);

    expect(page.width).toBe(design.width);
    expect(page.height).toBe(design.height);
  },
);

Then(
  'what she reads before she pays is the design, to within one pixel in a thousand',
  ({ looking }) => {
    howMuchOfItMoved(looking, 'the-privacy-policy');
  },
);
