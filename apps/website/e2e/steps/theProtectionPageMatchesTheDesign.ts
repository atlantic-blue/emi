import { existsSync } from 'node:fs';

import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import {
  type ABandToLeaveOut,
  bothOf,
  bothSetsOfBandsOf,
  howMuchOfItMovedOutside,
  howMuchTheBandsGrewBy,
  pictureOf,
  theBandAtTheFoot,
  theBandAtTheTop,
  theBandOfThePhone,
  theCardOfTheRecoveryCode,
  theDesignAt,
  theFirstLimit,
  theFirstStepCard,
  theOpeningOfTheEncryptionPage,
} from './theDesignComparison';

/**
 * The approved design of the page that explains the encryption, as plain markup beside this suite.
 * It is opened as a file rather than served, for the reason the home design is: it is a record of a
 * drawing and not a page of the site, and the faces and the picture it asks for sit next to it.
 */
const theDesign = theDesignAt('protection', 'render', 'Protection.html');

/**
 * The seven parts this comparison leaves out, in the order a reader meets them down the page.
 *
 * Three of them are not about the words. The two bands the whole site shares are left out because
 * the board draws every press of them and the site draws the presses whose page exists. The frame
 * the phone sits in is left out because the board crops the screenshot to its top edge and the
 * page pulls it up to the rule under that row.
 *
 * The other four are places version 1 says something the board does not. The opening gains a
 * paragraph about the account, the payments and the reports. The first of the three steps drops
 * the note nobody can write yet. The card that says she holds a recovery code says that it is
 * designed and not built, because no screen of the application shows her one. And the first limit
 * names the export instead of a code, because nothing restores a lost phone yet.
 *
 * Each of those four is the smallest box that holds every row that differs, and not the band
 * around it, so the two steps beside the first one and the three limits beside the first one are
 * still held to the drawing.
 */
async function theBandsLeftOut(page: Page): Promise<ABandToLeaveOut[]> {
  return [
    await theBandAtTheTop(page),
    await theOpeningOfTheEncryptionPage(page),
    await theBandOfThePhone(page),
    await theFirstStepCard(page),
    await theCardOfTheRecoveryCode(page),
    await theFirstLimit(page),
    await theBandAtTheFoot(page),
  ];
}

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the privacy page beside the design the operator approved',
  async ({ page, looking }) => {
    expect(existsSync(theDesign), `The approved design is not at ${theDesign}.`).toBe(true);

    const window = page.viewportSize();

    if (window === null) {
      throw new Error('The browser reported no window size.');
    }

    // Each band is measured while that side is still open, because the measurement is of the
    // document the picture was taken of and the next picture replaces it.
    looking.atTheDesign = await pictureOf(page, `file://${theDesign}`, window);
    looking.theBandsInTheDesign = await theBandsLeftOut(page);
    looking.atThePage = await pictureOf(page, '/en/privacy/', window);
    looking.theBandsOnThePage = await theBandsLeftOut(page);
  },
);

Then(
  'the privacy page is as tall as the design, apart from the seven parts it draws differently',
  ({ looking }) => {
    const { design, page } = bothOf(looking);
    const { inTheDesign, onThePage } = bothSetsOfBandsOf(looking);
    const [, , drawnPhone] = inTheDesign;
    const [, , builtPhone] = onThePage;

    expect(page.width).toBe(design.width);
    expect(onThePage).toHaveLength(7);

    // The band at the foot draws twelve presses on the board and four on the page, so it is
    // shorter, and the four parts that say what version 1 does are taller or shorter by what they
    // say. Between them that is the whole of the difference in height. Every other row lines up.
    expect(page.height - design.height).toBe(howMuchTheBandsGrewBy(inTheDesign, onThePage));

    // The frame the phone sits in is one size, set in both, so a crop that moved what is inside it
    // cannot have moved anything around it.
    expect((builtPhone?.to ?? 0) - (builtPhone?.from ?? 0)).toBe(
      (drawnPhone?.to ?? 0) - (drawnPhone?.from ?? 0),
    );
  },
);

Then(
  'what she reads about the encryption is the design, outside those parts, to within one pixel in a thousand',
  ({ looking }) => {
    howMuchOfItMovedOutside(looking, 'the-privacy-page');
  },
);
