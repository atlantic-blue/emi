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
import { WHERE_A_SUBSCRIPTION_STARTS } from '../lib/theSubscriptionSheStarts';

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
const A_CLIENT_SECRET = 'seti_000000000001_secret_000000000001';

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

/** One element Stripe drew: what it draws, the node it went into, and the group it belongs to. */
interface WhereAnElementWent {
  readonly kind: string;
  readonly into: HTMLElement;
  readonly group: TheElementsOfTheForm;
}

interface WhatStripeDid {
  readonly mounted: string[];
  /** Where each element went, so a test reads which of them the page she is looking at holds. */
  readonly went: WhereAnElementWent[];
  readonly destroyed: string[];
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
    went: [],
    destroyed: [],
    confirmed: [],
    submitted: 0,
    listeners: new Map(),
  };

  const element = (kind: string, group: TheElementsOfTheForm): AnElementOfStripe => ({
    mount: (into) => {
      did.mounted.push(kind);
      did.went.push({ kind, into, group });
    },
    on: (event, listen) => did.listeners.set(`${kind}:${event}`, listen),
    destroy: () => did.destroyed.push(kind),
  });

  // Stripe answers a group of its own to each call, and an element belongs to the group that made
  // it, so a group the page took away is not the group it is drawing now.
  const aGroupOfElements = (): TheElementsOfTheForm => {
    const group: TheElementsOfTheForm = {
      create: (kind) => element(kind, group),
      submit: () => {
        did.submitted += 1;

        return Promise.resolve(
          options.submitRefuses === undefined ? {} : { error: { message: options.submitRefuses } },
        );
      },
    };

    return group;
  };

  return {
    did,
    stripe: {
      elements: () => aGroupOfElements(),
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
  /** The press of a wallet of the device, which Stripe reports on its own element. */
  readonly pressesTheWallet: () => Promise<void>;
  /** Lets the library arrive, where the form was built to hold it back. */
  readonly letsStripeArrive: () => Promise<void>;
  readonly text: () => string;
}

/**
 * What she is looking at: the elements of Stripe that went into a node the page holds now. An
 * element that went into a node the page took away is drawn nowhere she can see it.
 */
const theElementsOnThePage = (form: ADrivenForm): WhereAnElementWent[] =>
  form.did.went.filter((drawn) => form.holder.contains(drawn.into));

async function aFormOnThePage(
  options: {
    readonly publishableKey?: string;
    readonly stripe?: AFakeStripe;
    readonly signedIn?: boolean;
    readonly apiAnswers?: boolean;
    /**
     * Holds the library back until the test lets it arrive. The real one is fetched over a
     * network, so it lands after the press that asked for it, and she may have moved on by then.
     */
    readonly stripeArrivesLate?: boolean;
  } = {},
): Promise<ADrivenForm> {
  const stripe = options.stripe ?? fakeStripe();
  const api = anApi({ ok: options.apiAnswers ?? true });
  const holder = document.createElement('div');
  let itArrives = (): void => undefined;
  const theArrival =
    options.stripeArrivesLate === true
      ? new Promise<void>((answer) => {
          itArrives = () => answer();
        })
      : Promise.resolve();

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
        stripeArrives={() => theArrival.then(() => stripe.stripe)}
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
    letsStripeArrive: async () => {
      await act(async () => {
        itArrives();
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

  describe('the way back from the Stars panel', () => {
    it('draws the wallets and the card form into the elements of the page she is on', async () => {
      const form = await aFormOnThePage();

      await form.press(words.checkoutPayByStars);
      await form.press(words.checkoutPayByCard);

      expect(theElementsOnThePage(form).map((drawn) => drawn.kind)).toEqual([
        'expressCheckout',
        'payment',
      ]);
      expect(form.did.mounted).toEqual([
        'expressCheckout',
        'payment',
        'expressCheckout',
        'payment',
      ]);
    });

    it('takes the wallets and the card form of the panel it left off the page', async () => {
      const form = await aFormOnThePage();

      await form.press(words.checkoutPayByStars);

      expect(form.did.destroyed).toEqual(['expressCheckout', 'payment']);
      expect(theElementsOnThePage(form)).toEqual([]);
    });

    it('pays on the card form she is looking at, and leaves her on her account page', async () => {
      const form = await aFormOnThePage();

      await form.press(words.checkoutPayByStars);
      await form.press(words.checkoutPayByCard);
      await form.press(thePressThatPays);

      expect(theElementsOnThePage(form)).toHaveLength(2);
      expect(form.did.confirmed[0]?.elements).toBe(theElementsOnThePage(form)[0]?.group);
      expect(form.did.submitted).toBe(1);
      expect(whereSheWentNext).toEqual(['/en/account/']);
    });

    it('pays on the wallet she is looking at, when she presses that instead', async () => {
      const form = await aFormOnThePage();

      await form.press(words.checkoutPayByStars);
      await form.press(words.checkoutPayByCard);
      await form.pressesTheWallet();

      expect(theElementsOnThePage(form)).toHaveLength(2);
      expect(form.did.confirmed[0]?.elements).toBe(theElementsOnThePage(form)[0]?.group);
      expect(whereSheWentNext).toEqual(['/en/account/']);
    });

    it('draws nothing at all where Stripe arrives after she picked Stars', async () => {
      const form = await aFormOnThePage({ stripeArrivesLate: true });

      await form.press(words.checkoutPayByStars);
      await form.letsStripeArrive();

      expect(form.did.mounted).toEqual([]);
      expect(theElementsOnThePage(form)).toEqual([]);
    });

    it('draws on the element of the page where Stripe arrives after she came back', async () => {
      const form = await aFormOnThePage({ stripeArrivesLate: true });

      await form.press(words.checkoutPayByStars);
      await form.press(words.checkoutPayByCard);
      await form.letsStripeArrive();

      expect(theElementsOnThePage(form).map((drawn) => drawn.kind)).toEqual([
        'expressCheckout',
        'payment',
      ]);
      expect(form.did.mounted).toEqual(['expressCheckout', 'payment']);
    });
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
