import { type Page, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { wordsIn } from '../../app/words';
import {
  THE_SIGN_IN_HOST,
  WHAT_SHE_STARTED_ENTRY,
  WHERE_SHE_COMES_BACK_TO,
} from '../../lib/theProviderSignIn';
import { THE_SESSION_ENTRY } from '../../lib/theSessionSheHolds';
import { THE_POOL_HOST } from '../../lib/theSignIn';
import { test } from './fixtures';

/**
 * A sign in with Apple and a sign in with Google, driven end to end in a browser.
 *
 * The pool is answered by the suite. No run of this suite holds a credential of either company,
 * because each one is in the parameter store of the account, so a press against the live pool
 * would prove that a credential is not registered yet and nothing else. Every shape below is one
 * the service documents.
 *
 * The authorize address is answered the way the whole trip ends: with a move back to the page the
 * press named, carrying a code and the state. What Apple and Google do in between is their own
 * page, which no suite of Emi can drive and no code of Emi can see.
 */

/** The code the pool sends her back with, which the exchange below is the only reader of. */
const THE_CODE_SHE_COMES_BACK_WITH = 'a-code-the-suite-wrote';

/** What a state looks like when another browser wrote it, which this one must refuse. */
const A_STATE_SHE_NEVER_WROTE = 'a-state-another-browser-wrote';

const words = wordsIn('en');

/** What one scenario watched the browser do, so a step can read it afterwards. */
interface WhatTheBrowserDid {
  /** Every address the press left for, in the order she pressed. */
  readonly leftFor: string[];
  /** Every exchange the return page asked for, as the body it sent. */
  readonly exchanged: string[];
  /** The state to hand back, which is the one the press wrote unless a step says otherwise. */
  stateToHandBack: string | null;
}

const watched = new WeakMap<Page, WhatTheBrowserDid>();

function whatTheBrowserDid(page: Page): WhatTheBrowserDid {
  const read = watched.get(page);

  if (read === undefined) {
    throw new Error('Nothing watched this browser, so there is nothing to read.');
  }

  return read;
}

/**
 * A pool that sends her to the provider, hands a code back, and exchanges it for her tokens.
 *
 * The move back to the page she came from is the whole of what Apple and Google do: the company
 * asks her, the pool reads its answer, and the pool returns her to the address the press named.
 */
async function aPoolThatAnswersAProvider(page: Page): Promise<void> {
  const did: WhatTheBrowserDid = { leftFor: [], exchanged: [], stateToHandBack: null };

  watched.set(page, did);

  await page.route(`${THE_SIGN_IN_HOST}/oauth2/authorize**`, async (route) => {
    const asked = new URL(route.request().url());

    did.leftFor.push(asked.toString());

    const back = new URL(asked.searchParams.get('redirect_uri') ?? '');

    back.searchParams.set('code', THE_CODE_SHE_COMES_BACK_WITH);
    back.searchParams.set(
      'state',
      did.stateToHandBack ?? asked.searchParams.get('state') ?? 'nothing at all',
    );

    await route.fulfill({ status: 302, headers: { location: back.toString() } });
  });

  await page.route(`${THE_SIGN_IN_HOST}/oauth2/token`, async (route) => {
    did.exchanged.push(route.request().postData() ?? '');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id_token: 'an-id-token',
        access_token: 'an-access-token',
        refresh_token: 'a-refresh-token',
      }),
    });
  });

  // The sign out asks the pool to revoke the token that outlives the window, which is the one call
  // this sign in makes to the other host.
  await page.route(`${THE_POOL_HOST}/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/x-amz-json-1.1',
      body: JSON.stringify({}),
    });
  });
}

/** What her browser is holding, read in the browser, because that is the only place it is. */
async function whatSheIsHolding(page: Page): Promise<{
  session: string | null;
  started: string | null;
  cookie: string;
}> {
  return await page.evaluate(
    ([session, started]) => ({
      session: window.sessionStorage.getItem(session as string),
      started: window.sessionStorage.getItem(started as string),
      cookie: document.cookie,
    }),
    [THE_SESSION_ENTRY, WHAT_SHE_STARTED_ENTRY] as const,
  );
}

const { Given, When, Then } = createBdd(test);

Given(
  'a woman opens the page she signs in on, with a pool that answers a provider',
  async ({ page }) => {
    await aPoolThatAnswersAProvider(page);
    await page.goto('/en/sign-in/');
    await expect(page.getByRole('button', { name: words.signInApple })).toHaveCount(1);
  },
);

/**
 * A browser with no cryptography of its own, which is what a page served over a plain connection
 * gets. The press cannot make a digest there, so it cannot start a sign in it could finish.
 */
Given('a browser that cannot make a digest', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, 'subtle', { get: () => undefined });
  });
});

Given('the pool will answer with a state her browser never wrote', ({ page }) => {
  whatTheBrowserDid(page).stateToHandBack = A_STATE_SHE_NEVER_WROTE;
});

When('she presses {string}', async ({ page }, press: string) => {
  await page.getByRole('button', { name: press }).click();
});

When('she presses Sign out', async ({ page }) => {
  await page.getByRole('button', { name: words.accountSignOut }).click();
});

Then(
  'she leaves for {string} with a value nobody can guess and a digest',
  async ({ page }, provider: string) => {
    await expect
      .poll(() => whatTheBrowserDid(page).leftFor.length, { timeout: 5000 })
      .toBeGreaterThan(0);

    const left = new URL(whatTheBrowserDid(page).leftFor[0] ?? '');

    // Straight to the company she pressed. A press that left the provider out would land her on a
    // page of the pool asking her again which one she meant.
    expect(left.searchParams.get('identity_provider')).toBe(provider);
    expect(left.searchParams.get('response_type')).toBe('code');
    expect(left.searchParams.get('scope')).toBe('openid email');
    expect(left.searchParams.get('code_challenge_method')).toBe('S256');
    expect((left.searchParams.get('state') ?? '').length).toBeGreaterThan(20);
    expect((left.searchParams.get('code_challenge') ?? '').length).toBeGreaterThan(20);
    expect(left.searchParams.get('redirect_uri')).toContain(`/en/${WHERE_SHE_COMES_BACK_TO}`);
  },
);

Then('she comes back signed in, and is left on her account', async ({ page }) => {
  await page.waitForURL('**/en/account/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(words.accountTitle);
  await expect(page.getByRole('button', { name: words.accountSignOut })).toHaveCount(1);

  const holding = await whatSheIsHolding(page);

  expect(JSON.parse(holding.session ?? 'null')).toEqual({
    idToken: 'an-id-token',
    accessToken: 'an-access-token',
    refreshToken: 'a-refresh-token',
  });
  // The value the press kept is gone, because a return is good for one sign in.
  expect(holding.started).toBeNull();
  expect(holding.cookie).not.toContain('an-id-token');

  // The exchange carried the verifier itself, which never travelled in an address.
  const sent = new URLSearchParams(whatTheBrowserDid(page).exchanged[0] ?? '');

  expect(whatTheBrowserDid(page).exchanged).toHaveLength(1);
  expect(sent.get('grant_type')).toBe('authorization_code');
  expect(sent.get('code')).toBe(THE_CODE_SHE_COMES_BACK_WITH);
  expect((sent.get('code_verifier') ?? '').length).toBeGreaterThan(20);
});

Then('she is left on the home page, holding no session at all', async ({ page }) => {
  await page.waitForURL('**/en/');

  const holding = await whatSheIsHolding(page);

  expect(holding.session).toBeNull();
  expect(holding.started).toBeNull();
  expect(holding.cookie).not.toContain('an-id-token');
});

Then(
  'she is told the sign in did not finish, and the pool was asked for no token',
  async ({ page }) => {
    await page.waitForURL(`**/en/${WHERE_SHE_COMES_BACK_TO}**`);

    await expect(page.locator('main').getByRole('alert')).toHaveText(words.returningDidNotFinish);
    // The whole point of the state. A code exchanged for a state this browser did not write would
    // sign her in to whichever account started that sign in.
    expect(whatTheBrowserDid(page).exchanged).toEqual([]);
  },
);

Then('she is offered the page she signs in on, and holds no session at all', async ({ page }) => {
  const back = page.getByRole('link', { name: words.returningTryAgain });

  await expect(back).toHaveCount(1);

  const holding = await whatSheIsHolding(page);

  expect(holding.session).toBeNull();
  expect(holding.started).toBeNull();

  await back.click();
  await page.waitForURL('**/en/sign-in/');

  await expect(page.locator('#sign-in-address')).toHaveCount(1);
});

Then(
  'she is told Emi could not start that sign in, and she stays on the page',
  async ({ page }) => {
    await expect(page.locator('main').getByRole('alert')).toHaveText(words.signInCouldNotStart);
    expect(new URL(page.url()).pathname).toBe('/en/sign-in/');
    expect(whatTheBrowserDid(page).leftFor).toEqual([]);
  },
);

Then('the box she types her address in is still there', async ({ page }) => {
  await expect(page.locator('#sign-in-address')).toHaveCount(1);
  await expect(page.getByRole('button', { name: words.signInSendCode })).toHaveCount(1);
});

Then('she reads a press for Apple beside the press for Google', async ({ page }) => {
  const presses = await page.locator('main button').allInnerTexts();

  expect(presses.filter((said) => said.includes(words.signInApple))).toHaveLength(1);
  expect(presses.filter((said) => said.includes(words.signInGoogle))).toHaveLength(1);
  // Apple's review rule asks for a way in that limits what it learns beside every social sign in,
  // so a page offering Google and not Apple is a page the store refuses.
  expect(presses.indexOf(words.signInApple)).toBeLessThan(presses.indexOf(words.signInGoogle));
});

Then('she reads no press for Telegram, which waits for a sign in of its own', async ({ page }) => {
  await expect(page.locator('main')).not.toContainText(words.signInTelegram);
});
