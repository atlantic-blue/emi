/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { wordsIn } from '../app/words';
import { ThePaymentForm } from '../components/thePaymentForm';
import { TheSignedInLine } from '../components/theSignedInLine';
import { THE_SESSION_ENTRY } from '../lib/theSessionSheHolds';
import type {
  AnElementOfStripe,
  TheElementsOfTheForm,
  TheStripeOnThePage,
} from '../lib/theStripeOnThePage';
import {
  THE_FIELD_A_SETUP_TRAVELS_IN,
  WHERE_A_SUBSCRIPTION_STARTS,
} from '../lib/theSubscriptionSheStarts';

/**
 * The form that takes her money, driven in a browser.
 *
 * Stripe is a double that answers what Stripe answers, and the api is a stub, so every case walks
 * the real component from the press to the state it leaves her in. Nothing here reaches a network
 * and no key of any kind is in this file.
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
const A_SETUP = 'seti_000000000001';
const A_CLIENT_SECRET = `${A_SETUP}_secret_000000000001`;

/**
 * The names the pool writes in front of the subject a provider gave, written out here rather than
 * read from the page, so a page that renamed one of them would be read saying the wrong thing.
 */
const THE_APPLE_NAME = 'SignInWithApple';
const THE_GOOGLE_NAME = 'Google';

