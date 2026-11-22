/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { wordsIn } from '../app/words';
import { TheReturnFromAProvider } from '../components/theReturnFromAProvider';
import { TheReturnFromTelegram } from '../components/theReturnFromTelegram';
import { TheSignInForm } from '../components/theSignInForm';
import { WHAT_SHE_STARTED_ENTRY } from '../lib/theProviderSignIn';
import { theSessionHeld } from '../lib/theSessionSheHolds';
import { THE_BLACK_FRIDAY_OFFER } from '../lib/theBlackFridayOffer';
import { theOfferAnAddressNames } from '../lib/theOfferSheArrivedWith';
import { theEntryFor } from '../lib/theTelegramSignIn';
import {
  WHERE_A_SIGN_IN_LANDS,
  WHERE_SHE_BUYS_EMI,
  WHERE_SHE_WAS_GOING_ENTRY,
  WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY,
  comeBackToThisPage,
} from '../lib/whereASignInComesBackTo';

/**
 * Where each way in leaves her, driven in a browser from the thing she presses to the address her
 * browser leaves for.
 *
 * Her account is where a sign in lands, and the Buy Emi page moves a reader with no session to the
 * sign in page, so the three ways in have to give that page back or she signs in and reads a page
 * she did not ask for. Each way in is driven here against a double of the service, because each
 * one writes the session in its own place and only the landing is shared.
 *
 * Nothing here reaches a network, and no key of any kind is in this file.
 */

const words = wordsIn('en');

const HER_ADDRESS = 'iuliia@example.com';

/** The digits she types, which the double below takes and nothing else does. */
const THE_CODE_SHE_IS_SENT = '482913';

/** The state her browser wrote, as a press in Russian writes one for Telegram. */
const THE_TELEGRAM_STATE = 'ru.a-state-her-browser-wrote';

/** The state her browser wrote, as a press on Apple or on Google writes one. */
const THE_PROVIDER_STATE = 'a-state-her-browser-wrote';

const theTokensThePoolIssues = {
  AuthenticationResult: {
    IdToken: 'an-id-token',
    AccessToken: 'an-access-token',
    RefreshToken: 'a-refresh-token',
  },
};

/** Where her browser was told to go, which is the end of every way in. */
const whereSheWentNext: string[] = [];

function sheIsReading(address: string, search = ''): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: `https://myemi.app${address}${search}`,
      search,
      origin: 'https://myemi.app',
      assign: (went: string) => whereSheWentNext.push(went),
      replace: (went: string) => whereSheWentNext.push(went),
    },
  });
}

/** The service, answering the queue it is given, one call at a time. */
function aServiceThatAnswers(answers: readonly Record<string, unknown>[]): void {
  const left = [...answers];

  globalThis.fetch = ((where: unknown) => {
    const next = left.shift();

    if (next === undefined) {
      return Promise.reject(new Error(`The double was asked for ${String(where)} and had none.`));
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve(next) });
  }) as unknown as typeof fetch;
}

async function drawn(element: Parameters<ReturnType<typeof createRoot>['render']>[0]) {
  const where = document.createElement('div');

  document.body.append(where);

  await act(async () => {
    createRoot(where).render(element);
  });

  return where;
}

