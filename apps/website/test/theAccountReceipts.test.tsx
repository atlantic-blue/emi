/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { type Language, wordsIn } from '../app/words';
import { TheSubscriptionCard } from '../components/theSubscriptionCard';
import { type OneReceipt, WHERE_RECEIPTS_ARE_READ } from '../lib/theReceiptsSheHolds';
import { THE_SESSION_ENTRY } from '../lib/theSessionSheHolds';
import { type WhatSheHolds, WHERE_A_SUBSCRIPTION_IS_READ } from '../lib/theSubscriptionSheHolds';

/**
 * The receipts row of the account card, driven in a browser against an api that answers the route
 * the service answers.
 *
 * She presses the row the board draws and reads what Stripe holds: a day, an amount and a link to
 * the invoice Stripe serves. The test presses the row and reads the card afterwards, so a list
 * that is asked for and never drawn is a failure here rather than a thing a reader finds.
 */

const words = wordsIn('en');

const now = new Date('2026-11-16T09:00:00.000Z');

const anActivePayment: WhatSheHolds = {
  paidUntil: '2027-12-16T09:00:00.000Z',
  state: 'active',
  route: 'card',
};

const theNewest: OneReceipt = {
  invoicedAt: '2026-12-16T09:03:00.000Z',
  amount: 3900,
  currency: 'eur',
  invoiceUrl: 'https://invoice.stripe.com/i/acct_one/live_YWNjdF9vbmU',
};

const theOlder: OneReceipt = {
  invoicedAt: '2025-12-16T09:02:00.000Z',
  amount: 3900,
  currency: 'eur',
  invoiceUrl: 'https://invoice.stripe.com/i/acct_one/live_b2xkZXI',
};

const theCursor = 'ZGlnZXN0LmluX3R3bw';

/** One call the card made, as it left the browser. */
interface OneCall {
  address: string;
  method: string;
  token: string;
}

/** One page of receipts as the route answers it, which a test hands to the api in order. */
interface APageTheRouteAnswers {
  readonly receipts: readonly OneReceipt[];
  readonly cursor: string | null;
}

/** How the api behaves where the test wants something other than a page of receipts. */
interface HowTheApiBehaves {
  /** The pages the route answers, in the order it answers them. */
  readonly pages?: readonly APageTheRouteAnswers[];
  /** The receipts read is refused, the way a route that could not reach Stripe refuses it. */
  readonly refusesTheRead?: boolean;
  /** The receipts read is refused once, and answers the page after that. */
  readonly refusesTheFirstRead?: boolean;
}

/** The api, answering the subscription read and the receipts read as the service answers them. */
function anApi(
  said: WhatSheHolds | null,
  behaves: HowTheApiBehaves,
): { readonly asks: typeof fetch; readonly calls: OneCall[] } {
  const calls: OneCall[] = [];
  const pages = [...(behaves.pages ?? [{ receipts: [theNewest, theOlder], cursor: null }])];
  let readsSoFar = 0;

  const asks = ((where: unknown, asked: RequestInit) => {
    const headers = (asked.headers ?? {}) as Record<string, string>;
    const address = String(where);

    calls.push({
      address,
      method: asked.method ?? 'GET',
      token: headers.authorization ?? '',
    });

    if (!address.startsWith(WHERE_RECEIPTS_ARE_READ)) {
      return Promise.resolve({
        ok: said !== null,
        status: said === null ? 401 : 200,
        json: () => Promise.resolve(said ?? {}),
      } as Response);
    }

    readsSoFar += 1;

    if (
      behaves.refusesTheRead === true ||
      (behaves.refusesTheFirstRead === true && readsSoFar === 1)
    ) {
      return Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.resolve({}),
      } as Response);
    }

    const answering = pages.shift() ?? { receipts: [], cursor: null };

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(answering),
    } as Response);
  }) as unknown as typeof fetch;

  return { asks, calls };
}

/** One line of the list, as a reader sees it. */
interface ADrawnLine {
  readonly day: string;
  readonly amount: string;
  readonly href: string | null;
}

/**
 * The text of an element, with the spaces Intl writes inside a date and an amount read as the
 * spaces they are. A narrow space between the amount and its sign is still a space on the page.
 */
function asRead(said: string | null): string {
  return (said ?? '').replace(/[\u00a0\u202f]/g, ' ');
}