/** The token she holds, which carries the one claim the line under the title reads. */
function anIdToken(userName: string): string {
  const part = (held: unknown): string =>
    btoa(JSON.stringify(held)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${part({ alg: 'RS256' })}.${part({ 'cognito:username': userName })}.signature`;
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
  options: {
    readonly refuses?: string;
    readonly submitRefuses?: string;
    /** Stripe takes the card and answers no setup, which names nothing to create against. */
    readonly confirmsNoSetup?: boolean;
  } = {},
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

        if (options.refuses !== undefined) {
          return Promise.resolve({ error: { message: options.refuses } });
        }

        return Promise.resolve(
          options.confirmsNoSetup === true ? {} : { setupIntent: { id: A_SETUP } },
        );
      },
    },
  };
}

/** One call the page made, as it left the browser. */
interface OneCall {
  readonly address: string;
  readonly method: string;
  readonly token: string;
  readonly body?: string;
}

/** How the api behaves, where a test wants something other than both calls answering. */
interface HowTheApiBehaves {
  /** No setup is opened, the way a route that could not reach Stripe refuses the press. */
  readonly refusesToStart?: boolean;
  /** The setup is opened and the subscription is refused, which is the second of the two calls. */
  readonly refusesToCreate?: boolean;
  /** The second call is taken and the route answers that nothing was created. */
  readonly createsNothing?: boolean;
}

/** The api, answering the press with the secret of a setup and the put with the subscription. */
function anApi(behaves: HowTheApiBehaves): {
  readonly asks: typeof fetch;
  readonly calls: OneCall[];
} {
  const calls: OneCall[] = [];

  const asks = ((where: unknown, asked: RequestInit) => {
    const headers = (asked.headers ?? {}) as Record<string, string>;
    const method = asked.method ?? 'GET';
    const body = asked.body === undefined ? undefined : String(asked.body);

    calls.push({
      address: String(where),
      method,
      token: headers.authorization ?? '',
      ...(body === undefined ? {} : { body }),
    });

    if (method === 'PUT') {
      return Promise.resolve({
        ok: behaves.refusesToCreate !== true,
        status: behaves.refusesToCreate === true ? 502 : 200,
        json: () => Promise.resolve({ started: behaves.createsNothing !== true }),
      } as Response);
    }

    return Promise.resolve({
      ok: behaves.refusesToStart !== true,
      status: behaves.refusesToStart === true ? 502 : 200,
      json: () => Promise.resolve({ clientSecret: A_CLIENT_SECRET }),
    } as Response);
  }) as unknown as typeof fetch;

  return { asks, calls };
}

interface ADrivenForm {
  readonly holder: HTMLElement;
  readonly did: WhatStripeDid;
  readonly calls: OneCall[];
  readonly press: (named: string) => Promise<void>;
  readonly answerTheWalletEvent: (said: Record<string, unknown>) => Promise<void>;
  /** The press of the wallet button of Stripe, which confirms through its own element. */
  readonly pressesTheWallet: () => Promise<void>;
  readonly text: () => string;
}

async function aFormOnThePage(
  options: {
    readonly publishableKey?: string;
    readonly stripe?: AFakeStripe;
    readonly signedIn?: boolean;
    readonly api?: HowTheApiBehaves;
  } = {},
): Promise<ADrivenForm> {
  const stripe = options.stripe ?? fakeStripe();
  const api = anApi(options.api ?? {});
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
        language="en"
        publishableKey={options.publishableKey ?? A_KEY}
        stripeArrives={() => Promise.resolve(stripe.stripe)}
        words={words}
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
    pressesTheWallet: async () => {
      await act(async () => {
        stripe.did.listeners.get('expressCheckout:confirm')?.({});
      });
    },
  };
}

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

  it('draws the two ways to pay, and opens on the card', async () => {
    const form = await aFormOnThePage();
    const pressed = [...form.holder.querySelectorAll('button[aria-pressed="true"]')];

    expect(form.text()).toContain(words.checkoutPayByCard);
    expect(form.text()).toContain(words.checkoutPayByStars);
    expect(pressed.map((button) => button.textContent)).toEqual([
      `${words.checkoutPayByCard}${words.checkoutPayByCardWhere}`,
    ]);
  });

  it('says Stars is not ready yet, and draws no press that would open nothing', async () => {
    const form = await aFormOnThePage();

    await form.press(words.checkoutPayByStars);

    expect(form.text()).toContain(words.checkoutStarsNotReady);
    expect(form.text()).not.toContain(thePressThatPays);
    expect([...form.holder.querySelectorAll('a')]).toEqual([]);
  });

  describe('the press that pays', () => {
    it('starts a subscription with her token and confirms the setup it answers with', async () => {
      const form = await aFormOnThePage();

      await form.press(thePressThatPays);

      expect(form.calls[0]?.address).toBe(WHERE_A_SUBSCRIPTION_STARTS);
      expect(form.calls[0]?.method).toBe('POST');
      expect(form.calls[0]?.token.startsWith('Bearer ')).toBe(true);
      expect(form.did.submitted).toBe(1);
      expect(form.did.confirmed[0]?.clientSecret).toBe(A_CLIENT_SECRET);
    });

    it('names the setup Stripe confirmed to Emi, which is what creates the subscription', async () => {
      const form = await aFormOnThePage();

      await form.press(thePressThatPays);

      expect(form.calls.map((call) => call.method)).toEqual(['POST', 'PUT']);
      expect(form.calls[1]?.address).toBe(WHERE_A_SUBSCRIPTION_STARTS);
      expect(form.calls[1]?.token).toBe(form.calls[0]?.token);
      expect(JSON.parse(form.calls[1]?.body ?? '{}')).toEqual({
        [THE_FIELD_A_SETUP_TRAVELS_IN]: A_SETUP,
      });
    });

    it('leaves her on her account page once the subscription is created', async () => {
      const form = await aFormOnThePage();

      await form.press(thePressThatPays);

      expect(whereSheWentNext).toEqual(['/en/account/']);
    });

    it('keeps her on the page with the line when the subscription is refused', async () => {
      const form = await aFormOnThePage({ api: { refusesToCreate: true } });

      await form.press(thePressThatPays);

      expect(form.text()).toContain(words.checkoutCouldNotStart);
      expect(form.text()).toContain(thePressThatPays);
      expect(whereSheWentNext).toEqual([]);
    });

    it('keeps her on the page when the route takes the setup and creates nothing', async () => {
      const form = await aFormOnThePage({ api: { createsNothing: true } });

      await form.press(thePressThatPays);

      expect(form.text()).toContain(words.checkoutCouldNotStart);
      expect(whereSheWentNext).toEqual([]);
    });

    it('creates nothing and keeps her on the page when Stripe names no setup', async () => {
      const form = await aFormOnThePage({ stripe: fakeStripe({ confirmsNoSetup: true }) });

      await form.press(thePressThatPays);

      expect(form.calls.map((call) => call.method)).toEqual(['POST']);
      expect(form.text()).toContain(words.checkoutCouldNotStart);
      expect(whereSheWentNext).toEqual([]);
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
      const form = await aFormOnThePage({ api: { refusesToStart: true } });

      await form.press(thePressThatPays);

      expect(form.text()).toContain(words.checkoutCouldNotStart);
      expect(form.did.confirmed).toEqual([]);
    });
  });

  describe('the wallet of her device, which confirms through the element of Stripe', () => {
    it('makes both calls and lands her, the way the press that pays does', async () => {
      const form = await aFormOnThePage();

      await form.answerTheWalletEvent({ availablePaymentMethods: { applePay: true } });
      await form.pressesTheWallet();

      expect(form.calls.map((call) => call.method)).toEqual(['POST', 'PUT']);
      expect(JSON.parse(form.calls[1]?.body ?? '{}')).toEqual({
        [THE_FIELD_A_SETUP_TRAVELS_IN]: A_SETUP,
      });
      expect(whereSheWentNext).toEqual(['/en/account/']);
    });

    it('keeps her on the page with the line when that subscription is refused', async () => {
      const form = await aFormOnThePage({ api: { refusesToCreate: true } });

      await form.pressesTheWallet();

      expect(form.text()).toContain(words.checkoutCouldNotStart);
      expect(whereSheWentNext).toEqual([]);
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