/** A field written into the way a browser writes into one, so React reads the change. */
async function sheTypes(field: HTMLInputElement, value: string): Promise<void> {
  const writeIt = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

  await act(async () => {
    writeIt?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function shePresses(where: HTMLElement, saying: string): Promise<void> {
  const press = [...where.querySelectorAll('button')].find(
    (each) => each.textContent?.trim() === saying,
  );

  if (press === undefined) {
    throw new Error(`No press says "${saying}". The page says: ${where.textContent ?? ''}`);
  }

  await act(async () => {
    press.click();
  });
}

function theField(where: HTMLElement, named: string): HTMLInputElement {
  const field = where.querySelector<HTMLInputElement>(named);

  if (field === null) {
    throw new Error(`There is no ${named}. The page says: ${where.textContent ?? ''}`);
  }

  return field;
}

/** The code sign in, from the address she types to the address her browser leaves for. */
async function sheSignsInWithACode(): Promise<void> {
  aServiceThatAnswers([
    { UserSub: 'a-subject', Session: 'a-sign-up-session' },
    { Session: 'a-confirmed-session' },
    theTokensThePoolIssues,
  ]);

  const page = await drawn(
    <TheSignInForm language="en" words={words}>
      <div />
    </TheSignInForm>,
  );

  await sheTypes(theField(page, '#sign-in-address'), HER_ADDRESS);
  await shePresses(page, words.signInSendCode);
  await sheTypes(theField(page, '#sign-in-code'), THE_CODE_SHE_IS_SENT);
  await shePresses(page, words.signInCodeSubmit);
}

/** The return from Apple or from Google, arriving with the state the press kept. */
async function sheComesBackFromAProvider(): Promise<void> {
  window.sessionStorage.setItem(
    WHAT_SHE_STARTED_ENTRY,
    JSON.stringify({
      way: 'SignInWithApple',
      state: THE_PROVIDER_STATE,
      verifier: 'a-verifier-nobody-can-guess',
      language: 'en',
    }),
  );
  sheIsReading('/en/sign-in/returning/', `?code=a-code&state=${THE_PROVIDER_STATE}`);
  aServiceThatAnswers([
    { id_token: 'an-id-token', access_token: 'an-access-token', refresh_token: 'a-refresh-token' },
  ]);

  await drawn(<TheReturnFromAProvider language="en" words={words} />);
}

/** The return from Telegram, which carries the language she pressed in rather than this one. */
async function sheComesBackFromTelegram(): Promise<void> {
  window.sessionStorage.setItem(
    theEntryFor('ru'),
    JSON.stringify({
      state: THE_TELEGRAM_STATE,
      verifier: 'a-verifier-nobody-can-guess',
      nonce: 'a-nonce',
      language: 'ru',
    }),
  );
  sheIsReading(
    '/en/sign-in/telegram/',
    `?code=a-code&state=${encodeURIComponent(THE_TELEGRAM_STATE)}`,
  );
  aServiceThatAnswers([
    { userName: 'tg_7Z8K2PQR4MNWXYVB3HJ5CD6TFG', answer: 'an-answer-good-for-one-challenge' },
    { ChallengeName: 'CUSTOM_CHALLENGE', Session: 'a-session-the-pool-made' },
    theTokensThePoolIssues,
  ]);

  await drawn(<TheReturnFromTelegram language="en" words={words} />);
}

beforeEach(() => {
  document.body.innerHTML = '';
  whereSheWentNext.length = 0;
  window.localStorage.clear();
  window.sessionStorage.clear();
  sheIsReading('/en/sign-in/');
  // React draws nothing outside an act environment, and the runner sets no such flag of its own.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('where a sign in leaves her', () => {
  describe('a woman who was moved off the Buy Emi page', () => {
    it('comes back to it when she signs in with a code', async () => {
      comeBackToThisPage(WHERE_SHE_BUYS_EMI);

      await sheSignsInWithACode();

      expect(whereSheWentNext).toEqual(['/en/checkout/']);
      expect(theSessionHeld()?.idToken).toBe('an-id-token');
      // The note goes as it is read, so a sign in a week later lands on her account again.
      expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBeNull();
    });

    it('comes back to it when she signs in with Apple or with Google', async () => {
      comeBackToThisPage(WHERE_SHE_BUYS_EMI);

      await sheComesBackFromAProvider();

      expect(whereSheWentNext).toEqual(['/en/checkout/']);
      expect(theSessionHeld()?.idToken).toBe('an-id-token');
      expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBeNull();
    });

    it('comes back to it when she signs in with Telegram, in the language she pressed in', async () => {
      comeBackToThisPage(WHERE_SHE_BUYS_EMI);

      await sheComesBackFromTelegram();

      expect(whereSheWentNext).toEqual(['/ru/checkout/']);
      expect(theSessionHeld()?.idToken).toBe('an-id-token');
      expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBeNull();
    });
  });

  /**
   * The offer rides through the sign in beside the page, so a woman who arrived on the Black
   * Friday address and had to sign in is reading the halved amount when she lands, rather than
   * the full price she never agreed to.
   */
  describe('a woman who was moved off the Buy Emi page she opened on the offer', () => {
    const theWaysIn: readonly (readonly [string, () => Promise<void>, string])[] = [
      ['with a code', sheSignsInWithACode, '/en/checkout/?offer=black-friday'],
      ['with Apple or with Google', sheComesBackFromAProvider, '/en/checkout/?offer=black-friday'],
      ['with Telegram', sheComesBackFromTelegram, '/ru/checkout/?offer=black-friday'],
    ];

    it.each(theWaysIn)(
      'comes back to the offer when she signs in %s',
      async (_said, signIn, lands) => {
        comeBackToThisPage(WHERE_SHE_BUYS_EMI, THE_BLACK_FRIDAY_OFFER);

        await signIn();

        expect(whereSheWentNext).toEqual([lands]);
        expect(theSessionHeld()?.idToken).toBe('an-id-token');
        // Both notes go as they are read, so a sign in a week later asks the one price again.
        expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBeNull();
        expect(window.sessionStorage.getItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY)).toBeNull();
      },
    );

    it('reads the offer back out of the address she lands on', async () => {
      comeBackToThisPage(WHERE_SHE_BUYS_EMI, THE_BLACK_FRIDAY_OFFER);

      await sheSignsInWithACode();

      const [landed = ''] = whereSheWentNext;

      expect(theOfferAnAddressNames(landed.slice(landed.indexOf('?')))).toBe(
        THE_BLACK_FRIDAY_OFFER,
      );
    });

    it('keeps the full price for a woman who was moved off the page without one', async () => {
      comeBackToThisPage(WHERE_SHE_BUYS_EMI);

      await sheSignsInWithACode();

      expect(whereSheWentNext).toEqual(['/en/checkout/']);
    });

    /**
     * Only the one offer this site sells is kept. Everything else is a value somebody wrote into
     * the entry, and she lands on the page at the price the page asks for.
     */
    it.each([
      'half-off-for-ever',
      'BLACK-FRIDAY',
      'black-friday-2025',
      'black-friday&offer=half-off',
      '',
    ])('drops the kept value %s, so she lands on the page at the one price', async (said) => {
      window.sessionStorage.setItem(WHERE_SHE_WAS_GOING_ENTRY, WHERE_SHE_BUYS_EMI);
      window.sessionStorage.setItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY, said);

      await sheSignsInWithACode();

      expect(whereSheWentNext).toEqual(['/en/checkout/']);
      expect(window.sessionStorage.getItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY)).toBeNull();
    });

    it('writes no offer for a woman who was moved off the page a second time without one', () => {
      comeBackToThisPage(WHERE_SHE_BUYS_EMI, THE_BLACK_FRIDAY_OFFER);
      comeBackToThisPage(WHERE_SHE_BUYS_EMI);

      expect(window.sessionStorage.getItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY)).toBeNull();
    });

    it('leaves the offer off her account, which sells nothing', async () => {
      window.sessionStorage.setItem(WHERE_SHE_WAS_GOING_ENTRY, WHERE_A_SIGN_IN_LANDS);
      window.sessionStorage.setItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY, THE_BLACK_FRIDAY_OFFER);

      await sheSignsInWithACode();

      expect(whereSheWentNext).toEqual(['/en/account/']);
    });
  });

  describe('a woman whose browser kept no note of a page', () => {
    it('is left on her account, which is where a sign in lands', async () => {
      await sheSignsInWithACode();

      expect(whereSheWentNext).toEqual(['/en/account/']);
    });
  });

  describe('a note naming anything but a page of this site', () => {
    /**
     * A note is read against a list of two paths, so each of these lands her on her account. The
     * first four are the ways a value could carry her to another host: a whole address, an address
     * with no scheme, an address of this host with a path of its own, and a path that climbs out
     * of the language. The last two are paths of this site that are not on the list.
     */
    it.each([
      'https://not-emi.example.com/',
      '//not-emi.example.com/',
      'https://myemi.app/en/checkout/',
      '../../not-emi.example.com/',
      'terms/',
      'sign-in/',
    ])('lands her on her account, and not on %s', async (kept) => {
      window.sessionStorage.setItem(WHERE_SHE_WAS_GOING_ENTRY, kept);

      await sheSignsInWithACode();

      expect(whereSheWentNext).toEqual(['/en/account/']);
      expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBeNull();
    });
  });
});
