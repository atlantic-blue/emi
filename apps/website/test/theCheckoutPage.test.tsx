/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import CheckoutPage from '../app/[lang]/checkout/page';
import { type Language, languages, wordsIn } from '../app/words';
import { ThePaymentForm } from '../components/thePaymentForm';
import { TheSignedInLine } from '../components/theSignedInLine';
import { THE_SESSION_ENTRY } from '../lib/theSessionSheHolds';
import type {
  AnElementOfStripe,
  TheElementsOfTheForm,
  TheStripeOnThePage,
} from '../lib/theStripeOnThePage';
import { WHERE_A_SUBSCRIPTION_STARTS } from '../lib/theSubscriptionSheStarts';
import { WHERE_SHE_WAS_GOING_ENTRY } from '../lib/whereASignInComesBackTo';

/**
 * The page she buys Emi on and the form that takes her money, driven in a browser.
 *
 * Stripe is a double that answers what Stripe answers, and the api is a stub, so every case walks
 * the real component from the press to the state it leaves her in. Nothing here reaches a network
 * and no key of any kind is in this file.
 *
 * The last part of the file drives the whole page rather than the form, because whether a reader
 * meets the page at all is read off the session in her browser.
 */

const words = wordsIn('en');

/**
 * The press that pays, as a reader meets it: the words of the catalogue with the figure the one
 * price rule gives, which is the only place this site says what it charges.
 */
const thePressThatPays = words.checkoutPay;

const A_KEY = 'pk_test_not_a_real_key';

/** Where her browser was told to go, which is the end of this page in a browser. */
const whereSheWentNext: string[] = [];
const A_CLIENT_SECRET = 'seti_000000000001_secret_000000000001';

/**
 * The names the pool writes in front of the subject a provider gave, written out here rather than
 * read from the page, so a page that renamed one of them would be read saying the wrong thing.
 */
const THE_APPLE_NAME = 'SignInWithApple';
const THE_GOOGLE_NAME = 'Google';

/**
 * The token she holds, which carries the one claim the line under the title reads, and whatever
 * else a case needs. The instant a session runs out is a claim of this token too.
 */