interface ADrawnCard {
  readonly holder: HTMLElement;
  readonly text: () => string;
  readonly calls: OneCall[];
  /** Every link of the list, which is one per receipt. */
  readonly theReceiptLinks: () => HTMLAnchorElement[];
  /** Every line of the list, as a reader reads it. */
  readonly theLines: () => ADrawnLine[];
  /** The row of the board that opens the list. */
  readonly theReceiptsRow: () => HTMLButtonElement;
  /** The press that reads the page after this one, where the answer carried a cursor. */
  readonly theMoreRow: () => HTMLButtonElement | undefined;
  readonly presses: (row: HTMLElement | undefined) => Promise<void>;
  readonly pressesReceipts: () => Promise<void>;
}

async function theCardFor(
  said: WhatSheHolds | null,
  options: { readonly language?: Language; readonly api?: HowTheApiBehaves } = {},
): Promise<ADrawnCard> {
  const api = anApi(said, options.api ?? {});
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

  const theReceiptsRow = (): HTMLButtonElement => {
    const row = rowSaying(wordsIn(language).accountReceipts);

    if (row === undefined) {
      throw new Error('the card drew no Receipts row');
    }

    return row;
  };

  return {
    holder,
    calls: api.calls,
    text: () => holder.textContent ?? '',
    theReceiptLinks: () =>
      [...holder.querySelectorAll('a[target="_blank"]')] as HTMLAnchorElement[],
    theLines: () =>
      [...holder.querySelectorAll('a[target="_blank"]')].map((line) => {
        const parts = [...line.querySelectorAll('span')];

        return {
          day: asRead(parts[0]?.textContent ?? null),
          amount: asRead(parts[1]?.textContent ?? null),
          href: line.getAttribute('href'),
        };
      }),
    theReceiptsRow,
    theMoreRow: () => rowSaying(wordsIn(language).accountMoreReceipts),
    presses,
    pressesReceipts: () => presses(theReceiptsRow()),
  };
}

