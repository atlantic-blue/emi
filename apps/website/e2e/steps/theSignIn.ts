import { type Page, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { wordsIn } from '../../app/words';
import { THE_SESSION_ENTRY } from '../../lib/theSessionSheHolds';
import { THE_POOL_HOST } from '../../lib/theSignIn';
import { test } from './fixtures';

/**
 * The sign in, driven end to end in a browser.
 *
 * The service is answered by the suite rather than by the live pool, because the pool cannot send
 * an email until steps 28.8 to 28.10 connect it to the sender on myemi.app. Every shape below is
 * one the service documents, and nobody has read a real answer from the live pool with this code.
 *
 * Each scenario ends on what she is left looking at rather than on the call the page made. A page
 * that asked the service correctly and then drew the wrong screen is a page that does not work.
 */

/** The address she types, which is the one the board writes into the second screen. */
const HER_ADDRESS = 'iuliia@example.com';

/** The six digits the suite sends her, which the pool below accepts and nothing else does. */
const THE_CODE_SHE_IS_SENT = '482913';

const words = wordsIn('en');

/** What a pool answers one call with. */
interface AnAnswer {
  readonly status: number;
  readonly said: Record<string, unknown>;
}

/**
 * A pool that sends a code and takes one answer.
 *
 * The address is read as one that already has a user, which is the ordinary case and the one that
 * says the least: the pool answers a new address the same way, so neither the page nor this
 * scenario can tell the two apart.
 */
async function aPoolThatAnswers(page: Page): Promise<void> {
  await page.route(`${THE_POOL_HOST}/**`, async (route) => {
    const call = (route.request().headers()['x-amz-target'] ?? '').split('.').pop();
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      ChallengeResponses?: { EMAIL_OTP_CODE?: string };
    };

    const answers: Record<string, AnAnswer> = {
      SignUp: { status: 400, said: { __type: 'UsernameExistsException' } },
      InitiateAuth: {
        status: 200,
        said: { ChallengeName: 'EMAIL_OTP', Session: 'a-session-the-suite-wrote' },
      },
      RespondToAuthChallenge:
        body.ChallengeResponses?.EMAIL_OTP_CODE === THE_CODE_SHE_IS_SENT
          ? {
              status: 200,
              said: {
                AuthenticationResult: {
                  IdToken: 'an-id-token',
                  AccessToken: 'an-access-token',
                  RefreshToken: 'a-refresh-token',
                },
              },
            }
          : {
              status: 400,
              said: {
                __type: 'CodeMismatchException',
                Session: 'another-session-the-suite-wrote',
              },
            },
    };

    const answer = answers[call ?? ''] ?? {
      status: 400,
      said: { __type: 'InternalErrorException' },
    };

    await route.fulfill({
      status: answer.status,
      contentType: 'application/x-amz-json-1.1',
      body: JSON.stringify(answer.said),
    });
  });
}

const { Given, When, Then } = createBdd(test);

Given('a woman opens the page she signs in on, with a pool that answers', async ({ page }) => {
  await aPoolThatAnswers(page);
  await page.goto('/en/sign-in/');
  await expect(page.locator('#sign-in-address')).toHaveCount(1);
});

Given('a woman with no session opens her account', async ({ page }) => {
  await page.goto('/en/account/');
});

When('she types her address and presses Send code', async ({ page }) => {
  await page.fill('#sign-in-address', HER_ADDRESS);
  await page.getByRole('button', { name: words.signInSendCode }).click();
});

When('she types the six digits and presses Sign in', async ({ page }) => {
  await page.fill('#sign-in-code', THE_CODE_SHE_IS_SENT);
  await page.getByRole('button', { name: words.signInCodeSubmit, exact: true }).click();
});

When('she types a code the pool refuses', async ({ page }) => {
  await page.fill('#sign-in-code', '000000');
  await page.getByRole('button', { name: words.signInCodeSubmit, exact: true }).click();
});

Then(
  'she is left on the box for the six digits, with her address written above it',
  async ({ page }) => {
    await expect(page.locator('#sign-in-code')).toHaveCount(1);
    await expect(page.locator('#sign-in-address')).toHaveCount(0);
    await expect(page.locator('main')).toContainText(HER_ADDRESS);
    await expect(page.locator('main')).toContainText(words.signInCodeLasts);
  },
);

/**
 * The words that would give it away. The pool answers a new address and a known one the same way,
 * so the page has to say the same thing for both, and a sentence carrying one of these would be
 * the one place a reader could tell which she was.
 *
 * Whole words, because "new" is part of "Send a new code" and that press says nothing about her.
 */
const theWordsThatWouldGiveItAway = [
  /\balready\b/,
  /\bexisting\b/,
  /\bunknown\b/,
  /not found/,
  /new account/,
  /no account/,
];

Then('the page never says whether that address had an account', async ({ page }) => {
  const said = ((await page.locator('main').textContent()) ?? '').toLowerCase();

  expect(said.length).toBeGreaterThan(0);

  for (const telling of theWordsThatWouldGiveItAway) {
    expect({ telling: telling.source, said: telling.test(said) }).toEqual({
      telling: telling.source,
      said: false,
    });
  }

  // The reading is a reading and not an empty string: a word that would give it away is found
  // when it is there.
  expect(
    theWordsThatWouldGiveItAway.some((telling) => telling.test('that address already has one')),
  ).toBe(true);
});

Then('she is left on her account, holding a session no cookie carries', async ({ page }) => {
  await page.waitForURL('**/en/account/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(words.accountTitle);
  await expect(page.locator('main')).toContainText(words.accountRecordsStayOnYourPhone);
  await expect(page.getByRole('button', { name: words.accountSignOut })).toHaveCount(1);

  const held = await page.evaluate(
    (entry) => ({
      inTheTab: window.sessionStorage.getItem(entry),
      acrossTabs: window.localStorage.getItem(entry),
      inACookie: document.cookie,
    }),
    THE_SESSION_ENTRY,
  );

  expect(JSON.parse(held.inTheTab ?? 'null')).toEqual({
    idToken: 'an-id-token',
    accessToken: 'an-access-token',
    refreshToken: 'a-refresh-token',
  });
  expect(held.acrossTabs).toBeNull();
  expect(held.inACookie).not.toContain('an-id-token');
  expect(held.inACookie).not.toContain('a-refresh-token');
});

Then(
  'she is left on the box for the six digits, reading that the code is not right',
  async ({ page }) => {
    await expect(page.locator('#sign-in-code')).toHaveCount(1);
    // The one inside the page. The framework keeps an empty one of its own at the foot of every
    // document, to read a change of address out to her.
    await expect(page.locator('main').getByRole('alert')).toHaveText(words.signInCodeIsWrong);
    expect(new URL(page.url()).pathname).toBe('/en/sign-in/');
  },
);

Then(
  'she can ask for another code, and she can go back and use another address',
  async ({ page }) => {
    await expect(page.getByRole('button', { name: words.signInSendANewCode })).toHaveCount(1);
    await page.getByRole('button', { name: words.signInUseAnotherAddress }).click();

    await expect(page.locator('#sign-in-address')).toHaveCount(1);
    await expect(page.locator('#sign-in-code')).toHaveCount(0);
    await expect(page.locator('main')).toContainText(words.signInWeSendACode);
  },
);

Then('she is left on the page she signs in on', async ({ page }) => {
  await page.waitForURL('**/en/sign-in/');

  await expect(page.locator('#sign-in-address')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(words.signInTitle);
});
