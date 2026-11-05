import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import {
  type APartOfAPage,
  howMuchOfThePartMoved,
  theDesignAt,
  thePartsHeldAgainstTheDesign,
} from './theDesignComparison';

/**
 * The approved design of the support page, as plain markup beside this suite. It is opened as a
 * file rather than served, for the reason the other three designs are: it is a record of a drawing
 * and not a page of the site, and the faces and the drawings it asks for sit next to it.
 */
const theDesign = theDesignAt('support', 'render', 'Support.html');

/**
 * The part of the page this scenario holds against the board, found by the element that opens it
 * and the element that closes it.
 *
 * The title is what the board still describes. The rest of the page is not: the board draws four
 * cards where the page draws three, it answers the first question with a restore nobody built,
 * and it draws the line that says nothing matched, which the page draws only once a reader has
 * typed a word no question carries. The two bands the whole site shares are out for the reason
 * they are out of the other two comparisons: each drew presses to pages nobody has built yet, so
 * the site holds those presses back and the board still draws them. A comparison of any of those
 * would report the same difference every run, and a comparison nobody can read is a comparison
 * nobody keeps.
 *
 * The box is read in each document rather than given here, because the page is a different height
 * from the board, so the title sits at a different height in each.
 */
const theParts: readonly APartOfAPage[] = [
  { called: 'the-title-of-the-support-page', from: 'main h1', to: 'main h1' },
];

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the support page beside the design the operator approved',
  async ({ page, comparing }) => {
    expect(existsSync(theDesign), `The approved design is not at ${theDesign}.`).toBe(true);

    const window = page.viewportSize();

    if (window === null) {
      throw new Error('The browser reported no window size.');
    }

    comparing.parts.push(
      ...(await thePartsHeldAgainstTheDesign(
        page,
        `file://${theDesign}`,
        '/en/support/',
        window,
        theParts,
      )),
    );
  },
);

Then(
  'the title of the support page she reads is as tall as the title of the design',
  ({ comparing }) => {
    expect(comparing.parts.map((pair) => pair.called)).toEqual(theParts.map((part) => part.called));

    for (const { called, design, page } of comparing.parts) {
      expect({ called, width: page.width, height: page.height }).toEqual({
        called,
        width: design.width,
        height: design.height,
      });
    }
  },
);

Then(
  'the title of the support page is the design, to within one pixel in a thousand',
  ({ comparing }) => {
    for (const pair of comparing.parts) {
      howMuchOfThePartMoved(pair);
    }
  },
);
