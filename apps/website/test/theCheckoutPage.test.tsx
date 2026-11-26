/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import CheckoutPage from '../app/[lang]/checkout/page';
import { type Language, type SiteWords, languages, wordsIn } from '../app/words';
import { ThePaymentForm, WHERE_THE_TERMS_ARE } from '../components/thePaymentForm';
import { TheSignedInLine } from '../components/theSignedInLine';
import { THE_SESSION_ENTRY } from '../lib/theSessionSheHolds';
import { theTermsPageIsBuilt } from '../lib/theTermsPage';
import { everyPageTheSiteServes } from '../tools/theFilesACrawlerReads';
import type {
  AnElementOfStripe,
  TheElementsOfTheForm,
  TheStripeOnThePage,
} from '../lib/theStripeOnThePage';
import { THE_BLACK_FRIDAY_OFFER } from '../lib/theBlackFridayOffer';
import { THE_OFFER_IN_AN_ADDRESS } from '../lib/theOfferSheArrivedWith';
import {
  THE_FIELD_AN_OFFER_TRAVELS_IN,
  THE_FIELD_A_SETUP_TRAVELS_IN,
  WHERE_A_SUBSCRIPTION_STARTS,
} from '../lib/theSubscriptionSheStarts';
import {
  SHE_ALREADY_HOLDS_EMI,
  THE_OFFER_PRICE_IN_STARS,
  THE_PRICE_IN_STARS,
  WHERE_A_STARS_INVOICE_IS_MADE,
} from '../lib/thePaymentInStars';
import {
  WHERE_SHE_WAS_GOING_ENTRY,
  WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY,
} from '../lib/whereASignInComesBackTo';

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

/** A minute before the Black Friday offer closes, and the instant it closes at. */
const WHILE_THE_OFFER_IS_OPEN = new Date('2026-11-30T22:59:00.000Z');
const ONCE_THE_OFFER_HAS_CLOSED = new Date('2026-11-30T23:00:00.000Z');

/** Where her browser was told to go, which is the end of this page in a browser. */
const whereSheWentNext: string[] = [];
const A_SETUP = 'seti_000000000001';

/** The invoice the Stars route answers with. Telegram issued no such thing: the double wrote it. */
const THE_INVOICE = 'https://t.me/$the-double-wrote-this';

