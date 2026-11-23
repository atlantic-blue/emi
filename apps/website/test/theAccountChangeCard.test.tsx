/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { type Language, languages, wordsIn } from '../app/words';
import { TheSubscriptionCard } from '../components/theSubscriptionCard';
import { THE_FIELD_A_SETUP_TRAVELS_IN, WHERE_A_CARD_IS_CHANGED } from '../lib/theCardSheChanges';
import { THE_SESSION_ENTRY } from '../lib/theSessionSheHolds';
import type {
  AnElementOfStripe,
  TheElementsOfTheForm,
  TheStripeOnThePage,
} from '../lib/theStripeOnThePage';
import { type WhatSheHolds, WHERE_A_SUBSCRIPTION_IS_READ } from '../lib/theSubscriptionSheHolds';

/**
 * The Change card row of the account card, driven in a browser against a Stripe that answers what
 * Stripe answers and an api that answers what the route answers.
 *
 * Each case walks the real card from the press on the row to the state she is left in, so a form
 * that is opened and never drawn, and a card that reached Stripe and never reached the service,
 * both fail here rather than on her account page. Nothing here reaches a network and no key of any
 * kind is in this file.
 */

const words = wordsIn('en');

const now = new Date('2026-11-16T09:00:00.000Z');

const A_KEY = 'pk_test_not_a_real_key';
const A_CLIENT_SECRET = 'seti_000000000002_secret_000000000002';
const THE_SETUP = 'seti_000000000002';

const anActivePayment: WhatSheHolds = {
  paidUntil: '2027-12-16T09:00:00.000Z',
  state: 'active',
  route: 'card',
};

/** One call the card made, as it left the browser. */
interface OneCall {
  address: string;
  method: string;
  token: string;
  body?: string;
}

/** How the api behaves where the test wants something other than the route's own answer. */
interface HowTheApiBehaves {
  /** No setup is opened, the way a route that could not reach Stripe refuses the press. */
  readonly refusesToOpenASetup?: boolean;
  /** The setup is opened and the change is refused, which is the second call of the two. */
  readonly refusesTheChange?: boolean;
  /** The change is taken and the route answers that nothing moved. */
  readonly changesNothing?: boolean;
}

/** The api, answering the subscription read and the two calls of a card change. */
function anApi(
  said: WhatSheHolds | null,
  behaves: HowTheApiBehaves,
): { readonly asks: typeof fetch; readonly calls: OneCall[] } {
  const calls: OneCall[] = [];
  let held = said;

  const asks = ((where: unknown, asked: RequestInit) => {
    const headers = (asked.headers ?? {}) as Record<string, string>;
    const method = asked.method ?? 'GET';
    const body = asked.body === undefined ? undefined : String(asked.body);
    const address = String(where);

    calls.push({
      address,
      method,
      token: headers.authorization ?? '',
      ...(body === undefined ? {} : { body }),
    });

    if (address === WHERE_A_CARD_IS_CHANGED && method === 'POST') {
      return Promise.resolve({
        ok: behaves.refusesToOpenASetup !== true,
        status: behaves.refusesToOpenASetup === true ? 502 : 200,
        json: () => Promise.resolve({ clientSecret: A_CLIENT_SECRET }),
      } as Response);
    }

    if (address === WHERE_A_CARD_IS_CHANGED && method === 'PUT') {
      return Promise.resolve({
        ok: behaves.refusesTheChange !== true,
        status: behaves.refusesTheChange === true ? 502 : 200,
        json: () => Promise.resolve({ changed: behaves.changesNothing !== true }),
      } as Response);
    }

    if (method === 'PATCH') {
      held = { ...held, state: 'cancelling' };
    }

    const answering = held;

    return Promise.resolve({
      ok: answering !== null,
      status: answering === null ? 401 : 200,
      json: () => Promise.resolve(answering ?? {}),
    } as Response);
  }) as unknown as typeof fetch;

  return { asks, calls };
}

/** One element Stripe drew: what it draws, the node it went into, and the group it belongs to. */
interface WhereAnElementWent {
  readonly kind: string;
  readonly into: HTMLElement;
  readonly group: TheElementsOfTheForm;
}

interface WhatStripeDid {
  readonly mounted: string[];
  /** Where each element went, so a test reads which of them the card she is reading holds. */
  readonly went: WhereAnElementWent[];
  readonly destroyed: string[];
  readonly confirmed: Record<string, unknown>[];
  submitted: number;
}

