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
 * The approved design of the page that explains the encryption, as plain markup beside this suite.
 * It is opened as a file rather than served, for the reason the home design is: it is a record of a
 * drawing and not a page of the site, and the faces and the picture it asks for sit next to it.
 */
const theDesign = theDesignAt('protection', 'render', 'Protection.html');

/**
 * What this scenario holds against the board: everything the page itself says, which is everything
 * between the two bands the whole site shares.
 *
 * Those two bands are left out. Each of them drew presses to pages nobody has built yet, so the
 * site holds those presses back and the board still draws them: the band at the top drew six ways
 * into the product and draws the two whose page exists, and the band at the foot drew twelve
 * presses and draws the four whose page exists. A comparison of either would report the same
 * difference every run, and a comparison nobody can read is a comparison nobody keeps. The words
 * and the presses of both bands are read in features/website, in all three languages.
 *
 * The box is read in each document rather than given here, because the band at the foot is shorter
 * on the page than on the board, which makes the page shorter.
 */
const thePageItself: readonly APartOfAPage[] = [
  {
    called: 'the-page-about-the-encryption',
    from: 'body > div > main',
    to: 'body > div > main',
  },
];

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the privacy page beside the design the operator approved',
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
        '/en/privacy/',
        window,
        thePageItself,
      )),
    );
  },
);

Then(
  'what the page says about the encryption is as tall as the design, so no section is missing and none was added',
  ({ comparing }) => {
    expect(comparing.parts.map((pair) => pair.called)).toEqual(
      thePageItself.map((part) => part.called),
    );

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
  'what she reads about the encryption is the design, to within one pixel in a thousand',
  ({ comparing }) => {
    for (const pair of comparing.parts) {
      howMuchOfThePartMoved(pair);
    }
  },
);
