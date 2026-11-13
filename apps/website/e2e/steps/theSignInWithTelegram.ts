import { type Page, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { wordsIn } from '../../app/words';
import { THE_SESSION_ENTRY } from '../../lib/theSessionSheHolds';
import { THE_POOL_HOST } from '../../lib/theSignIn';
import {
  THE_EMI_BOT_ID,
  WHERE_TELEGRAM_ASKS_HER,
  WHERE_TELEGRAM_SENDS_HER_BACK,
  WHERE_THE_SIGN_IN_FUNCTION_ANSWERS,
  theEntryFor,
} from '../../lib/theTelegramSignIn';
import { test } from './fixtures';

/**
 * A log in with Telegram, driven end to end in a browser.
 *
 * Telegram, the api and the pool are all answered by the suite. The client secret of the bot and
 * the two allowed addresses are made by hand in the BotFather mini application, the sign in
 * function is not packaged into a deployed function yet, and the pool does not name the three
 * triggers of the custom sign in. So a run against any of the three would prove that something is
 * not made yet and nothing else. Every shape here is one the service documents or one the sign in
 * function of this repository already answers with.
 *
 * The authorization address is answered the way the whole trip ends: with a move back to the
 * registered address, carrying a code and the state. What Telegram does in between is its own
 * page, which no suite of Emi can drive and no code of Emi can see.
 */

/** The code Telegram sends her back with, which only the sign in function ever reads. */
const THE_CODE_SHE_COMES_BACK_WITH = 'a-code-the-suite-wrote';

/** What a state looks like when another browser wrote it, which this one must refuse. */
const A_STATE_SHE_NEVER_WROTE = 'ru.a-state-another-browser-wrote';

/** The user name of the pool the sign in function answers with, in the shape it makes them. */
const THE_USER_NAME = 'tg_7Z8K2PQR4MNWXYVB3HJ5CD6TFG';

/** The one answer the function makes, which the verify trigger spends by deleting its digest. */
const THE_ONE_TIME_ANSWER = 'an-answer-the-suite-wrote';

const words = wordsIn('ru');

/** What one scenario watched the browser do, so a step can read it afterwards. */
interface WhatTheBrowserDid {
  /** Every address the press left for, in the order she pressed. */
  readonly leftFor: string[];
  /** Every call to the sign in function of the api, as the body it sent. */
  readonly askedTheApi: string[];
  /** Every call to the pool, as the name of the call and the body it sent. */
  readonly askedThePool: { readonly call: string; readonly body: string }[];
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
 * Telegram, the api and the pool, each answering the way its own documentation says it does.
 *
 * The move back to the registered address is the whole of what Telegram does: it asks her, and it
 * returns her to the one address it holds with a code and the state it was given.
 */
async function telegramAndTheApiAnswered(page: Page): Promise<void> {
  const did: WhatTheBrowserDid = {
    leftFor: [],
    askedTheApi: [],
    askedThePool: [],
    stateToHandBack: null,
  };

  watched.set(page, did);

  await page.route(`${WHERE_TELEGRAM_ASKS_HER}**`, async (route) => {
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

  await page.route(WHERE_THE_SIGN_IN_FUNCTION_ANSWERS, async (route) => {
    did.askedTheApi.push(route.request().postData() ?? '');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ userName: THE_USER_NAME, answer: THE_ONE_TIME_ANSWER }),
    });
  });

  // The two calls of the custom sign in. The first is answered with the challenge the create
  // trigger issues, which asks her nothing, and the second with her tokens.
  await page.route(`${THE_POOL_HOST}/**`, async (route) => {
    const call = (route.request().headers()['x-amz-target'] ?? '').split('.').pop() ?? '';

    did.askedThePool.push({ call, body: route.request().postData() ?? '' });

    await route.fulfill({
      status: 200,
      contentType: 'application/x-amz-json-1.1',
      body: JSON.stringify(
        call === 'InitiateAuth'
          ? { ChallengeName: 'CUSTOM_CHALLENGE', Session: 'a-session-the-pool-made' }
          : {
              AuthenticationResult: {
                IdToken: 'an-id-token',
                AccessToken: 'an-access-token',
                RefreshToken: 'a-refresh-token',
              },
            },
      ),
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
      session: window.localStorage.getItem(session as string),
      started: window.sessionStorage.getItem(started as string),
      cookie: document.cookie,
    }),
    [THE_SESSION_ENTRY, theEntryFor('ru')] as const,
  );
}

const { Given, When, Then } = createBdd(test);

Given(
  'a woman opens the page she signs in on in Russian, with Telegram and the api answered',
  async ({ page }) => {
    await telegramAndTheApiAnswered(page);
    await page.goto('/ru/sign-in/');
    await expect(page.getByRole('button', { name: words.signInTelegram })).toHaveCount(1);
  },
);

Given('Telegram will answer with a state her browser never wrote', ({ page }) => {
  whatTheBrowserDid(page).stateToHandBack = A_STATE_SHE_NEVER_WROTE;
});

When('she presses Log in with Telegram', async ({ page }) => {
  await page.getByRole('button', { name: words.signInTelegram }).click();
});

Then('she leaves for Telegram with the bot of Emi, a state and a digest', async ({ page }) => {
  await expect
    .poll(() => whatTheBrowserDid(page).leftFor.length, { timeout: 5000 })
    .toBeGreaterThan(0);

  const left = new URL(whatTheBrowserDid(page).leftFor[0] ?? '');

  expect(`${left.origin}${left.pathname}`).toBe(WHERE_TELEGRAM_ASKS_HER);
  expect(left.searchParams.get('client_id')).toBe(THE_EMI_BOT_ID);
  expect(left.searchParams.get('response_type')).toBe('code');
  expect(left.searchParams.get('scope')).toBe('openid');
  expect(left.searchParams.get('code_challenge_method')).toBe('S256');
  expect((left.searchParams.get('code_challenge') ?? '').length).toBeGreaterThan(20);
  // She pressed on the Russian page and comes back through the one registered address, which is
  // under en. So the language is in the state and nowhere else.
  expect(left.searchParams.get('state')).toMatch(/^ru\./);
  expect(left.searchParams.get('redirect_uri')).toContain(`/en/${WHERE_TELEGRAM_SENDS_HER_BACK}`);
});

Then('she comes back signed in, and is left on her account in Russian', async ({ page }) => {
  await page.waitForURL('**/ru/account/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(words.accountTitle);
  await expect(page.getByRole('button', { name: words.accountSignOut })).toHaveCount(1);

  const holding = await whatSheIsHolding(page);

  expect(JSON.parse(holding.session ?? 'null')).toEqual({
    idToken: 'an-id-token',
    accessToken: 'an-access-token',
    refreshToken: 'a-refresh-token',
  });
  // The three values the press kept are gone, because a return is good for one sign in.
  expect(holding.started).toBeNull();
  expect(holding.cookie).not.toContain('an-id-token');
});

Then(
  'the api was given the code and the verifier, and the pool was answered once',
  async ({ page }) => {
    const did = whatTheBrowserDid(page);
    const sent = JSON.parse(did.askedTheApi[0] ?? '{}') as Record<string, string>;

    expect(did.askedTheApi).toHaveLength(1);
    expect(sent.code).toBe(THE_CODE_SHE_COMES_BACK_WITH);
    // The verifier itself, which never travelled in an address.
    expect((sent.codeVerifier ?? '').length).toBeGreaterThan(20);
    expect((sent.nonce ?? '').length).toBeGreaterThan(20);

    expect(did.askedThePool.map((asked) => asked.call)).toEqual([
      'InitiateAuth',
      'RespondToAuthChallenge',
    ]);
    expect(JSON.parse(did.askedThePool[0]?.body ?? '{}')).toMatchObject({
      AuthFlow: 'CUSTOM_AUTH',
      AuthParameters: { USERNAME: THE_USER_NAME, CHALLENGE_NAME: 'CUSTOM_CHALLENGE' },
    });
    expect(JSON.parse(did.askedThePool[1]?.body ?? '{}')).toMatchObject({
      ChallengeName: 'CUSTOM_CHALLENGE',
      ChallengeResponses: { USERNAME: THE_USER_NAME, ANSWER: THE_ONE_TIME_ANSWER },
    });

    // The browser held a code and one answer, and no token of Telegram. The identity token is read
    // by the sign in function, which answers with none of it.
    const holding = await whatSheIsHolding(page);

    expect(holding.session ?? '').not.toContain(THE_ONE_TIME_ANSWER);
    expect(holding.session ?? '').not.toContain(THE_CODE_SHE_COMES_BACK_WITH);
  },
);

Then(
  'she is told the sign in did not finish, and the api was asked for nothing',
  async ({ page }) => {
    await page.waitForURL(`**/en/${WHERE_TELEGRAM_SENDS_HER_BACK}**`);

    await expect(page.locator('main').getByRole('alert')).toHaveText(
      wordsIn('en').returningDidNotFinish,
    );
    // The whole point of the state. A code sent to the api for a state this browser did not write
    // would sign her in to whichever account started that sign in.
    expect(whatTheBrowserDid(page).askedTheApi).toEqual([]);
    expect(whatTheBrowserDid(page).askedThePool).toEqual([]);
  },
);

Then(
  'the relay offers her the page she signs in on, and she holds no session at all',
  async ({ page }) => {
    const back = page.getByRole('link', { name: wordsIn('en').returningTryAgain });

    await expect(back).toHaveCount(1);

    const holding = await whatSheIsHolding(page);

    expect(holding.session).toBeNull();
    expect(holding.started).toBeNull();

    await back.click();
    await page.waitForURL('**/en/sign-in/');

    await expect(page.locator('#sign-in-address')).toHaveCount(1);
  },
);