function anIdToken(userName: string, alsoHolding: Readonly<Record<string, unknown>> = {}): string {
  const part = (held: unknown): string =>
    btoa(JSON.stringify(held)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${part({ alg: 'RS256' })}.${part({ 'cognito:username': userName, ...alsoHolding })}.signature`;
}

interface WhatStripeDid {
  readonly mounted: string[];
  readonly confirmed: Record<string, unknown>[];
  submitted: number;
  /** The listeners each element was given, so a test can answer an event the way Stripe does. */
  readonly listeners: Map<string, (said: Record<string, unknown>) => void>;
}

interface AFakeStripe {
  readonly stripe: TheStripeOnThePage;
  readonly did: WhatStripeDid;
}

/** Stripe, as far as the form drives it. */
function fakeStripe(
  options: { readonly refuses?: string; readonly submitRefuses?: string } = {},
): AFakeStripe {
  const did: WhatStripeDid = {
    mounted: [],
    confirmed: [],
    submitted: 0,
    listeners: new Map(),
  };

  const element = (kind: string): AnElementOfStripe => ({
    mount: () => did.mounted.push(kind),
    on: (event, listen) => did.listeners.set(`${kind}:${event}`, listen),
    destroy: () => undefined,
  });

  const elements: TheElementsOfTheForm = {
    create: (kind) => element(kind),
    submit: () => {
      did.submitted += 1;

      return Promise.resolve(
        options.submitRefuses === undefined ? {} : { error: { message: options.submitRefuses } },
      );
    },
  };

  return {
    did,
    stripe: {
      elements: () => elements,
      confirmSetup: (asked) => {
        did.confirmed.push(asked);

        return Promise.resolve(
          options.refuses === undefined ? {} : { error: { message: options.refuses } },
        );
      },
    },
  };
}

/** The api, answering one call with the secret of a setup, and counting what it was asked. */
function anApi(answers: { readonly ok: boolean }): {
  readonly asks: typeof fetch;
  readonly calls: { address: string; token: string }[];
} {
  const calls: { address: string; token: string }[] = [];

  const asks = ((where: unknown, asked: RequestInit) => {
    const headers = (asked.headers ?? {}) as Record<string, string>;

    calls.push({ address: String(where), token: headers.authorization ?? '' });

    return Promise.resolve({
      ok: answers.ok,
      status: answers.ok ? 200 : 502,
      json: () => Promise.resolve({ clientSecret: A_CLIENT_SECRET }),
    } as Response);
  }) as unknown as typeof fetch;

  return { asks, calls };
}

interface ADrivenForm {
  readonly holder: HTMLElement;
  readonly did: WhatStripeDid;
  readonly calls: { address: string; token: string }[];
  readonly press: (named: string) => Promise<void>;
  readonly answerTheWalletEvent: (said: Record<string, unknown>) => Promise<void>;
  readonly text: () => string;
}

async function aFormOnThePage(
  options: {
    readonly publishableKey?: string;
    readonly stripe?: AFakeStripe;
    readonly signedIn?: boolean;
    readonly apiAnswers?: boolean;
    readonly language?: Language;
  } = {},
): Promise<ADrivenForm> {
  const language = options.language ?? 'en';
  const stripe = options.stripe ?? fakeStripe();
  const api = anApi({ ok: options.apiAnswers ?? true });
  const holder = document.createElement('div');

  document.body.append(holder);
  window.localStorage.clear();
  whereSheWentNext.length = 0;

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: 'https://myemi.app/en/checkout/',
      assign: (address: string) => whereSheWentNext.push(address),
      replace: (address: string) => whereSheWentNext.push(address),
    },
  });

  if (options.signedIn !== false) {
    window.localStorage.setItem(
      THE_SESSION_ENTRY,
      JSON.stringify({
        idToken: anIdToken(`${THE_APPLE_NAME}_000482910`),
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    );
  }

  const root = createRoot(holder);

  await act(async () => {
    root.render(
      <ThePaymentForm
        asks={api.asks}
        language={language}
        publishableKey={options.publishableKey ?? A_KEY}
        stripeArrives={() => Promise.resolve(stripe.stripe)}
        words={wordsIn(language)}
      />,
    );
  });

  return {
    holder,
    did: stripe.did,
    calls: api.calls,
    text: () => holder.textContent ?? '',
    press: async (named: string) => {
      const pressed = [...holder.querySelectorAll('button')].find((button) =>
        (button.textContent ?? '').includes(named),
      );

      expect(pressed).toBeDefined();

      await act(async () => {
        pressed?.click();
      });
    },
    answerTheWalletEvent: async (said: Record<string, unknown>) => {
      await act(async () => {
        stripe.did.listeners.get('expressCheckout:ready')?.(said);
      });
    },
  };
}

beforeEach(() => {
  // React draws nothing outside an act environment, and the runner sets no such flag of its own.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('the line under the title', () => {
  /** Draws the line for a woman holding the token of one way in, and answers what she reads. */
  async function theLineFor(userName: string | null): Promise<string> {
    const holder = document.createElement('div');

    document.body.append(holder);
    window.localStorage.clear();

    if (userName !== null) {
      window.localStorage.setItem(
        THE_SESSION_ENTRY,
        JSON.stringify({
          idToken: anIdToken(userName),
          accessToken: 'access',
          refreshToken: 'refresh',
        }),
      );
    }

    const root = createRoot(holder);

    await act(async () => {
      root.render(<TheSignedInLine language="en" words={words} />);
    });

    return holder.textContent ?? '';
  }

  it.each([
    [`${THE_APPLE_NAME}_000482910`, 'Apple'],
    [`${THE_GOOGLE_NAME}_000913847`, 'Google'],
    ['tg_0000000000000000000000000', 'Telegram'],
    ['7f3a1c20-0000-4000-8000-000000000000', words.checkoutWayAddress],
  ])('says the way %s signed in, which is %s', async (userName, named) => {
    const said = await theLineFor(userName);

    expect(said).toContain(words.checkoutSignedInWith.replace('{way}', named));
    expect(said).toContain(words.checkoutNotYou);
  });

  it('says nothing at all for a reader holding no session', async () => {
    expect(await theLineFor(null)).toBe('');
  });
});

describe('the form she pays on', () => {
  it('mounts the wallets and the card form, each one once', async () => {
    const form = await aFormOnThePage();

    expect(form.did.mounted).toEqual(['expressCheckout', 'payment']);
  });

  it('names the card route she is on, and offers her nothing to choose', async () => {
    const form = await aFormOnThePage();

    expect(form.text()).toContain(words.checkoutPayByCard);
    expect(form.text()).toContain(words.checkoutPayByCardWhere);
    expect(
      [...form.holder.querySelectorAll('[aria-pressed]')].map((held) => held.textContent),
    ).toEqual([]);
  });

  it('draws one press, which is the press that pays, with nothing pressed first', async () => {
    const form = await aFormOnThePage();
    const presses = [...form.holder.querySelectorAll('button')];

    expect(presses.map((press) => press.textContent)).toEqual([thePressThatPays]);
    expect(form.did.mounted).toEqual(['expressCheckout', 'payment']);
  });

  it.each(languages)('says nothing about paying in Telegram Stars, in %s', async (language) => {
    const form = await aFormOnThePage({ language });

    expect(form.text()).not.toContain('Telegram');
    expect(form.text()).not.toContain('Stars');
    expect(form.text()).toContain(wordsIn(language).checkoutPay);
  });

  describe('the press that pays', () => {
    it('starts a subscription with her token and confirms the setup it answers with', async () => {
      const form = await aFormOnThePage();

      await form.press(thePressThatPays);

      expect(form.calls).toHaveLength(1);
      expect(form.calls[0]?.address).toBe(WHERE_A_SUBSCRIPTION_STARTS);
      expect(form.calls[0]?.token.startsWith('Bearer ')).toBe(true);
      expect(form.did.submitted).toBe(1);
      expect(form.did.confirmed[0]?.clientSecret).toBe(A_CLIENT_SECRET);
    });

    it('leaves her on her account page once the setup is confirmed', async () => {
      const form = await aFormOnThePage();

      await form.press(thePressThatPays);

      expect(whereSheWentNext).toEqual(['/en/account/']);
    });

    it('asks the api nothing when the card form itself refuses what she typed', async () => {
      const form = await aFormOnThePage({
        stripe: fakeStripe({ submitRefuses: 'Your card number is incomplete.' }),
      });

      await form.press(thePressThatPays);

      expect(form.calls).toEqual([]);
      expect(form.did.confirmed).toEqual([]);
      expect(whereSheWentNext).toEqual([]);
    });

    it('keeps the form open on a refused card, and draws the words Stripe sent back', async () => {
      const refused = 'Your card was declined.';
      const form = await aFormOnThePage({ stripe: fakeStripe({ refuses: refused }) });

      await form.press(thePressThatPays);

      expect(form.text()).toContain(refused);
      expect(form.text()).toContain(thePressThatPays);
      expect(whereSheWentNext).toEqual([]);
    });

    it('says Emi could not start it when the route answers no secret', async () => {
      const form = await aFormOnThePage({ apiAnswers: false });

      await form.press(thePressThatPays);

      expect(form.text()).toContain(words.checkoutCouldNotStart);
      expect(form.did.confirmed).toEqual([]);
    });
  });

  describe('a device with no wallet', () => {
    it('draws neither wallet button and no line that says or pay by card', async () => {
      const form = await aFormOnThePage();

      await form.answerTheWalletEvent({ availablePaymentMethods: undefined });

      expect(form.text()).not.toContain(words.checkoutOrPayByCard);
      expect(form.text()).toContain(thePressThatPays);
    });

    it('draws that line once a wallet of the device answers the same event', async () => {
      const form = await aFormOnThePage();

      await form.answerTheWalletEvent({ availablePaymentMethods: { applePay: true } });

      expect(form.text()).toContain(words.checkoutOrPayByCard);
    });
  });

  describe('a build with no publishable key', () => {
    it('draws no payment form and says paying here is not open yet', async () => {
      const form = await aFormOnThePage({ publishableKey: '' });

      expect(form.text()).toBe(words.checkoutNoPaymentFormYet);
      expect(form.did.mounted).toEqual([]);
      expect(form.text()).not.toContain(thePressThatPays);
    });
  });
});

/** An instant long after this change, so a token naming it is a session that is still good. */
const SHE_IS_GOOD_UNTIL = 4_000_000_000;

/** An instant long before this change, so a token naming it is a session that has run out. */
const SHE_WAS_GOOD_UNTIL = 1_600_000_000;

/** What her browser holds, written the way a sign in writes it. */
function sheHolds(idToken: string): void {
  window.localStorage.setItem(
    THE_SESSION_ENTRY,
    JSON.stringify({ idToken, accessToken: 'access', refreshToken: 'refresh' }),
  );
}

/**
 * The whole page, mounted into a document as her browser mounts it.
 *
 * Stripe is put on the window before the page draws. The real module writes a script tag for the
 * library when it finds nothing there, and this file reaches no other company for anything.
 */
async function theCheckoutPageWhileSheHolds(idToken: string | null): Promise<HTMLElement> {
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = A_KEY;
  document.body.innerHTML = '';
  window.localStorage.clear();
  window.sessionStorage.clear();
  whereSheWentNext.length = 0;

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: 'https://myemi.app/en/checkout/',
      assign: (address: string) => whereSheWentNext.push(address),
      replace: (address: string) => whereSheWentNext.push(address),
    },
  });

  (window as unknown as { Stripe: () => TheStripeOnThePage }).Stripe = () => fakeStripe().stripe;

  if (idToken !== null) {
    sheHolds(idToken);
  }

  const where = document.createElement('div');

  document.body.append(where);

  const page = await CheckoutPage({ params: Promise.resolve({ lang: 'en' }) });

  await act(async () => {
    createRoot(where).render(page);
  });

  return where;
}

describe('the page she buys Emi on', () => {
  describe('a reader with no session', () => {
    it('reads nothing of the plan and nothing of the form', async () => {
      const page = await theCheckoutPageWhileSheHolds(null);

      expect(page.textContent).toBe('');
      expect(page.querySelectorAll('button')).toHaveLength(0);
      expect(page.querySelectorAll('input')).toHaveLength(0);
    });

    it('is moved to the page she signs in on, in the language she is reading', async () => {
      await theCheckoutPageWhileSheHolds(null);

      expect(whereSheWentNext).toEqual(['/en/sign-in/']);
    });

    it('is brought back to this page by the sign in, rather than to her account', async () => {
      await theCheckoutPageWhileSheHolds(null);

      expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBe('checkout/');
    });
  });

  describe('a session that has run out', () => {
    it('counts as no session, so she reads nothing and is moved to sign in again', async () => {
      const page = await theCheckoutPageWhileSheHolds(
        anIdToken(`${THE_APPLE_NAME}_000482910`, { exp: SHE_WAS_GOOD_UNTIL }),
      );

      expect(page.textContent).toBe('');
      expect(whereSheWentNext).toEqual(['/en/sign-in/']);
      expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBe('checkout/');
    });
  });

  describe('a woman who is signed in', () => {
    it.each([
      ['a token that names no instant at all', {}],
      ['a token good for years yet', { exp: SHE_IS_GOOD_UNTIL }],
    ])('reads the plan, the way she pays and the press that pays, with %s', async (_said, held) => {
      const page = await theCheckoutPageWhileSheHolds(
        anIdToken(`${THE_APPLE_NAME}_000482910`, held),
      );
      const said = page.textContent ?? '';

      expect(said).toContain(words.checkoutTitle);
      expect(said).toContain(words.checkoutSignedInWith.replace('{way}', 'Apple'));
      expect(said).toContain(words.checkoutPlanYearly);
      expect(said).toContain(words.checkoutPlanAmount);
      expect(said).toContain(words.checkoutPayByCard);
      expect(said).toContain(words.checkoutPayByCardWhere);
      expect(said).toContain(thePressThatPays);
      expect(said).toContain(words.checkoutCancelAnyTime);
      // She asked for this page and she is reading it, so nothing was kept and she was moved
      // nowhere at all.
      expect(whereSheWentNext).toEqual([]);
      expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBeNull();
    });
  });
});
