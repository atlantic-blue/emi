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
 * The approved design of the privacy policy, as plain markup beside this suite. It is opened as a
 * file rather than served, for the reason the other two designs are: it is a record of a drawing
 * and not a page of the site, and the faces and the drawings it asks for sit next to it.
 */
const theDesign = theDesignAt('privacy-policy', 'render', 'Privacy.html');

/**
 * The parts of the page this scenario holds against the board, each found by the element that
 * opens it and the element that closes it.
 *
 * The three are what the board still describes. The words between them are version 1 and the board
 * is not: the board has no account section, no payments, no usage, no processors, no retention, no
 * rights and no legal basis, and its three cards name three things Emi no longer does. A
 * comparison of the middle would report that same difference every run, and a comparison nobody
 * can read is a comparison nobody keeps.
 *
 * The box of each part is read in each document rather than given here, because the page is taller
 * than the board, so the band at the foot sits further down it.
 */
const theParts: readonly APartOfAPage[] = [
  { called: 'the-band-at-the-top', from: 'body > div > header', to: 'body > div > header' },
  { called: 'the-title-of-the-policy', from: 'main header h1', to: 'main header p' },
  { called: 'the-band-at-the-foot', from: 'body > div > footer', to: 'body > div > footer' },
];

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the privacy policy beside the design the operator approved',
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
        '/en/privacy-policy/',
        window,
        theParts,
      )),
    );
  },
);

Then('each part of the page she reads is as tall as that part of the design', ({ comparing }) => {
  expect(comparing.parts.map((pair) => pair.called)).toEqual(theParts.map((part) => part.called));

  for (const { called, design, page } of comparing.parts) {
    expect({ called, width: page.width, height: page.height }).toEqual({
      called,
      width: design.width,
      height: design.height,
    });
  }
});

Then('each part is the design, to within one pixel in a thousand', ({ comparing }) => {
  for (const pair of comparing.parts) {
    howMuchOfThePartMoved(pair);
  }
});
