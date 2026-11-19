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
  WHERE_A_SUBSCRIPTION_IS_READ,
  theDateShape,
  whichCardSheReads,
} from '../lib/theSubscriptionSheHolds';

/**
 * The subscription card of her account, driven in a browser against an api that answers it.
 *
 * The board the card is built from names a month and the price of the store. The operator moved
 * the price to a year, so the card is held to the board for the shape it draws and to the words
 * for the figure it names.
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

/** The api, answering one read with what the route would answer. */
function anApi(said: WhatSheHolds | null): {
  readonly asks: typeof fetch;
  readonly calls: { address: string; method: string; token: string }[];
} {
  const calls: { address: string; method: string; token: string }[] = [];

  const asks = ((where: unknown, asked: RequestInit) => {
    const headers = (asked.headers ?? {}) as Record<string, string>;

    calls.push({
      address: String(where),
      method: asked.method ?? 'GET',
      token: headers.authorization ?? '',
    });

    return Promise.resolve({
      ok: said !== null,
      status: said === null ? 401 : 200,
      json: () => Promise.resolve(said ?? {}),
    } as Response);
  }) as unknown as typeof fetch;

  return { asks, calls };
}

interface ADrawnCard {
  readonly holder: HTMLElement;
  readonly text: () => string;
  readonly calls: { address: string; method: string; token: string }[];
}

async function theCardFor(
  said: WhatSheHolds | null,
  options: { readonly language?: Language; readonly signedIn?: boolean } = {},
): Promise<ADrawnCard> {
  const api = anApi(said);
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

  return { holder, calls: api.calls, text: () => holder.textContent ?? '' };
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

    it('names the plan and the money as the operator moved them, which the board has not', () => {
      expect(whatTheBoardSays()).toContain('Emi, monthly');
      expect(whatTheBoardSays()).toContain('£29.99 a month. Renews on');

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

    it('draws the three rows the board draws, and refuses a press on each of them', async () => {
      const card = await theCardFor(anActivePayment);
      const rows = [...card.holder.querySelectorAll('button')];

      expect(rows.map((row) => row.textContent?.replace('›', ''))).toEqual([
        words.accountReceipts,
        words.accountChangeCard,
        words.accountCancelRenewal,
      ]);
      expect(rows.every((row) => row.disabled)).toBe(true);
      expect(card.text()).toContain(words.accountRowsComeLater);
    });

    it('offers her nothing to buy while the year she paid for still runs', async () => {
      const card = await theCardFor(anActivePayment);

      expect(card.text()).not.toContain(words.accountBuyEmi);
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
