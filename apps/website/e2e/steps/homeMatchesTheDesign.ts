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
 * The approved design, as plain markup beside this suite. It is opened as a file rather than served,
 * because it is a record of a drawing and not a page of the site, and the faces and the pictures it
 * asks for sit next to it.
 */
const theDesign = theDesignAt('home-v2', 'render', 'MainV2.html');

/**
 * The bands of the page this scenario holds against the board, each found by the heading it names
 * itself to her software by.
 *
 * These five are what the board still describes. Four bands and the two frames around them are
 * left out, and each one is left out for the same reason: it carries a press whose page nobody has
 * built yet, so the page does not draw that press and the board does. A comparison that read those
 * bands would report the same difference every run, and a comparison nobody can read is a
 * comparison nobody keeps.
 *
 * What is left out, in the order she meets it. The band at the top, which drew six ways into the
 * product and now draws the two whose page exists. The band at the head of the page, which drew
 * the press to Apple's store before Apple issued an address for the listing. The band the two
 * founders sign, where the board drew a hole and one of them has since written her note. The band
 * of the two offers, which was a press to the calculator and a press to support and the sentence
 * explaining each, so it is not drawn at all. The band at the end, which drew the second press to
 * the store. And the band at the foot, which drew twelve presses and now draws the four whose page
 * exists.
 *
 * The box of each band is read in each document rather than given here, because the page is
 * shorter than the board, so a band sits further up it.
 */
const theBands: readonly APartOfAPage[] = [
  {
    called: 'the-band-of-the-forecast',
    from: 'section[aria-labelledby="forecast-title"]',
    to: 'section[aria-labelledby="forecast-title"]',
  },
  {
    called: 'the-band-of-the-four-phases',
    from: 'section[aria-labelledby="learn-title"]',
    to: 'section[aria-labelledby="learn-title"]',
  },
  {
    called: 'the-band-of-the-community',
    from: 'section[aria-labelledby="community-title"]',
    to: 'section[aria-labelledby="community-title"]',
  },
  {
    called: 'the-band-that-offers-the-privacy-page',
    from: 'section[aria-labelledby="privacy-title"]',
    to: 'section[aria-labelledby="privacy-title"]',
  },
  {
    called: 'the-row-of-reviews',
    from: 'section[aria-labelledby="reviews-title"]',
    to: 'section[aria-labelledby="reviews-title"]',
  },
];

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the home page beside the design the operator approved',
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
        '/en/',
        window,
        theBands,
      )),
    );
  },
);

Then('each band the board still draws is as tall as that band of the design', ({ comparing }) => {
  expect(comparing.parts.map((pair) => pair.called)).toEqual(theBands.map((band) => band.called));

  for (const { called, design, page } of comparing.parts) {
    expect({ called, width: page.width, height: page.height }).toEqual({
      called,
      width: design.width,
      height: design.height,
    });
  }
});

Then('each of those bands is the design, to within one pixel in a thousand', ({ comparing }) => {
  for (const pair of comparing.parts) {
    howMuchOfThePartMoved(pair);
  }
});
