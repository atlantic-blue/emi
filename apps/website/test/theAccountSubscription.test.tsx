/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { type Language, languages, wordsIn } from '../app/words';
import { TheSubscriptionCard } from '../components/theSubscriptionCard';
import { THE_SESSION_ENTRY } from '../lib/theSessionSheHolds';
import {
  type WhatSheHolds,
  THE_FIELD_A_RENEWAL_TRAVELS_IN,
  WHERE_A_SUBSCRIPTION_IS_READ,
  theDateShape,
  whatTheRenewalRowDoes,
  whichCardSheReads,
} from '../lib/theSubscriptionSheHolds';

/**
 * The subscription card of her account, driven in a browser against an api that answers it.
 *
 * The card is held to the board it was drawn from, so a word that moved on the board and not in
 * the catalogue is caught here rather than by a reader of the page.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..');

const theBoard = join(
  repositoryRoot,
  'docs',
  'design',
  'website',
  'sign-in',
  'boards',
  'Profile.dc.html',
);

/** The board as a reader sees it: the text of every element, with the markup taken out. */
function whatTheBoardSays(): string {
  return readFileSync(theBoard, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,])/g, (_whole, mark: string) => mark)
    .trim();
}

const words = wordsIn('en');

const now = new Date('2026-11-16T09:00:00.000Z');
const theYearEnds = '2027-12-16T09:00:00.000Z';
const theYearEnded = '2026-10-01T09:00:00.000Z';

/** One call the card made, as it left the browser. */
interface OneCall {
  address: string;
  method: string;
  token: string;
  body?: string;
}

/** How the api behaves where the test wants something other than the route's own answer. */
interface HowTheApiBehaves {
  /** The change is refused, the way a route that could not reach Stripe refuses it. */
  readonly refusesTheChange?: boolean;
}

/**
 * The api, answering the read and the change the way the route answers them.
 *
 * The change moves the state the route moves and leaves the date alone, so a card drawn after a
 * press is drawn from an answer rather than from anything the card assumed.
 */