interface AFakeStripe {
  readonly stripe: TheStripeOnThePage;
  readonly did: WhatStripeDid;
}

/** Stripe, as far as the form drives it. */
function fakeStripe(
  options: {
    readonly refuses?: string;
    readonly refusesWithNoWords?: boolean;
    readonly submitRefuses?: string;
    readonly confirmsNoSetup?: boolean;
  } = {},
): AFakeStripe {
  const did: WhatStripeDid = { mounted: [], went: [], destroyed: [], confirmed: [], submitted: 0 };

  const element = (kind: string, group: TheElementsOfTheForm): AnElementOfStripe => ({
    mount: (into) => {
      did.mounted.push(kind);
      did.went.push({ kind, into, group });
    },
    on: () => undefined,
    destroy: () => did.destroyed.push(kind),
  });

  // Stripe answers a group of its own to each call, and an element belongs to the group that made
  // it, so a group the row took away is not the group it is drawing now.
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

  const refused = (): Record<string, unknown> => ({
    error: options.refusesWithNoWords === true ? {} : { message: options.refuses },
  });

  return {
    did,
    stripe: {
      elements: () => aGroupOfElements(),
      confirmSetup: (asked) => {
        did.confirmed.push(asked);

        return Promise.resolve(
          options.refuses === undefined && options.refusesWithNoWords !== true
            ? { setupIntent: options.confirmsNoSetup === true ? {} : { id: THE_SETUP } }
            : refused(),
        );
      },
      // The card change confirms a setup and never a charge. A double that answered one would
      // let a form that charged her here pass.
      confirmPayment: () => Promise.reject(new Error('a card change confirms no payment')),
    },
  };
}

interface ADrawnCard {
  readonly holder: HTMLElement;
  readonly text: () => string;
  readonly calls: OneCall[];
  readonly did: WhatStripeDid;
  /** The row of the board that opens the form. */
  readonly theChangeCardRow: () => HTMLButtonElement;
  /** The press that saves the card she filled in, where the form is open. */
  readonly theSavePress: () => HTMLButtonElement | undefined;
  readonly presses: (row: HTMLElement | undefined) => Promise<void>;
  readonly pressesChangeCard: () => Promise<void>;
  readonly savesTheCard: () => Promise<void>;
}