/** The secret of the invoice a plan with no free month leaves to be paid. Not a real one. */
const THE_SECRET_OF_THE_FIRST_INVOICE = 'in_000000000001_secret_the-double-wrote-this';
const A_CLIENT_SECRET = `${A_SETUP}_secret_000000000001`;

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
  /** Each charge it was asked to confirm, which is what a plan with no free month needs. */
  readonly paid: Record<string, unknown>[];
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
    /** Her bank refuses the one charge of a plan with no free month, or it never arrives. */
    readonly refusesTheCharge?: string;
  } = {},
): AFakeStripe {
  const did: WhatStripeDid = {
    mounted: [],
    went: [],
    destroyed: [],
    confirmed: [],
    paid: [],
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

        if (options.refuses !== undefined) {
          return Promise.resolve({ error: { message: options.refuses } });
        }

        return Promise.resolve(
          options.confirmsNoSetup === true ? {} : { setupIntent: { id: A_SETUP } },
        );
      },
      confirmPayment: (asked) => {
        did.paid.push(asked);

        return Promise.resolve(
          options.refusesTheCharge === undefined
            ? {}
            : { error: { message: options.refusesTheCharge } },
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
  /** The route creates one on the offer and names no charge to confirm, which buys her nothing. */
  readonly answersNoPaymentSecret?: boolean;
  /** What the Stars invoice route answers, where a case wants something other than the invoice. */
  readonly theStarsRouteAnswers?: number;
  /** The address it answers with, where a case wants one Telegram would never have issued. */
  readonly theInvoiceOpens?: string;
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

    if (String(where) === WHERE_A_STARS_INVOICE_IS_MADE) {
      const status = behaves.theStarsRouteAnswers ?? 200;

      return Promise.resolve({
        ok: status === 200,
        status,
        json: () =>
          Promise.resolve(
            status === 200 ? { invoiceLink: behaves.theInvoiceOpens ?? THE_INVOICE } : {},
          ),
      } as Response);
    }

    if (method === 'PUT') {
      // The route answers the secret of the first invoice for a plan with no free month, which is
      // every plan bought on an offer, and nothing of the kind for the one price.
      const onAnOffer = (body ?? '').includes(THE_FIELD_AN_OFFER_TRAVELS_IN);

      return Promise.resolve({
        ok: behaves.refusesToCreate !== true,
        status: behaves.refusesToCreate === true ? 502 : 200,
        json: () =>
          Promise.resolve({
            started: behaves.createsNothing !== true,
            ...(onAnOffer && behaves.answersNoPaymentSecret !== true
              ? { paymentSecret: THE_SECRET_OF_THE_FIRST_INVOICE }
              : {}),
          }),
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
  /** Lets the library arrive, where the form was built to hold it back. */
  readonly letsStripeArrive: () => Promise<void>;
  /** The page goes out from under the form, which is what leaving it does to every node of it. */
  readonly sheLeavesThePage: () => Promise<void>;
  readonly text: () => string;
}

/**
 * What she is looking at: the elements of Stripe that went into a node the holder still holds. An
 * element that went into a node the page took away is drawn nowhere she can see it.
 */
const theElementsIn = (holder: HTMLElement, did: WhatStripeDid): WhereAnElementWent[] =>
  did.went.filter((drawn) => holder.contains(drawn.into));

const theElementsOnThePage = (form: ADrivenForm): WhereAnElementWent[] =>
  theElementsIn(form.holder, form.did);

/** The two elements the page draws, in the order Stripe is asked for them. */
const THE_PAIR = ['expressCheckout', 'payment'];

async function aFormOnThePage(
  options: {
    readonly publishableKey?: string;
    readonly stripe?: AFakeStripe;
    readonly signedIn?: boolean;
    readonly api?: HowTheApiBehaves;
    readonly language?: Language;
    /**
     * Holds the library back until the test lets it arrive. The real one is fetched over a
     * network, so it lands after the press that asked for it, and she may have moved on by then.
     */
    readonly stripeArrivesLate?: boolean;
    /** The address she opened the page on, which is what carries an offer. */
    readonly search?: string;
    /** When she is reading it, which is what says whether an offer she arrived with is open. */
    readonly now?: Date;
    /** Whether the site serves a terms page, which is what the terms line reads. */
    readonly theTermsHaveAPage?: boolean;
  } = {},
): Promise<ADrivenForm> {
  const language = options.language ?? 'en';
  const search = options.search ?? '';
  const stripe = options.stripe ?? fakeStripe();
  const api = anApi(options.api ?? {});
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
      href: `https://myemi.app/en/checkout/${search}`,
      search,
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
        now={options.now}
        publishableKey={options.publishableKey ?? A_KEY}
        stripeArrives={() => theArrival.then(() => stripe.stripe)}
        theTermsHaveAPage={options.theTermsHaveAPage}
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
    sheLeavesThePage: async () => {
      await act(async () => {
        root.unmount();
      });
    },
  };
}

beforeEach(() => {
  // React draws nothing outside an act environment, and the runner sets no such flag of its own.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // A case that moved the clock leaves it moved for every case after it, and the offer those
  // cases read is decided by the clock.
  jest.useRealTimers();
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

  it('draws the two ways to pay, and opens on the card', async () => {
    const form = await aFormOnThePage();
    const pressed = [...form.holder.querySelectorAll('button[aria-pressed="true"]')];

    expect(form.text()).toContain(words.checkoutPayByCard);
    expect(form.text()).toContain(words.checkoutPayByStars);
    expect(pressed.map((button) => button.textContent)).toEqual([
      `${words.checkoutPayByCard}${words.checkoutPayByCardWhere}`,
    ]);
  });

  it('draws the two choices and the press that pays, and nothing else to press', async () => {
    const form = await aFormOnThePage();
    const presses = [...form.holder.querySelectorAll('button')];

    expect(presses.map((press) => press.textContent)).toEqual([
      `${words.checkoutPayByCard}${words.checkoutPayByCardWhere}`,
      `${words.checkoutPayByStars}${words.checkoutPayByStarsWhere}`,
      thePressThatPays,
    ]);
    expect(form.did.mounted).toEqual(['expressCheckout', 'payment']);
  });

  it.each(languages)('names both ways she can pay in her own language, in %s', async (language) => {
    const said = wordsIn(language);
    const form = await aFormOnThePage({ language });

    expect(form.text()).toContain(said.checkoutPayByCard);
    expect(form.text()).toContain(said.checkoutPayByStarsWhere);
    expect(form.text()).toContain(said.checkoutPay);
  });

  describe('the page she was reading going away under the form', () => {
    it('destroys the wallets and the card form, rather than leaving them in a gone node', async () => {
      const form = await aFormOnThePage();

      await form.sheLeavesThePage();

      expect(form.did.destroyed).toEqual(['expressCheckout', 'payment']);
      expect(theElementsOnThePage(form)).toEqual([]);
    });

    it('draws nothing at all where Stripe arrives after the form went away', async () => {
      const form = await aFormOnThePage({ stripeArrivesLate: true });

      await form.sheLeavesThePage();
      await form.letsStripeArrive();

      expect(form.did.mounted).toEqual([]);
      expect(theElementsOnThePage(form)).toEqual([]);
    });
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

  describe('the terms she agrees to by paying', () => {
    it('says the line the board says, with the terms named inside the sentence', async () => {
      const form = await aFormOnThePage();

      expect(form.text()).toContain(
        words.checkoutTerms.replace('{terms}', words.checkoutTermsLink),
      );
    });

    it('offers her no press at all while the site serves no terms page', async () => {
      const form = await aFormOnThePage();

      expect(theTermsPageIsBuilt).toBe(false);
      expect(
        [...form.holder.querySelectorAll('a[href]')].map((press) => press.getAttribute('href')),
      ).toEqual([]);
    });

    it('presses to the terms once the site serves them', async () => {
      const form = await aFormOnThePage({ theTermsHaveAPage: true });

      expect(
        [...form.holder.querySelectorAll('a[href]')].map((press) => ({
          address: press.getAttribute('href'),
          called: press.textContent,
        })),
      ).toEqual([{ address: `/en/${WHERE_THE_TERMS_ARE}`, called: words.checkoutTermsLink }]);
    });

    it('is held back because the site answers 404 for that address', () => {
      // The one list that says which addresses the site answers. A press to a page nobody has
      // built answers 404 with the Emi page, at the moment she decides to pay, so the day the
      // page joins this list is the day `theTermsPageIsBuilt` turns true and this case says so.
      expect(everyPageTheSiteServes().map((page) => page.path)).not.toContain(WHERE_THE_TERMS_ARE);
      expect(theTermsPageIsBuilt).toBe(false);
    });
  });

  /**
   * The Telegram Stars choice, from the row she presses to the address her browser is handed.
   *
   * The route is a double of the contract it is built to: the invoice, the refusal of a woman who
   * already holds Emi, and a refusal of any other kind. Nothing here reaches Telegram, and the
   * invoice in this file was written by the double.
   */
  describe('the Telegram Stars choice', () => {
    const onTheOffer = `?${THE_OFFER_IN_AN_ADDRESS}=${THE_BLACK_FRIDAY_OFFER}`;

    /** The one call that choice makes, read off everything the form asked for. */
    const theInvoiceItAskedFor = (form: ADrivenForm): OneCall | undefined =>
      form.calls.find((call) => call.address === WHERE_A_STARS_INVOICE_IS_MADE);

    /** The count of Stars the panel says, written into the sentence the way the page writes it. */
    const theCountItAsksFor = (said: SiteWords, stars: number): string =>
      said.checkoutStarsPrice.replace('{stars}', `${stars}`);

    /** Opens the choice, then presses the one press behind it. */
    async function sheOpensTheBot(form: ADrivenForm): Promise<void> {
      await form.press(words.checkoutPayByStars);
      await form.press(words.checkoutStarsOpenTheBot);
    }

    it.each(languages)(
      'says what a year costs in Stars, and what it buys, in %s',
      async (language) => {
        const said = wordsIn(language);
        const form = await aFormOnThePage({ language });

        await form.press(said.checkoutPayByStars);

        expect(form.text()).toContain(theCountItAsksFor(said, THE_PRICE_IN_STARS));
        expect(form.text()).toContain(said.checkoutStarsOneYear);
        expect(form.text()).toContain(said.checkoutStarsComeBack);
        expect(form.text()).toContain(said.checkoutStarsOpenTheBot);
      },
    );

    it.each(languages)('asks for half of that while the offer is open, in %s', async (language) => {
      const said = wordsIn(language);
      const form = await aFormOnThePage({
        language,
        now: WHILE_THE_OFFER_IS_OPEN,
        search: onTheOffer,
      });

      await form.press(said.checkoutPayByStars);

      expect(form.text()).toContain(theCountItAsksFor(said, THE_OFFER_PRICE_IN_STARS));
      expect(form.text()).not.toContain(theCountItAsksFor(said, THE_PRICE_IN_STARS));
    });

    it.each(languages)(
      'asks for the whole count once the offer has closed, in %s',
      async (language) => {
        const said = wordsIn(language);
        const form = await aFormOnThePage({
          language,
          now: ONCE_THE_OFFER_HAS_CLOSED,
          search: onTheOffer,
        });

        await form.press(said.checkoutPayByStars);

        expect(form.text()).toContain(theCountItAsksFor(said, THE_PRICE_IN_STARS));
        expect(form.text()).not.toContain(theCountItAsksFor(said, THE_OFFER_PRICE_IN_STARS));
      },
    );

    it('asks for the whole count for a woman who arrived with no offer at all', async () => {
      const form = await aFormOnThePage({ now: WHILE_THE_OFFER_IS_OPEN });

      await form.press(words.checkoutPayByStars);

      expect(form.text()).toContain(theCountItAsksFor(words, THE_PRICE_IN_STARS));
    });

    it('asks for the whole count on a value nobody approved', async () => {
      const form = await aFormOnThePage({
        now: WHILE_THE_OFFER_IS_OPEN,
        search: '?offer=half-off-for-ever',
      });

      await form.press(words.checkoutPayByStars);

      expect(form.text()).toContain(theCountItAsksFor(words, THE_PRICE_IN_STARS));
    });

    it('promises no free month, which belongs to the one price and to nothing else', async () => {
      const form = await aFormOnThePage();

      await form.press(words.checkoutPayByStars);

      expect(form.text().toLocaleLowerCase()).not.toContain('free');
      expect(words.checkoutStarsOneYear).toContain('does not renew');
    });

    it('asks Emi for nothing at all until she presses', async () => {
      const form = await aFormOnThePage();

      await form.press(words.checkoutPayByStars);

      expect(form.calls).toEqual([]);
      expect(whereSheWentNext).toEqual([]);
    });

    describe('the press that opens the bot', () => {
      it('asks the route for an invoice with her token, and names no offer', async () => {
        const form = await aFormOnThePage();

        await sheOpensTheBot(form);

        expect(theInvoiceItAskedFor(form)?.method).toBe('POST');
        expect(theInvoiceItAskedFor(form)?.token.startsWith('Bearer ')).toBe(true);
        expect(JSON.parse(theInvoiceItAskedFor(form)?.body ?? '')).toEqual({});
      });

      it('leaves her in Telegram, on the invoice the route answered with', async () => {
        const form = await aFormOnThePage();

        await sheOpensTheBot(form);

        expect(whereSheWentNext).toEqual([THE_INVOICE]);
      });

      it('names the offer while it is open, so the route halves the count', async () => {
        const form = await aFormOnThePage({ now: WHILE_THE_OFFER_IS_OPEN, search: onTheOffer });

        await sheOpensTheBot(form);

        expect(JSON.parse(theInvoiceItAskedFor(form)?.body ?? '')).toEqual({
          [THE_FIELD_AN_OFFER_TRAVELS_IN]: THE_BLACK_FRIDAY_OFFER,
        });
        expect(whereSheWentNext).toEqual([THE_INVOICE]);
      });

      it('names no offer once it has closed, so she is asked for the whole count', async () => {
        const form = await aFormOnThePage({ now: ONCE_THE_OFFER_HAS_CLOSED, search: onTheOffer });

        await sheOpensTheBot(form);

        expect(JSON.parse(theInvoiceItAskedFor(form)?.body ?? '')).toEqual({});
      });

      it('names no offer for a value nobody approved', async () => {
        const form = await aFormOnThePage({
          now: WHILE_THE_OFFER_IS_OPEN,
          search: '?offer=half-off-for-ever',
        });

        await sheOpensTheBot(form);

        expect(JSON.parse(theInvoiceItAskedFor(form)?.body ?? '')).toEqual({});
      });

      it('says she already has Emi where the route refuses the press with that', async () => {
        const form = await aFormOnThePage({ api: { theStarsRouteAnswers: SHE_ALREADY_HOLDS_EMI } });

        await sheOpensTheBot(form);

        expect(form.text()).toContain(words.checkoutStarsAlreadyPaid);
        expect(form.text()).not.toContain(words.checkoutStarsNothingTaken);
        expect(whereSheWentNext).toEqual([]);
      });

      it('says nothing was taken where the route refuses it any other way', async () => {
        const form = await aFormOnThePage({ api: { theStarsRouteAnswers: 502 } });

        await sheOpensTheBot(form);

        expect(form.text()).toContain(words.checkoutStarsNothingTaken);
        expect(form.text()).not.toContain(words.checkoutStarsAlreadyPaid);
        expect(whereSheWentNext).toEqual([]);
      });

      it('says the same for an invoice that would open a host nobody approved', async () => {
        const form = await aFormOnThePage({
          api: { theInvoiceOpens: 'https://not-telegram.example/pay' },
        });

        await sheOpensTheBot(form);

        expect(form.text()).toContain(words.checkoutStarsNothingTaken);
        expect(whereSheWentNext).toEqual([]);
      });

      it('lets her press again after a refusal, which is the whole of what she can do', async () => {
        const form = await aFormOnThePage({ api: { theStarsRouteAnswers: 502 } });

        await sheOpensTheBot(form);
        await form.press(words.checkoutStarsOpenTheBot);

        expect(
          form.calls.filter((call) => call.address === WHERE_A_STARS_INVOICE_IS_MADE),
        ).toHaveLength(2);
      });
    });

    describe('switching between the two choices', () => {
      it('takes the wallets and the card form off the page while she reads this one', async () => {
        const form = await aFormOnThePage();

        await form.press(words.checkoutPayByStars);

        expect(form.did.destroyed).toEqual(THE_PAIR);
        expect(theElementsOnThePage(form)).toEqual([]);
        expect(form.text()).not.toContain(thePressThatPays);
      });

      it('mounts both of them again, into the elements the card choice draws this time', async () => {
        const form = await aFormOnThePage();

        await form.press(words.checkoutPayByStars);
        await form.press(words.checkoutPayByCard);

        expect(form.did.mounted).toEqual([...THE_PAIR, ...THE_PAIR]);
        expect(theElementsOnThePage(form).map((drawn) => drawn.kind)).toEqual(THE_PAIR);
        expect(form.text()).toContain(thePressThatPays);
      });

      it('pays on the card form she came back to, and nothing of the first', async () => {
        const form = await aFormOnThePage();

        await form.press(words.checkoutPayByStars);
        await form.press(words.checkoutPayByCard);
        await form.press(thePressThatPays);

        const onThePage = theElementsOnThePage(form);

        expect(onThePage).toHaveLength(2);
        expect(form.did.confirmed[0]?.elements).toBe(onThePage[0]?.group);
        expect(whereSheWentNext).toEqual(['/en/account/']);
      });

      it('takes the line of one choice off the other, because it is not about it', async () => {
        const form = await aFormOnThePage({ api: { refusesToStart: true } });

        await form.press(thePressThatPays);

        expect(form.text()).toContain(words.checkoutCouldNotStart);

        await form.press(words.checkoutPayByStars);

        expect(form.text()).not.toContain(words.checkoutCouldNotStart);
      });
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
/**
 * The page of the last case, which is unmounted before the next one draws. A browser holds one
 * page at a time, and a page left mounted here still listens for the word that her session
 * changed, so it would draw its own form again on an event a later case sent.
 */
let theLastPage: ReturnType<typeof createRoot> | null = null;

async function theCheckoutPageWhileSheHolds(
  idToken: string | null,
  stripe: AFakeStripe = fakeStripe(),
  /** The address she opened, and the instant she opened it at, which decide the price she reads. */
  reading: { readonly search?: string; readonly now?: Date } = {},
): Promise<HTMLElement> {
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = A_KEY;

  if (theLastPage !== null) {
    await act(async () => {
      theLastPage?.unmount();
    });
  }

  document.body.innerHTML = '';
  window.localStorage.clear();
  window.sessionStorage.clear();
  whereSheWentNext.length = 0;

  const search = reading.search ?? '';

  // The page reads the clock for itself, the way it does in her browser, so the instant is moved
  // rather than handed in. Nothing else of the runner is faked: React flushes on microtasks and a
  // faked one leaves every render of this file waiting for a tick nobody advances.
  if (reading.now !== undefined) {
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'performance'],
      now: reading.now,
    });
  }

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: `https://myemi.app/en/checkout/${search}`,
      search,
      assign: (address: string) => whereSheWentNext.push(address),
      replace: (address: string) => whereSheWentNext.push(address),
    },
  });

  (window as unknown as { Stripe: () => TheStripeOnThePage }).Stripe = () => stripe.stripe;

  if (idToken !== null) {
    sheHolds(idToken);
  }

  const where = document.createElement('div');

  document.body.append(where);

  const page = await CheckoutPage({ params: Promise.resolve({ lang: 'en' }) });

  theLastPage = createRoot(where);

  await act(async () => {
    theLastPage?.render(page);
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
      expect(said).toContain(words.checkoutPayByStars);
      expect(said).toContain(words.checkoutPayByStarsWhere);
      expect(said).toContain(thePressThatPays);
      expect(said).toContain(words.checkoutCancelAnyTime);
      // She asked for this page and she is reading it, so nothing was kept and she was moved
      // nowhere at all.
      expect(whereSheWentNext).toEqual([]);
      expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBeNull();
    });
  });

  /**
   * The Black Friday offer, from the address the landing page sends her to through to the body
   * the press puts on the wire.
   *
   * The clock is moved rather than handed in, because the page reads it for itself in her
   * browser, and a case that read the real clock would start failing on the first of December.
   */
  describe('a woman who arrived on the Black Friday offer', () => {
    const herToken = (): string => anIdToken(`${THE_APPLE_NAME}_000482910`);
    const onTheOffer = `?${THE_OFFER_IN_AN_ADDRESS}=${THE_BLACK_FRIDAY_OFFER}`;

    it('reads the halved amount, that it is half price every year, and the free month', async () => {
      const page = await theCheckoutPageWhileSheHolds(herToken(), fakeStripe(), {
        search: onTheOffer,
        now: WHILE_THE_OFFER_IS_OPEN,
      });
      const said = page.textContent ?? '';

      expect(said).toContain(words.checkoutOfferAmount);
      expect(said).toContain(words.checkoutOfferEveryYear);
      expect(said).toContain(words.checkoutOfferRenews);
      expect(said).toContain(words.checkoutOfferPrice);
      expect(said).toContain(words.checkoutOfferPay);
      // The one price is nowhere on the page she is reading, or she reads two amounts at once.
      expect(said).not.toContain(words.checkoutPlanAmount);
      expect(said).not.toContain(words.checkoutPay);
    });

    /**
     * The free month belongs to the one price. A woman who arrives on the offer is charged half of
     * the year the moment she presses, so the halved sentence promises her no month.
     */
    it('reads no free month in the halved sentence, because she pays at once', async () => {
      const page = await theCheckoutPageWhileSheHolds(herToken(), fakeStripe(), {
        search: onTheOffer,
        now: WHILE_THE_OFFER_IS_OPEN,
      });
      const said = page.textContent ?? '';

      expect(words.checkoutOfferPrice).not.toContain('One month free');
      expect(said).toContain(words.checkoutOfferPrice);
      expect(said).not.toContain('One month free');
      expect(said).not.toContain(words.checkoutPrice);
    });

    it('still reads the free month at the one price, which keeps it', async () => {
      const page = await theCheckoutPageWhileSheHolds(herToken(), fakeStripe(), {
        now: WHILE_THE_OFFER_IS_OPEN,
      });

      expect(words.checkoutPrice).toContain('One month free');
      expect(page.textContent ?? '').toContain('One month free');
    });

    it('reads the one price once the offer has closed, however the address reads', async () => {
      const page = await theCheckoutPageWhileSheHolds(herToken(), fakeStripe(), {
        search: onTheOffer,
        now: ONCE_THE_OFFER_HAS_CLOSED,
      });
      const said = page.textContent ?? '';

      expect(said).toContain(words.checkoutPlanAmount);
      expect(said).toContain(words.checkoutPrice);
      expect(said).toContain(words.checkoutPay);
      expect(said).not.toContain(words.checkoutOfferAmount);
      expect(said).not.toContain(words.checkoutOfferPay);
    });

    /**
     * An address is a thing anybody may type, so every value but the one the operator approved
     * leaves the page asking the one price.
     */
    it.each([
      '',
      '?offer=',
      '?offer=half-off-for-ever',
      '?offer=BLACK-FRIDAY',
      '?offer=black-friday-2025',
      '?offers=black-friday',
    ])('reads the one price on %s, while the offer is open', async (search) => {
      const page = await theCheckoutPageWhileSheHolds(herToken(), fakeStripe(), {
        search,
        now: WHILE_THE_OFFER_IS_OPEN,
      });
      const said = page.textContent ?? '';

      expect(said).toContain(words.checkoutPlanAmount);
      expect(said).toContain(words.checkoutPay);
      expect(said).not.toContain(words.checkoutOfferAmount);
    });

    it.each(languages)('reads the halved amount of her own language, in %s', async (language) => {
      const said = wordsIn(language);
      const form = await aFormOnThePage({
        language,
        now: WHILE_THE_OFFER_IS_OPEN,
        search: onTheOffer,
      });

      expect(form.text()).toContain(said.checkoutOfferPay);
      expect(form.text()).not.toContain(said.checkoutPay);
    });

    describe('the press that pays on the offer', () => {
      /** The body the second call put on the wire, read as the fields the route reads. */
      const theBodyOfTheCreate = (form: ADrivenForm): Record<string, unknown> =>
        JSON.parse(form.calls.find((call) => call.method === 'PUT')?.body ?? '{}');

      it('names the offer beside the setup, and nothing else at all', async () => {
        const form = await aFormOnThePage({ now: WHILE_THE_OFFER_IS_OPEN, search: onTheOffer });

        await form.press(wordsIn('en').checkoutOfferPay);

        expect(theBodyOfTheCreate(form)).toEqual({
          [THE_FIELD_A_SETUP_TRAVELS_IN]: A_SETUP,
          [THE_FIELD_AN_OFFER_TRAVELS_IN]: THE_BLACK_FRIDAY_OFFER,
        });
      });

      it('names no offer once the offer has closed, so she is charged the one price', async () => {
        const form = await aFormOnThePage({ now: ONCE_THE_OFFER_HAS_CLOSED, search: onTheOffer });

        await form.press(thePressThatPays);

        expect(theBodyOfTheCreate(form)).toEqual({ [THE_FIELD_A_SETUP_TRAVELS_IN]: A_SETUP });
      });

      it('names no offer for a woman who arrived with none', async () => {
        const form = await aFormOnThePage({ now: WHILE_THE_OFFER_IS_OPEN });

        await form.press(thePressThatPays);

        expect(theBodyOfTheCreate(form)).toEqual({ [THE_FIELD_A_SETUP_TRAVELS_IN]: A_SETUP });
      });

      it('names no offer for a value nobody approved', async () => {
        const form = await aFormOnThePage({
          now: WHILE_THE_OFFER_IS_OPEN,
          search: '?offer=half-off-for-ever',
        });

        await form.press(thePressThatPays);

        expect(theBodyOfTheCreate(form)).toEqual({ [THE_FIELD_A_SETUP_TRAVELS_IN]: A_SETUP });
      });

      it('leaves her on her account, the way a press at the one price does', async () => {
        const form = await aFormOnThePage({ now: WHILE_THE_OFFER_IS_OPEN, search: onTheOffer });

        await form.press(wordsIn('en').checkoutOfferPay);

        expect(whereSheWentNext).toEqual(['/en/account/']);
      });

      /**
       * The one charge of the offer. Her card is on the customer by the time the create is made,
       * so the only thing left is the charge itself and the question her bank may ask about it,
       * which Stripe asks in front of her rather than against a payment made while she is gone.
       */
      it('confirms the charge the route answered with, and then leaves her on her account', async () => {
        const form = await aFormOnThePage({ now: WHILE_THE_OFFER_IS_OPEN, search: onTheOffer });

        await form.press(wordsIn('en').checkoutOfferPay);

        expect(form.did.paid).toHaveLength(1);
        expect(form.did.paid[0]?.clientSecret).toBe(THE_SECRET_OF_THE_FIRST_INVOICE);
        expect(whereSheWentNext).toEqual(['/en/account/']);
      });

      it('confirms a charge and not a second setup, because the card is already hers', async () => {
        const form = await aFormOnThePage({ now: WHILE_THE_OFFER_IS_OPEN, search: onTheOffer });

        await form.press(wordsIn('en').checkoutOfferPay);

        // One setup, which collected the card, and one charge, which took the money.
        expect(form.did.confirmed).toHaveLength(1);
        expect(form.did.confirmed[0]?.clientSecret).toBe(A_CLIENT_SECRET);
        expect(form.did.paid[0]?.elements).toBeUndefined();
      });

      it('confirms no charge at the one price, because a free month charges nothing', async () => {
        const form = await aFormOnThePage({ now: WHILE_THE_OFFER_IS_OPEN });

        await form.press(thePressThatPays);

        expect(form.did.confirmed).toHaveLength(1);
        expect(form.did.paid).toEqual([]);
        expect(whereSheWentNext).toEqual(['/en/account/']);
      });

      it('confirms no charge once the offer has closed, because the free month is back', async () => {
        const form = await aFormOnThePage({ now: ONCE_THE_OFFER_HAS_CLOSED, search: onTheOffer });

        await form.press(thePressThatPays);

        expect(form.did.paid).toEqual([]);
        expect(whereSheWentNext).toEqual(['/en/account/']);
      });

      it('leaves her on the form, told what her bank said, when the charge is refused', async () => {
        const refused = 'Your bank refused that payment.';
        const form = await aFormOnThePage({
          now: WHILE_THE_OFFER_IS_OPEN,
          search: onTheOffer,
          stripe: fakeStripe({ refusesTheCharge: refused }),
        });

        await form.press(wordsIn('en').checkoutOfferPay);

        expect(form.text()).toContain(refused);
        expect(whereSheWentNext).toEqual([]);
      });

      it('leaves her on the form when the route names no charge to confirm', async () => {
        const form = await aFormOnThePage({
          api: { answersNoPaymentSecret: true },
          now: WHILE_THE_OFFER_IS_OPEN,
          search: onTheOffer,
        });

        await form.press(wordsIn('en').checkoutOfferPay);

        // Nothing was confirmed, so the subscription Stripe holds is unpaid and she is told so
        // rather than being sent to an account page that says she is paying.
        expect(form.did.paid).toEqual([]);
        expect(whereSheWentNext).toEqual([]);
      });
    });

    describe('a reader with no session who arrived on the offer', () => {
      it('is brought back to the page with the offer still in the address', async () => {
        await theCheckoutPageWhileSheHolds(null, fakeStripe(), {
          search: onTheOffer,
          now: WHILE_THE_OFFER_IS_OPEN,
        });

        expect(whereSheWentNext).toEqual(['/en/sign-in/']);
        expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBe('checkout/');
        expect(window.sessionStorage.getItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY)).toBe(
          THE_BLACK_FRIDAY_OFFER,
        );
      });

      it('keeps no offer for a reader who arrived with a value nobody approved', async () => {
        await theCheckoutPageWhileSheHolds(null, fakeStripe(), {
          search: '?offer=half-off-for-ever',
          now: WHILE_THE_OFFER_IS_OPEN,
        });

        expect(window.sessionStorage.getItem(WHERE_SHE_WAS_GOING_ENTRY)).toBe('checkout/');
        expect(window.sessionStorage.getItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY)).toBeNull();
      });

      /**
       * The address is kept as she opened it, and the page decides whether it shows an offer when
       * she lands, so a sign in that ran over the end leaves her reading the one price.
       */
      it('keeps the offer of an address opened after the end, and the page then asks for 39', async () => {
        await theCheckoutPageWhileSheHolds(null, fakeStripe(), {
          search: onTheOffer,
          now: ONCE_THE_OFFER_HAS_CLOSED,
        });

        expect(window.sessionStorage.getItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY)).toBe(
          THE_BLACK_FRIDAY_OFFER,
        );

        const page = await theCheckoutPageWhileSheHolds(herToken(), fakeStripe(), {
          search: onTheOffer,
          now: ONCE_THE_OFFER_HAS_CLOSED,
        });

        expect(page.textContent ?? '').toContain(words.checkoutPlanAmount);
      });
    });
  });

  /**
   * A second tab of the same browser signs her out and signs her in again, which the page reads
   * off the one store both tabs share. The sign in gate then draws the plan and the form again,
   * on nodes of its own, and the elements of Stripe belong to the nodes that went away.
   */
  describe('her session going and coming back in another tab', () => {
    const herToken = (): string => anIdToken(`${THE_APPLE_NAME}_000482910`);

    // The page asks the api through the fetch of her browser, which this runner does not carry,
    // so the press that pays reaches a double of the two calls rather than nothing at all.
    beforeEach(() => {
      (globalThis as { fetch?: typeof fetch }).fetch = anApi({}).asks;
    });

    afterEach(() => {
      delete (globalThis as { fetch?: typeof fetch }).fetch;
    });

    /** What a second tab leaves behind: the entry it wrote, and the word to every other tab. */
    async function herBrowserSays(idToken: string | null): Promise<void> {
      await act(async () => {
        if (idToken === null) {
          window.localStorage.removeItem(THE_SESSION_ENTRY);
        } else {
          sheHolds(idToken);
        }

        window.dispatchEvent(new StorageEvent('storage', { key: THE_SESSION_ENTRY }));
      });
    }

    async function pressesOn(page: HTMLElement, named: string): Promise<void> {
      const pressed = [...page.querySelectorAll('button')].find((button) =>
        (button.textContent ?? '').includes(named),
      );

      expect(pressed).toBeDefined();

      await act(async () => {
        pressed?.click();
      });
    }

    it('destroys the wallets and the card form when the gate takes the form away', async () => {
      const stripe = fakeStripe();
      const page = await theCheckoutPageWhileSheHolds(herToken(), stripe);

      await herBrowserSays(null);

      expect(page.textContent).toBe('');
      expect(stripe.did.destroyed).toEqual(THE_PAIR);
      expect(theElementsIn(page, stripe.did)).toEqual([]);
    });

    it('draws both of them again, into the elements the gate drew this time', async () => {
      const stripe = fakeStripe();
      const page = await theCheckoutPageWhileSheHolds(herToken(), stripe);

      await herBrowserSays(null);
      await herBrowserSays(herToken());

      expect(theElementsIn(page, stripe.did).map((drawn) => drawn.kind)).toEqual(THE_PAIR);
      expect(stripe.did.mounted).toEqual([...THE_PAIR, ...THE_PAIR]);
      expect(stripe.did.destroyed).toEqual(THE_PAIR);
    });

    it('pays on the card form of the page she came back to, and nothing of the first', async () => {
      const stripe = fakeStripe();
      const page = await theCheckoutPageWhileSheHolds(herToken(), stripe);

      await herBrowserSays(null);
      await herBrowserSays(herToken());
      await pressesOn(page, thePressThatPays);

      const onThePage = theElementsIn(page, stripe.did);

      expect(onThePage).toHaveLength(2);
      expect(stripe.did.confirmed[0]?.elements).toBe(onThePage[0]?.group);
      expect(stripe.did.destroyed).toEqual(THE_PAIR);
      expect(whereSheWentNext.at(-1)).toBe('/en/account/');
    });
  });
});
