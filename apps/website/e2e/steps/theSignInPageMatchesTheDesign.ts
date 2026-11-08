import { existsSync } from 'node:fs';

import { type Page, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { THE_SESSION_ENTRY } from '../../lib/theSessionSheHolds';
import { THE_POOL_HOST } from '../../lib/theSignIn';
import { test } from './fixtures';
import {
  type APartOfAPage,
  howMuchOfThePartMoved,
  theDesignAt,
  thePartsHeldAgainstTheDesign,
} from './theDesignComparison';

/**
 * The approved design of the sign in page, as plain markup beside this suite. Each board is opened
 * as a file rather than served, for the reason the other four designs are: it is a record of a
 * drawing and not a page of the site, and the faces and the drawings it asks for sit next to it.
 */
const theDesignOf = (board: string): string => theDesignAt('sign-in', 'render', `${board}.html`);

/** The address she types, which is the address the board writes into the second screen. */
const THE_ADDRESS_THE_BOARD_WRITES = 'iuliia@example.com';

/**
 * The parts of the sign in page held against the board, found by the element that opens each one
 * and the element that closes it.
 *
 * The whole page is read in parts rather than in one picture, because the board draws a third way
 * in that the page holds back: Telegram waits for a sign in of its own. Each part is measured in
 * its own document, so the rows that held back press would have taken do not move anything into
 * the comparison.
 *
 * The two presses are found by their place after the line under the title rather than by the
 * element they are made of. The board draws a press as a link, because a canvas has nowhere to go,
 * and the page draws it as a button, because a press that leaves for Apple is not an address a
 * reader may copy. The place is the same in both.
 *
 * The box of each part is read in each document rather than given here, because the page is a
 * different height from the board, so the same part sits at a different height in each.
 */
const theParts: readonly APartOfAPage[] = [
  {
    called: 'the-mark-on-the-sign-in-page',
    from: 'main > *:first-child',
    to: 'main > *:first-child',
  },
  { called: 'the-title-of-the-sign-in-page', from: 'main h1', to: 'main h1' },
  { called: 'the-line-under-the-title', from: 'main h1 + p', to: 'main h1 + p' },
  {
    called: 'the-press-that-signs-her-in-with-apple',
    from: 'main h1 + p + *',
    to: 'main h1 + p + *',
  },
  {
    called: 'the-press-that-signs-her-in-with-google',
    from: 'main h1 + p + * + *',
    to: 'main h1 + p + * + *',
  },
  { called: 'the-form-of-the-sign-in-page', from: 'main form', to: 'main form' },
  { called: 'what-the-account-holds', from: 'main form ~ div', to: 'main form ~ div' },
];

/** The head of her account, which is every part of that board the page builds. */
const theHeadOfTheAccount: readonly APartOfAPage[] = [
  { called: 'the-head-of-the-account', from: 'main header', to: 'main header' },
];

/**
 * The pool, answering the way the service documents.
 *
 * The real pool cannot send an email until steps 28.8 to 28.10 connect it to the sender, so a run
 * against it would prove that an email did not arrive and nothing else. The two calls a press of
 * "Send code" makes are answered here instead: the first says the address already has a user,
 * which is the ordinary case, and the second hands back the challenge and a session.
 */
async function aPoolThatAnswers(page: Page): Promise<void> {
  await page.route(`${THE_POOL_HOST}/**`, async (route) => {
    const call = (route.request().headers()['x-amz-target'] ?? '').split('.').pop();
    const signingUp = call === 'SignUp';

    await route.fulfill({
      status: signingUp ? 400 : 200,
      contentType: 'application/x-amz-json-1.1',
      body: JSON.stringify(
        signingUp
          ? { __type: 'UsernameExistsException' }
          : { ChallengeName: 'EMAIL_OTP', Session: 'a-session-the-suite-wrote' },
      ),
    });
  });
}

/** A session, written into the browser before her account loads, because the page reads it there. */
async function aSessionSheIsHolding(page: Page): Promise<void> {
  await page.addInitScript(
    ([entry, held]) => {
      window.sessionStorage.setItem(entry as string, held as string);
    },
    [
      THE_SESSION_ENTRY,
      JSON.stringify({
        idToken: 'a-token-the-suite-wrote',
        accessToken: 'a-token-the-suite-wrote',
        refreshToken: 'a-token-the-suite-wrote',
      }),
    ] as const,
  );
}

/** The window this run was given, which every picture of both documents is taken at. */
function theWindowOf(page: Page): { width: number; height: number } {
  const window = page.viewportSize();

  if (window === null) {
    throw new Error('The browser reported no window size.');
  }

  return window;
}

const { Given, Then } = createBdd(test);

Given(
  'a woman opens the page she signs in on beside the design the operator approved',
  async ({ page, comparing }) => {
    const design = theDesignOf('SignIn');

    expect(existsSync(design), `The approved design is not at ${design}.`).toBe(true);

    comparing.parts.push(
      ...(await thePartsHeldAgainstTheDesign(
        page,
        `file://${design}`,
        '/en/sign-in/',
        theWindowOf(page),
        theParts,
      )),
    );
  },
);

Given(
  'a woman presses Send code beside the design the operator approved',
  async ({ page, comparing }) => {
    const design = theDesignOf('SignInCode');

    expect(existsSync(design), `The approved design is not at ${design}.`).toBe(true);

    await aPoolThatAnswers(page);

    comparing.parts.push(
      ...(await thePartsHeldAgainstTheDesign(
        page,
        `file://${design}`,
        '/en/sign-in/',
        theWindowOf(page),
        theParts,
        async (looking) => {
          await looking.fill('#sign-in-address', THE_ADDRESS_THE_BOARD_WRITES);
          await looking.getByRole('button', { name: 'Send code' }).click();
          await looking.waitForSelector('#sign-in-code');
        },
      )),
    );
  },
);

Given(
  'a woman opens her account beside the design the operator approved',
  async ({ page, comparing }) => {
    const design = theDesignOf('Profile');

    expect(existsSync(design), `The approved design is not at ${design}.`).toBe(true);

    await aSessionSheIsHolding(page);

    comparing.parts.push(
      ...(await thePartsHeldAgainstTheDesign(
        page,
        `file://${design}`,
        '/en/account/',
        theWindowOf(page),
        theHeadOfTheAccount,
      )),
    );
  },
);

Then(
  'each part of the sign in page she reads is as tall as the same part of the design',
  ({ comparing }) => {
    // A reading that took no picture reports the same as a page that is the design, so the count
    // is part of the reading.
    expect(comparing.parts.length).toBeGreaterThan(0);

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
  'each part of the sign in page is the design, to within one pixel in a thousand',
  ({ comparing }) => {
    for (const pair of comparing.parts) {
      howMuchOfThePartMoved(pair);
    }
  },
);