function anApi(
  said: WhatSheHolds | null,
  behaves: HowTheApiBehaves = {},
): {
  readonly asks: typeof fetch;
  readonly calls: OneCall[];
} {
  const calls: OneCall[] = [];
  let held = said;

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

    if (method === 'PATCH') {
      if (behaves.refusesTheChange === true) {
        return Promise.resolve({
          ok: false,
          status: 502,
          json: () => Promise.resolve({}),
        } as Response);
      }

      const itAsksFor = JSON.parse(body ?? '{}') as Record<string, unknown>;

      held = {
        ...held,
        state: itAsksFor[THE_FIELD_A_RENEWAL_TRAVELS_IN] === true ? 'active' : 'cancelling',
      };
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

interface ADrawnCard {
  readonly holder: HTMLElement;
  readonly text: () => string;
  readonly calls: OneCall[];
  /** Every row of the card, in the order the board draws them. */
  readonly rows: () => HTMLButtonElement[];
  /** The row that stops the renewal and starts it again, which is the last one. */
  readonly theRenewalRow: () => HTMLButtonElement;
  /** Presses that row and lets the answer come back, the way her browser does. */
  readonly pressesTheRenewal: () => Promise<void>;
}

async function theCardFor(
  said: WhatSheHolds | null,
  options: {
    readonly language?: Language;
    readonly signedIn?: boolean;
    readonly api?: HowTheApiBehaves;
  } = {},
): Promise<ADrawnCard> {
  const api = anApi(said, options.api ?? {});
  const holder = document.createElement('div');
  const language = options.language ?? 'en';

  document.body.append(holder);
  window.localStorage.clear();

  if (options.signedIn !== false) {
    window.localStorage.setItem(
      THE_SESSION_ENTRY,
      JSON.stringify({ idToken: 'her.id.token', accessToken: 'access', refreshToken: 'refresh' }),
    );
  }

  const root = createRoot(holder);

  await act(async () => {
    root.render(
      <TheSubscriptionCard
        asks={api.asks}
        clock={() => now}
        language={language}
        words={wordsIn(language)}
      />,
    );
  });

  const rows = (): HTMLButtonElement[] => [...holder.querySelectorAll('button')];
  const theRenewalRow = (): HTMLButtonElement => {
    const drawn = rows();
    const last = drawn[drawn.length - 1];

    if (last === undefined) {
      throw new Error('the card drew no row at all, so there is nothing to press');
    }

    return last;
  };

  return {
    holder,
    calls: api.calls,
    rows,
    theRenewalRow,
    text: () => holder.textContent ?? '',
    pressesTheRenewal: async () => {
      await act(async () => {
        theRenewalRow().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    },
  };
}

const anActivePayment: WhatSheHolds = {
  paidUntil: theYearEnds,
  state: 'active',
  route: 'card',
};

describe('the subscription card of her account', () => {
  describe('the words the board draws', () => {
    it.each([
      words.accountSubscriptionHeading,
      words.accountStateActive,
      words.accountPaidWith,
      words.accountPaidWithCard,
      words.accountReceipts,
      words.accountChangeCard,
      words.accountCancelRenewal,
    ])('draws "%s", which the board draws in the same words', (said) => {
      expect(whatTheBoardSays()).toContain(said);
    });

    it('names the plan and the money the board names', () => {
      expect(whatTheBoardSays()).toContain('Emi, yearly');
      expect(whatTheBoardSays()).toContain('39 euros a year. Renews on');

      expect(words.accountPlanName).toBe('Emi, yearly');
      expect(words.accountRenewsOn).toContain('39 euros a year');
      expect(words.accountRenewsOn).toContain('Renews on {date}');
    });

    it('writes the day, the month and the year in each language she can read', () => {
      for (const language of languages) {
        const written = theDateShape[language];

        expect(written).toContain('{day}');
        expect(written).toContain('{month}');
        expect(written).toContain('{year}');
      }
    });
  });

  describe('a woman who holds a payment', () => {
    it('reads the route with her token, and asks for nothing else', async () => {
      const card = await theCardFor(anActivePayment);

      expect(card.calls).toEqual([
        {
          address: WHERE_A_SUBSCRIPTION_IS_READ,
          method: 'GET',
          token: 'Bearer her.id.token',
        },
      ]);
    });

    it('says the plan, the date it renews on and that it is active', async () => {
      const card = await theCardFor(anActivePayment);

      expect(card.text()).toContain(words.accountPlanName);
      expect(card.text()).toContain('39 euros a year. Renews on 16 December 2027');
      expect(card.text()).toContain(words.accountStateActive);
      expect(card.text()).not.toContain(words.accountNoSubscription);
    });

    it('says what she paid with, as the board says it', async () => {
      const card = await theCardFor(anActivePayment);

      expect(card.text()).toContain(words.accountPaidWith);
      expect(card.text()).toContain(words.accountPaidWithCard);
    });

    it('draws the three rows the board draws, with Change card the one that is not built', async () => {
      const card = await theCardFor(anActivePayment);

      expect(card.rows().map((row) => row.textContent?.replace('›', ''))).toEqual([
        words.accountReceipts,
        words.accountChangeCard,
        words.accountCancelRenewal,
      ]);
      expect(card.rows().map((row) => row.disabled)).toEqual([false, true, false]);
    });

    it('still says the row that is not built yet comes later', async () => {
      const card = await theCardFor(anActivePayment);

      expect(card.text()).toContain(words.accountRowsComeLater);
    });

    it('offers her nothing to buy while the year she paid for still runs', async () => {
      const card = await theCardFor(anActivePayment);

      expect(card.text()).not.toContain(words.accountBuyEmi);
    });
  });

  describe('the press that stops the renewal', () => {
    it('asks the route to stop renewing, with her token and the one field', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesTheRenewal();

      expect(card.calls[1]).toEqual({
        address: WHERE_A_SUBSCRIPTION_IS_READ,
        method: 'PATCH',
        token: 'Bearer her.id.token',
        body: JSON.stringify({ [THE_FIELD_A_RENEWAL_TRAVELS_IN]: false }),
      });
    });

    it('leaves her reading the card of a renewal that is off, on the day she paid until', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesTheRenewal();

      expect(card.text()).toContain('39 euros a year. Paid until 16 December 2027');
      expect(card.text()).toContain(words.accountStateRenewalOff);
      expect(card.text()).not.toContain(words.accountStateActive);
    });

    it('turns that row into the press that starts the renewal again', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesTheRenewal();

      expect(card.theRenewalRow().textContent).toBe(words.accountTurnRenewalOn);
      expect(card.theRenewalRow().disabled).toBe(false);
      expect(card.text()).not.toContain(words.accountCancelRenewal);
    });

    it('asks the route to renew again when she presses it a second time', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesTheRenewal();
      await card.pressesTheRenewal();

      expect(card.calls[2]).toEqual({
        address: WHERE_A_SUBSCRIPTION_IS_READ,
        method: 'PATCH',
        token: 'Bearer her.id.token',
        body: JSON.stringify({ [THE_FIELD_A_RENEWAL_TRAVELS_IN]: true }),
      });
    });

    it('leaves her reading the active card again, and the row she started from', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesTheRenewal();
      await card.pressesTheRenewal();

      expect(card.text()).toContain('39 euros a year. Renews on 16 December 2027');
      expect(card.text()).toContain(words.accountStateActive);
      expect(card.theRenewalRow().textContent).toBe(words.accountCancelRenewal);
    });

    it('offers her nothing to buy, because the year she paid for still runs', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesTheRenewal();

      expect(card.text()).not.toContain(words.accountBuyEmi);
    });
  });

  describe('a change the route would not take', () => {
    it('leaves the card exactly as it was, and says one line that it did not change', async () => {
      const card = await theCardFor(anActivePayment, { api: { refusesTheChange: true } });

      await card.pressesTheRenewal();

      expect(card.text()).toContain(words.accountRenewalDidNotChange);
      expect(card.text()).toContain('39 euros a year. Renews on 16 December 2027');
      expect(card.text()).toContain(words.accountStateActive);
      expect(card.theRenewalRow().textContent).toBe(words.accountCancelRenewal);
    });

    it('says nothing of the kind before she has pressed anything', async () => {
      const card = await theCardFor(anActivePayment, { api: { refusesTheChange: true } });

      expect(card.text()).not.toContain(words.accountRenewalDidNotChange);
    });

    it('lets her press again, which is the whole of what she can do about it', async () => {
      const card = await theCardFor(anActivePayment, { api: { refusesTheChange: true } });

      await card.pressesTheRenewal();

      expect(card.theRenewalRow().disabled).toBe(false);
      expect(card.calls.filter((call) => call.method === 'PATCH')).toHaveLength(1);
    });
  });

  describe('a payment with no renewal to stop', () => {
    it('refuses the press of a woman who paid with Stars, who cancels in Telegram', async () => {
      const card = await theCardFor({ paidUntil: theYearEnds, state: 'active', route: 'stars' });

      await card.pressesTheRenewal();

      expect(card.theRenewalRow().disabled).toBe(true);
      expect(card.calls.filter((call) => call.method === 'PATCH')).toEqual([]);
    });

    it('refuses the press of a payment that lapsed, which has no renewal left', async () => {
      const card = await theCardFor({ paidUntil: theYearEnds, state: 'lapsed', route: 'card' });

      await card.pressesTheRenewal();

      expect(card.theRenewalRow().textContent).toBe(words.accountCancelRenewal);
      expect(card.theRenewalRow().disabled).toBe(true);
      expect(card.calls.filter((call) => call.method === 'PATCH')).toEqual([]);
    });
  });

  describe('what the renewal row does', () => {
    it.each([
      [{ paidUntil: theYearEnds, state: 'active', route: 'card' } as WhatSheHolds, 'stops'],
      [{ paidUntil: theYearEnds, state: 'cancelling', route: 'card' } as WhatSheHolds, 'starts'],
      [{ paidUntil: theYearEnds, state: 'lapsed', route: 'card' } as WhatSheHolds, 'nothing'],
      [{ paidUntil: theYearEnds, state: 'refunded', route: 'card' } as WhatSheHolds, 'nothing'],
      [{ paidUntil: theYearEnds, state: 'active', route: 'stars' } as WhatSheHolds, 'nothing'],
      [{ paidUntil: theYearEnds, state: 'active' } as WhatSheHolds, 'nothing'],
      [{} as WhatSheHolds, 'nothing'],
    ])('reads %j as the row that %s', (held, does) => {
      expect(whatTheRenewalRowDoes(held)).toBe(does);
    });

    it('offers nothing at all to a woman the route said nothing about', () => {
      expect(whatTheRenewalRowDoes(null)).toBe('nothing');
    });

    it('still offers the press where her year ran out while the payment is active', () => {
      expect(
        whatTheRenewalRowDoes({ paidUntil: theYearEnded, state: 'active', route: 'card' }),
      ).toBe('stops');
    });
  });

  describe('a renewal she stopped, and a year that ran out', () => {
    it('says the renewal is off and shows the date she is paid until', async () => {
      const card = await theCardFor({
        paidUntil: theYearEnds,
        state: 'cancelling',
        route: 'card',
      });

      expect(card.text()).toContain('39 euros a year. Paid until 16 December 2027');
      expect(card.text()).toContain(words.accountStateRenewalOff);
      expect(card.text()).not.toContain(words.accountStateActive);
    });

    it('says the same for a payment that lapsed while the year she paid for still runs', async () => {
      const card = await theCardFor({ paidUntil: theYearEnds, state: 'lapsed', route: 'card' });

      expect(card.text()).toContain(words.accountStateRenewalOff);
      expect(card.text()).toContain('Paid until 16 December 2027');
    });

    it('offers her Emi again once that date has passed, and still says what she paid for', async () => {
      const card = await theCardFor({ paidUntil: theYearEnded, state: 'lapsed', route: 'card' });

      expect(card.text()).toContain('Paid until 1 October 2026');
      expect(card.text()).toContain(words.accountBuyEmi);
      expect(card.holder.querySelector('a')?.getAttribute('href')).toBe('/en/checkout/');
    });
  });

  describe('a woman who has never paid', () => {
    it('draws no card, one line and one press that offers her Emi', async () => {
      const card = await theCardFor({});

      expect(card.text()).toContain(words.accountNoSubscription);
      expect(card.text()).toContain(words.accountBuyEmi);
      expect(card.holder.querySelector('a')?.getAttribute('href')).toBe('/en/checkout/');
      expect(card.text()).not.toContain(words.accountPlanName);
      expect(card.text()).not.toContain(words.accountReceipts);
    });

    it('says the same where the route would not answer at all', async () => {
      const card = await theCardFor(null);

      expect(card.text()).toContain(words.accountNoSubscription);
      expect(card.text()).not.toContain(words.accountPlanName);
    });

    it('asks the route nothing for a reader holding no session', async () => {
      const card = await theCardFor(anActivePayment, { signedIn: false });

      expect(card.calls).toEqual([]);
      expect(card.text()).toContain(words.accountNoSubscription);
    });
  });

  describe('which card she reads', () => {
    it.each([
      [{ paidUntil: theYearEnds, state: 'active' } as WhatSheHolds, 'active'],
      [{ paidUntil: theYearEnds, state: 'cancelling' } as WhatSheHolds, 'renewalOff'],
      [{ paidUntil: theYearEnds, state: 'lapsed' } as WhatSheHolds, 'renewalOff'],
      [{ paidUntil: theYearEnded, state: 'active' } as WhatSheHolds, 'renewalOff'],
      [{ state: 'active' } as WhatSheHolds, 'noSubscription'],
      [{} as WhatSheHolds, 'noSubscription'],
    ])('reads %j as the %s card', (held, expected) => {
      expect(whichCardSheReads(held, now)).toBe(expected);
    });

    it('reads a date nobody can parse as no subscription, rather than as a card', () => {
      expect(whichCardSheReads({ paidUntil: 'the day after', state: 'active' }, now)).toBe(
        'noSubscription',
      );
    });
  });

  describe('the card in each language', () => {
    it.each(languages)('draws the plan and the date in %s', async (language) => {
      const card = await theCardFor(anActivePayment, { language });
      const said = wordsIn(language);

      expect(card.text()).toContain(said.accountPlanName);
      expect(card.text()).toContain(said.accountStateActive);
      expect(card.text()).toContain('2027');
    });
  });
});
