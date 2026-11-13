/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { TheReturnFromTelegram } from '../components/theReturnFromTelegram';
import { type Language, wordsIn } from '../app/words';
import { theSessionHeld } from '../lib/theSessionSheHolds';
import { THE_POOL_HOST } from '../lib/theSignIn';
import {
  WHERE_THE_SIGN_IN_FUNCTION_ANSWERS,
  forgetWhatSheStarted,
  theEntryFor,
} from '../lib/theTelegramSignIn';

/**
 * The relay page Telegram sends her back to, driven in a browser from the address she arrives on
 * to the address her browser leaves for.
 *
 * Where she lands is the whole of the fault this file was written for. A finished sign in sent her
 * to the page she signs in on, which reads no session, so a woman who had just signed in read the
 * sign in page again and took it for a refusal. Every other way in leaves her on her account.
 *
 * The press is not made here. It needs the real cryptography of the platform for its digest, and
 * it has its own cases in `theTelegramSignIn.test.ts`, so each case writes the entry a press
 * writes and arrives with the state that entry holds.
 */

/** The state her browser wrote, as a press in Russian writes one. */
const THE_STATE_SHE_WROTE = 'ru.a-state-her-browser-wrote';

const THE_USER_NAME = 'tg_7Z8K2PQR4MNWXYVB3HJ5CD6TFG';

/** What the sign in function answers with: a user name of the pool, and one answer. */
const theUserNameAndTheAnswer = {
  userName: THE_USER_NAME,
  answer: 'an-answer-good-for-one-challenge',
};

const theChallenge = { ChallengeName: 'CUSTOM_CHALLENGE', Session: 'a-session-the-pool-made' };

const theTokens = {
  AuthenticationResult: {
    IdToken: 'an-id-token',
    AccessToken: 'an-access-token',
    RefreshToken: 'a-refresh-token',
  },
};

/** Where her browser was told to go, which is the end of this page in a browser. */
const whereSheWentNext: string[] = [];

/** The address she arrived on, and a record of every move away from it. */
function sheArrivesAt(search: string): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: `https://myemi.app/en/sign-in/telegram/${search}`,
      search,
      assign: (address: string) => whereSheWentNext.push(address),
      replace: (address: string) => whereSheWentNext.push(address),
    },
  });
}

/** The api and the pool, answering the queue they are given, one call at a time. */
function anApiAndAPool(answers: readonly Record<string, unknown>[]): { went: string[] } {
  const left = [...answers];
  const went: string[] = [];

  globalThis.fetch = ((where: unknown, asked: RequestInit) => {
    const headers = (asked.headers ?? {}) as Record<string, string>;
    const call = (headers['x-amz-target'] ?? '').split('.').pop() ?? '';

    went.push(call === '' ? String(where) : `${String(where)} ${call}`);

    const next = left.shift();

    if (next === undefined) {
      return Promise.reject(new Error(`The stub was asked for ${String(where)} and had nothing.`));
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve(next) });
  }) as unknown as typeof fetch;

  return { went };
}

/** The entry a press keeps, written the way a press writes it. */
function whatThePressKept(language: Language, state: string): void {
  window.sessionStorage.setItem(
    theEntryFor(language),
    JSON.stringify({ state, verifier: 'a-verifier-nobody-can-guess', nonce: 'a-nonce', language }),
  );
}

/** The relay page, mounted into a document as her browser mounts it. */
async function theRelayPage(): Promise<HTMLElement> {
  const where = document.createElement('div');

  document.body.append(where);

  await act(async () => {
    createRoot(where).render(<TheReturnFromTelegram language="en" words={wordsIn('en')} />);
  });

  return where;
}

beforeEach(() => {
  document.body.innerHTML = '';
  whereSheWentNext.length = 0;
  window.localStorage.clear();

  for (const language of ['en', 'ru', 'es'] as const) {
    forgetWhatSheStarted(language);
  }

  // React draws nothing outside an act environment, and the runner sets no such flag of its own.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('the page Telegram sends her back to', () => {
  it('leaves her on her account, in the language she pressed in', async () => {
    whatThePressKept('ru', THE_STATE_SHE_WROTE);
    sheArrivesAt(`?code=a-code&state=${encodeURIComponent(THE_STATE_SHE_WROTE)}`);

    const stub = anApiAndAPool([theUserNameAndTheAnswer, theChallenge, theTokens]);

    await theRelayPage();

    expect(stub.went).toEqual([
      WHERE_THE_SIGN_IN_FUNCTION_ANSWERS,
      `${THE_POOL_HOST} InitiateAuth`,
      `${THE_POOL_HOST} RespondToAuthChallenge`,
    ]);
    // Her account, which reads the session she now holds. The page she signs in on reads none of
    // it, so a woman sent there after a finished sign in reads the sign in page again.
    expect(whereSheWentNext).toEqual(['/ru/account/']);
    expect(theSessionHeld()).toEqual({
      idToken: 'an-id-token',
      accessToken: 'an-access-token',
      refreshToken: 'a-refresh-token',
    });
    expect(window.sessionStorage.getItem(theEntryFor('ru'))).toBeNull();
  });

  it('offers her the page she signs in on when the return did not finish, and moves her nowhere', async () => {
    whatThePressKept('ru', THE_STATE_SHE_WROTE);
    sheArrivesAt('?code=a-code&state=ru.a-state-another-browser-wrote');

    const stub = anApiAndAPool([theUserNameAndTheAnswer, theChallenge, theTokens]);

    const where = await theRelayPage();
    const offered = where.querySelector('a');

    expect(where.textContent).toContain(wordsIn('en').returningDidNotFinish);
    expect(offered?.getAttribute('href')).toBe('/en/sign-in/');
    expect(offered?.textContent).toBe(wordsIn('en').returningTryAgain);
    // A state her browser did not write signs nobody in, so nothing went out and she holds
    // nothing. She stays on the relay page and presses again.
    expect(stub.went).toEqual([]);
    expect(whereSheWentNext).toEqual([]);
    expect(theSessionHeld()).toBeNull();
    expect(window.sessionStorage.getItem(theEntryFor('ru'))).toBeNull();
  });
});