beforeEach(() => {
  // React believes an update was wrapped in act only where the run says it is that kind of run,
  // and without it every answer that arrives after a press prints a warning.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('the receipts of her account', () => {
  describe('the row that opens the list', () => {
    it('asks the route nothing at all until she presses it', async () => {
      const card = await theCardFor(anActivePayment);

      expect(card.calls.map((call) => call.address)).toEqual([WHERE_A_SUBSCRIPTION_IS_READ]);
      expect(card.theReceiptsRow().getAttribute('aria-expanded')).toBe('false');
    });

    it('reads the receipts route with her token when she presses it', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesReceipts();

      expect(card.calls[1]).toEqual({
        address: WHERE_RECEIPTS_ARE_READ,
        method: 'GET',
        token: 'Bearer her.id.token',
      });
      expect(card.theReceiptsRow().getAttribute('aria-expanded')).toBe('true');
    });

    it('closes the list again on a second press, and asks for nothing more', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesReceipts();
      await card.pressesReceipts();

      expect(card.theReceiptLinks()).toEqual([]);
      expect(card.calls).toHaveLength(2);
      expect(card.theReceiptsRow().getAttribute('aria-expanded')).toBe('false');
    });

    it('draws what it already read when she opens it again, without reading it twice', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesReceipts();
      await card.pressesReceipts();
      await card.pressesReceipts();

      expect(card.theReceiptLinks()).toHaveLength(2);
      expect(card.calls).toHaveLength(2);
    });
  });

  describe('the list she is left reading', () => {
    it('draws one line for each receipt, newest first', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesReceipts();

      expect(card.theLines().map(({ day, amount }) => ({ day, amount }))).toEqual([
        { day: '16 December 2026', amount: '€39.00' },
        { day: '16 December 2025', amount: '€39.00' },
      ]);
    });

    it('points each line at the invoice page Stripe serves', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesReceipts();

      expect(card.theReceiptLinks().map((line) => line.getAttribute('href'))).toEqual([
        theNewest.invoiceUrl,
        theOlder.invoiceUrl,
      ]);
    });

    it('opens each line in a tab of its own, which cannot reach the page it came from', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesReceipts();

      for (const line of card.theReceiptLinks()) {
        expect(line.getAttribute('target')).toBe('_blank');
        expect(line.getAttribute('rel')).toContain('noopener');
      }
    });

    it('leaves out a receipt the route answered with no link to press', async () => {
      const card = await theCardFor(anActivePayment, {
        api: {
          pages: [
            {
              receipts: [theNewest, { ...theOlder, invoiceUrl: '' }],
              cursor: null,
            },
          ],
        },
      });

      await card.pressesReceipts();

      expect(card.theReceiptLinks().map((line) => line.getAttribute('href'))).toEqual([
        theNewest.invoiceUrl,
      ]);
    });

    it('writes the day and the amount in the language the page is drawn in', async () => {
      const spanish = await theCardFor(anActivePayment, { language: 'es' });
      const russian = await theCardFor(anActivePayment, { language: 'ru' });

      await spanish.pressesReceipts();
      await russian.pressesReceipts();

      expect(spanish.theLines()[0]).toMatchObject({
        day: '16 de diciembre de 2026',
        amount: '39,00 €',
      });
      expect(russian.theLines()[0]).toMatchObject({
        day: '16 декабря 2026 г.',
        amount: '39,00 €',
      });
    });

    it('writes an amount in the smallest unit of its own currency, not in hundredths', async () => {
      const card = await theCardFor(anActivePayment, {
        api: {
          pages: [
            {
              receipts: [{ ...theNewest, amount: 5900, currency: 'jpy' }],
              cursor: null,
            },
          ],
        },
      });

      await card.pressesReceipts();

      expect(card.theLines()[0]?.amount).toBe('JP¥5,900');
    });
  });

  describe('a woman with no receipts yet', () => {
    it('says one line, and draws no list at all', async () => {
      const card = await theCardFor(anActivePayment, {
        api: { pages: [{ receipts: [], cursor: null }] },
      });

      await card.pressesReceipts();

      expect(card.text()).toContain(words.accountReceiptsEmpty);
      expect(card.theReceiptLinks()).toEqual([]);
    });

    it('says nothing of the kind before she has opened the list', async () => {
      const card = await theCardFor(anActivePayment, {
        api: { pages: [{ receipts: [], cursor: null }] },
      });

      expect(card.text()).not.toContain(words.accountReceiptsEmpty);
    });
  });

  describe('a read the route would not answer', () => {
    it('says one line, and leaves the rest of the card as it was', async () => {
      const card = await theCardFor(anActivePayment, { api: { refusesTheRead: true } });

      await card.pressesReceipts();

      expect(card.text()).toContain(words.accountReceiptsDidNotLoad);
      expect(card.text()).not.toContain(words.accountReceiptsEmpty);
      expect(card.text()).toContain('39 euros a year. Renews on 16 December 2027');
      expect(card.text()).toContain(words.accountStateActive);
    });

    it('leaves her the press that stops the renewal, which is another route', async () => {
      const card = await theCardFor(anActivePayment, { api: { refusesTheRead: true } });

      await card.pressesReceipts();
      await card.presses(
        [...card.holder.querySelectorAll('button')].find((row) =>
          row.textContent?.includes(words.accountCancelRenewal),
        ),
      );

      expect(card.calls.map((call) => call.method)).toContain('PATCH');
    });

    it('reads it again when she presses the row twice, and draws what comes back', async () => {
      const card = await theCardFor(anActivePayment, { api: { refusesTheFirstRead: true } });

      await card.pressesReceipts();
      await card.pressesReceipts();
      await card.pressesReceipts();

      expect(card.text()).not.toContain(words.accountReceiptsDidNotLoad);
      expect(card.theReceiptLinks()).toHaveLength(2);
    });
  });

  describe('the page after this one', () => {
    it('offers nothing more to read where the answer carried no cursor', async () => {
      const card = await theCardFor(anActivePayment);

      await card.pressesReceipts();

      expect(card.theMoreRow()).toBeUndefined();
    });

    it('offers the next page where the answer carried a cursor', async () => {
      const card = await theCardFor(anActivePayment, {
        api: { pages: [{ receipts: [theNewest], cursor: theCursor }] },
      });

      await card.pressesReceipts();

      expect(card.theMoreRow()?.textContent).toBe(words.accountMoreReceipts);
    });

    it('asks the route for that page with the cursor it was given', async () => {
      const card = await theCardFor(anActivePayment, {
        api: {
          pages: [
            { receipts: [theNewest], cursor: theCursor },
            { receipts: [theOlder], cursor: null },
          ],
        },
      });

      await card.pressesReceipts();
      await card.presses(card.theMoreRow());

      expect(card.calls[2]).toEqual({
        address: `${WHERE_RECEIPTS_ARE_READ}?cursor=${theCursor}`,
        method: 'GET',
        token: 'Bearer her.id.token',
      });
    });

    it('leaves her reading both pages, in the order they were answered', async () => {
      const card = await theCardFor(anActivePayment, {
        api: {
          pages: [
            { receipts: [theNewest], cursor: theCursor },
            { receipts: [theOlder], cursor: null },
          ],
        },
      });

      await card.pressesReceipts();
      await card.presses(card.theMoreRow());

      expect(card.theReceiptLinks().map((line) => line.getAttribute('href'))).toEqual([
        theNewest.invoiceUrl,
        theOlder.invoiceUrl,
      ]);
      expect(card.theMoreRow()).toBeUndefined();
    });
  });
});
