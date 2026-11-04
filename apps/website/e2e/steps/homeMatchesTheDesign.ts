import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import {
  type AnAreaOfAPage,
  bothOf,
  howMuchOfItMovedOutsideTheAreas,
  howMuchTheAreasGrew,
  pictureOf,
  theAreasToLeaveOut,
  theDesignAt,
} from './theDesignComparison';

/**
 * The approved design, as plain markup beside this suite. It is opened as a file rather than served,
 * because it is a record of a drawing and not a page of the site, and the faces and the pictures it
 * asks for sit next to it.
 */
const theDesign = theDesignAt('home-v2', 'render', 'MainV2.html');

/**
 * The four areas this comparison leaves out, in the order they stand down the page. Each one is
 * found by the same elements in the drawing and in the page, so the comparison reads the same part
 * of the page on both sides however far down it has moved.
 *
 * The note is a hole in the board and 46 words on the page. The other three are sentences version 1
 * overtook: the hero no longer promises that her data is always encrypted, because an export is a
 * readable file she holds; the card no longer names a confidence, because the application names
 * none, and it counts its week from the day it is drawn rather than naming October 2026; and the
 * promise of the band below says where the encryption happens.
 *
 * Nothing else is left out. Everything between these four areas is still held to the drawing, pixel
 * for pixel, and each area is one element rather than the band around it.
 */
const theAreas: readonly AnAreaOfAPage[] = [
  {
    called: 'the-line-under-the-headline',
    from: 'section[aria-labelledby="hero-title"] p',
    to: 'section[aria-labelledby="hero-title"] p',
  },
  {
    called: 'the-forecast-card',
    from: 'section[aria-labelledby="forecast-title"] div div div',
    to: 'section[aria-labelledby="forecast-title"] div div div',
  },
  {
    called: 'the-note-of-the-founders',
    from: 'section[aria-labelledby="note-title"] blockquote',
    to: 'section[aria-labelledby="note-title"]',
  },
  { called: 'the-promise', from: '#privacy-title', to: '#privacy-title' },
];

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the home page beside the design the operator approved',
  async ({ page, looking }) => {
    expect(existsSync(theDesign), `The approved design is not at ${theDesign}.`).toBe(true);

    const window = page.viewportSize();

    if (window === null) {
      throw new Error('The browser reported no window size.');
    }

    // Each area is measured while that side is still open, because the measurement is of the
    // document the picture was taken of and the next picture replaces it.
    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`, window);
    looking.theAreasInTheDesign.push(...(await theAreasToLeaveOut(page, theAreas)));
    looking.atThePage = await pictureOf(page, '/en/', window);
    looking.theAreasOnThePage.push(...(await theAreasToLeaveOut(page, theAreas)));
  },
);

Then(
  'the page she reads is as tall as the design, apart from the parts that no longer match it',
  ({ looking }) => {
    const { design, page } = bothOf(looking);

    expect(page.width).toBe(design.width);

    // Every row outside those four areas lines up, so the whole of the difference in height is
    // what those areas grew by. A section that went missing or a section somebody added shows up
    // here as it did when one band was left out.
    expect(page.height - design.height).toBe(howMuchTheAreasGrew(looking));
  },
);

Then(
  'every part of the page the board still describes is the design, to within one pixel in a thousand',
  ({ looking }) => {
    howMuchOfItMovedOutsideTheAreas(looking, 'the-home-page');
  },
);