async function theCardFor(
  options: {
    readonly language?: Language;
    readonly api?: HowTheApiBehaves;
    readonly stripe?: AFakeStripe;
    readonly publishableKey?: string;
  } = {},
): Promise<ADrawnCard> {
  const api = anApi(anActivePayment, options.api ?? {});
  const stripe = options.stripe ?? fakeStripe();
  const holder = document.createElement('div');
  const language = options.language ?? 'en';

  document.body.append(holder);
  window.localStorage.clear();
  window.localStorage.setItem(
    THE_SESSION_ENTRY,
    JSON.stringify({ idToken: 'her.id.token', accessToken: 'access', refreshToken: 'refresh' }),
  );

  const root = createRoot(holder);

  await act(async () => {
    root.render(
      <TheSubscriptionCard
        asks={api.asks}
        clock={() => now}
        language={language}
        publishableKey={options.publishableKey ?? A_KEY}
        stripeArrives={() => Promise.resolve(stripe.stripe)}
        words={wordsIn(language)}
      />,
    );
  });

  const rowSaying = (saying: string): HTMLButtonElement | undefined =>
    [...holder.querySelectorAll('button')].find((row) => row.textContent?.includes(saying));

  const presses = async (row: HTMLElement | undefined): Promise<void> => {
    if (row === undefined) {
      throw new Error('the card drew no such row, so there is nothing to press');
    }

    await act(async () => {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  const theChangeCardRow = (): HTMLButtonElement => {
    const row = rowSaying(wordsIn(language).accountChangeCard);

    if (row === undefined) {
      throw new Error('the card drew no Change card row');
    }

    return row;
  };

  const theSavePress = (): HTMLButtonElement | undefined =>
    rowSaying(wordsIn(language).accountSaveNewCard);

  return {
    holder,
    calls: api.calls,
    did: stripe.did,
    text: () => holder.textContent ?? '',
    theChangeCardRow,
    theSavePress,
    presses,
    pressesChangeCard: () => presses(theChangeCardRow()),
    savesTheCard: () => presses(theSavePress()),
  };
}

/** The calls of a card change, which is the pair the route answers on one path. */
const theChangeCalls = (card: ADrawnCard): OneCall[] =>
  card.calls.filter((call) => call.address === WHERE_A_CARD_IS_CHANGED);

/**
 * What she is looking at: the elements of Stripe that went into a node the card holds now. An
 * element that went into a node the row took away is drawn nowhere she can see it.
 */
const theElementsOnTheCard = (card: ADrawnCard): WhereAnElementWent[] =>
  card.did.went.filter((drawn) => card.holder.contains(drawn.into));

beforeEach(() => {
  // React believes an update was wrapped in act only where the run says it is that kind of run,
  // and without it every answer that arrives after a press prints a warning.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('the Change card row of her account', () => {
  describe('the row that opens the form', () => {
    it('is a press of the board, and asks Stripe nothing until she makes it', async () => {
      const card = await theCardFor();

      expect(card.theChangeCardRow().disabled).toBe(false);
      expect(card.theChangeCardRow().getAttribute('aria-expanded')).toBe('false');
      expect(card.did.mounted).toEqual([]);
      expect(card.theSavePress()).toBeUndefined();
    });

    it('draws the card form of Stripe inside the card when she presses it', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();

      expect(card.did.mounted).toEqual(['payment']);
      expect(card.theChangeCardRow().getAttribute('aria-expanded')).toBe('true');
      expect(card.theSavePress()?.textContent).toBe(words.accountSaveNewCard);
    });

    it('asks the api nothing by opening the form, because nothing has been filled in', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();

      expect(theChangeCalls(card)).toEqual([]);
    });

    it('closes the form again on a second press, and leaves the card as it was', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();
      await card.pressesChangeCard();

      expect(card.theSavePress()).toBeUndefined();
      expect(card.theChangeCardRow().getAttribute('aria-expanded')).toBe('false');
      expect(card.text()).toContain(words.accountPaidWithCard);
    });

    it('takes the card form off the card when she closes the row', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();
      await card.pressesChangeCard();

      expect(card.did.destroyed).toEqual(['payment']);
      expect(theElementsOnTheCard(card)).toEqual([]);
    });

    it('draws the card form again on the element of the row she opened again', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();
      await card.pressesChangeCard();
      await card.pressesChangeCard();

      expect(theElementsOnTheCard(card).map((drawn) => drawn.kind)).toEqual(['payment']);
      expect(card.did.mounted).toEqual(['payment', 'payment']);
      expect(card.theSavePress()?.textContent).toBe(words.accountSaveNewCard);
    });

    it('changes her card on the form it drew again, and leaves her reading the new one', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();
      await card.pressesChangeCard();
      await card.pressesChangeCard();

      const sheFillsIn = theElementsOnTheCard(card)[0]?.group;

      expect(sheFillsIn).toBeDefined();

      await card.savesTheCard();

      expect(card.did.confirmed[0]?.elements).toBe(sheFillsIn);
      expect(theChangeCalls(card).map((call) => call.method)).toEqual(['POST', 'PUT']);
      expect(card.theSavePress()).toBeUndefined();
      expect(card.text()).toContain(words.accountPaidWithCard);
    });

    it.each(languages)('draws the row and the press that saves, in %s', async (language) => {
      const card = await theCardFor({ language });

      await card.pressesChangeCard();

      expect(card.text()).toContain(wordsIn(language).accountSaveNewCard);
    });
  });

  describe('the card she fills in', () => {
    it('opens a setup with her token, and mounts what she filled in on it', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(theChangeCalls(card)[0]).toEqual({
        address: WHERE_A_CARD_IS_CHANGED,
        method: 'POST',
        token: 'Bearer her.id.token',
        body: '{}',
      });
      expect(card.did.submitted).toBe(1);
      expect(card.did.confirmed[0]?.clientSecret).toBe(A_CLIENT_SECRET);
    });

    it('tells the service which setup it finished, and nothing else', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(theChangeCalls(card)[1]).toEqual({
        address: WHERE_A_CARD_IS_CHANGED,
        method: 'PUT',
        token: 'Bearer her.id.token',
        body: JSON.stringify({ [THE_FIELD_A_SETUP_TRAVELS_IN]: THE_SETUP }),
      });
    });

    it('leaves her reading her card again, with the form closed', async () => {
      const card = await theCardFor();

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(card.theSavePress()).toBeUndefined();
      expect(card.theChangeCardRow().getAttribute('aria-expanded')).toBe('false');
      expect(card.text()).toContain(words.accountPlanName);
      expect(card.text()).toContain(words.accountPaidWithCard);
      expect(card.text()).toContain('39 euros a year. Renews on 16 December 2027');
      expect(card.text()).not.toContain(words.accountCardDidNotChange);
    });

    it('asks the api nothing where Stripe refuses what she typed into its own element', async () => {
      const card = await theCardFor({
        stripe: fakeStripe({ submitRefuses: 'Your card number is incomplete.' }),
      });

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(theChangeCalls(card)).toEqual([]);
      expect(card.did.confirmed).toEqual([]);
      expect(card.theSavePress()).toBeDefined();
    });
  });

  describe('a card the bank refused', () => {
    it('keeps the form open and draws the words Stripe sent back', async () => {
      const refused = 'Your card was declined.';
      const card = await theCardFor({ stripe: fakeStripe({ refuses: refused }) });

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(card.text()).toContain(refused);
      expect(card.theSavePress()).toBeDefined();
      expect(card.theSavePress()?.disabled).toBe(false);
    });

    it('tells the service nothing, because no card was collected', async () => {
      const card = await theCardFor({ stripe: fakeStripe({ refuses: 'Your card was declined.' }) });

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(theChangeCalls(card).map((call) => call.method)).toEqual(['POST']);
    });

    it('says its own line where Stripe refused it in no words at all', async () => {
      const card = await theCardFor({ stripe: fakeStripe({ refusesWithNoWords: true }) });

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(card.text()).toContain(words.accountCardDidNotChange);
      expect(card.theSavePress()).toBeDefined();
    });
  });

  describe('a call Emi could not make', () => {
    it('says one line where no setup is opened, and confirms nothing', async () => {
      const card = await theCardFor({ api: { refusesToOpenASetup: true } });

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(card.text()).toContain(words.accountCardDidNotChange);
      expect(card.did.confirmed).toEqual([]);
      expect(card.theSavePress()).toBeDefined();
    });

    it('says one line where the service would not take the setup she finished', async () => {
      const card = await theCardFor({ api: { refusesTheChange: true } });

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(card.text()).toContain(words.accountCardDidNotChange);
      expect(theChangeCalls(card).map((call) => call.method)).toEqual(['POST', 'PUT']);
      expect(card.theSavePress()).toBeDefined();
    });

    it('says the same where the service took it and answered that nothing moved', async () => {
      const card = await theCardFor({ api: { changesNothing: true } });

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(card.text()).toContain(words.accountCardDidNotChange);
      expect(card.theSavePress()).toBeDefined();
    });

    it('says the same where Stripe confirmed a setup it named no identifier for', async () => {
      const card = await theCardFor({ stripe: fakeStripe({ confirmsNoSetup: true }) });

      await card.pressesChangeCard();
      await card.savesTheCard();

      expect(card.text()).toContain(words.accountCardDidNotChange);
      expect(theChangeCalls(card).map((call) => call.method)).toEqual(['POST']);
    });

    it('leaves the rest of the card working, which is another route', async () => {
      const card = await theCardFor({ api: { refusesTheChange: true } });

      await card.pressesChangeCard();
      await card.savesTheCard();
      await card.presses(
        [...card.holder.querySelectorAll('button')].find((row) =>
          row.textContent?.includes(words.accountCancelRenewal),
        ),
      );

      expect(card.calls.map((call) => call.method)).toContain('PATCH');
      expect(card.calls.map((call) => call.address)).toContain(WHERE_A_SUBSCRIPTION_IS_READ);
      expect(card.text()).toContain(words.accountStateRenewalOff);
    });

    it('lets her press again, which is the whole of what she can do about it', async () => {
      const card = await theCardFor({ api: { refusesToOpenASetup: true } });

      await card.pressesChangeCard();
      await card.savesTheCard();
      await card.savesTheCard();

      expect(theChangeCalls(card).map((call) => call.method)).toEqual(['POST', 'POST']);
    });
  });

  describe('a build with no publishable key', () => {
    it('opens the row and says paying on this site is not open yet', async () => {
      const card = await theCardFor({ publishableKey: '' });

      await card.pressesChangeCard();

      expect(card.text()).toContain(words.checkoutNoPaymentFormYet);
      expect(card.did.mounted).toEqual([]);
      expect(card.theSavePress()).toBeUndefined();
    });
  });
});
