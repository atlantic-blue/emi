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
 * The approved design of the page that explains the encryption, as plain markup beside this suite.
 * It is opened as a file rather than served, for the reason the home design is: it is a record of a
 * drawing and not a page of the site, and the faces and the picture it asks for sit next to it.
 */
const theDesign = theDesignAt('protection', 'render', 'Protection.html');

/**
 * The four areas this comparison leaves out, in the order they stand down the page. Each one is
 * found by the same elements in the drawing and in the page, and the board carries no name on any
 * of its bands, so each area is found by where it sits rather than by what it is called.
 *
 * Every one of them is a place version 1 says something the board does not. The opening gains a
 * paragraph about the account, the payments and the reports, which the board was drawn before any
 * of existed. The first step drops the note nobody can write yet. The card that says she holds a
 * recovery code says that it is designed and not built, because no screen of the application shows
 * her one. And the first limit names the export instead of a code, because nothing restores a lost
 * phone yet.
 *
 * Nothing else is left out, and each area is the element that changed rather than the band around
 * it, so the three steps beside the first one and the three limits beside the first one are still
 * held to the drawing, pixel for pixel.
 */
const theAreas: readonly AnAreaOfAPage[] = [
  {
    called: 'the-opening',
    from: 'main > section:nth-of-type(1) > p',
    to: 'main > section:nth-of-type(1) > p:last-of-type',
  },
  {
    called: 'what-she-logs',
    from: 'main > section:nth-of-type(2) > div > div > div:first-child > p',
    to: 'main > section:nth-of-type(2) > div > div > div:first-child > p',
  },
  {
    called: 'the-code-she-holds',
    from: 'main > section:nth-of-type(3) > div > div > div:nth-child(2)',
    to: 'main > section:nth-of-type(3) > div > div > div:nth-child(2)',
  },
  {
    called: 'the-first-limit',
    from: 'main > section:nth-of-type(4) > div > div:nth-child(2) > div:first-child',
    to: 'main > section:nth-of-type(4) > div > div:nth-child(2) > div:first-child',
  },
];

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the privacy page beside the design the operator approved',
  async ({ page, looking }) => {
    expect(existsSync(theDesign), `The approved design is not at ${theDesign}.`).toBe(true);

    const window = page.viewportSize();

    if (window === null) {
      throw new Error('The browser reported no window size.');
    }

    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`, window);
    looking.theAreasInTheDesign.push(...(await theAreasToLeaveOut(page, theAreas)));
    looking.atThePage = await pictureOf(page, '/en/privacy/', window);
    looking.theAreasOnThePage.push(...(await theAreasToLeaveOut(page, theAreas)));
  },
);

Then(
  'the privacy page is as tall as the design, apart from the parts that say what version 1 does',
  ({ looking }) => {
    const { design, page } = bothOf(looking);

    expect(page.width).toBe(design.width);
    expect(page.height - design.height).toBe(howMuchTheAreasGrew(looking));
  },
);

Then(
  'what she reads about the encryption is the design, to within one pixel in a thousand',
  ({ looking }) => {
    howMuchOfItMovedOutsideTheAreas(looking, 'the-privacy-page');
  },
);
