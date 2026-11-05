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
 * The parts of the page this scenario holds against the board, each found by the element that
 * opens it and the element that closes it.
 *
 * The three are what the board still describes. The middle is not: the board draws four cards
 * where the page draws three, it answers the first question with a restore nobody built, and it
 * draws the line that says nothing matched, which the page draws only once a reader has typed a
 * word no question carries.
 *
 * The box of each part is read in each document rather than given here, because the page is a
 * different height from the board, so the band at the foot sits further down one of them.
 */
const theParts: readonly APartOfAPage[] = [
  { called: 'the-band-at-the-top', from: 'body > div > header', to: 'body > div > header' },
  { called: 'the-title-of-the-support-page', from: 'main h1', to: 'main h1' },
  { called: 'the-band-at-the-foot', from: 'body > div > footer', to: 'body > div > footer' },
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
  'each part of the support page she reads is as tall as that part of the design',
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
  'each part of the support page is the design, to within one pixel in a thousand',
  ({ comparing }) => {
    for (const pair of comparing.parts) {
      howMuchOfThePartMoved(pair);
    }
  },
);
