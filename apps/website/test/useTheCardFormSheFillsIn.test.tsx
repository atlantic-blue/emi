/**
 * @jest-environment jsdom
 */
import { act, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type {
  AnElementOfStripe,
  TheElementsOfTheForm,
  TheStripeOnThePage,
  WhatTheConfirmationSaid,
} from '../lib/theStripeOnThePage';
import { useTheCardFormSheFillsIn } from '../lib/useTheCardFormSheFillsIn';

/**
 * The hook both card forms are drawn by, driven on its own.
 *
 * The two pages that use it each take the card form off the page in their own way, and a page can
 * also replace the node it draws the form into while the hook itself goes on living. Nothing on
 * the site does that today, so this file is where that promise is held: a replaced node gets a
 * form, and the elements of the node that went away are destroyed.
 *
 * Stripe is a double here as it is everywhere else in this suite. Nothing reaches a network and no
 * key of any kind is in this file.
 */

const A_KEY = 'pk_test_not_a_real_key';

const WHERE_A_BANK_SENDS_HER_BACK = 'https://myemi.app/en/account/';

/** The two kinds of element the page she buys Emi on draws, in the order it asks for them. */
const THE_WALLETS = 'expressCheckout';
const THE_CARD_FORM = 'payment';

interface WhereAnElementWent {
  readonly kind: string;
  readonly into: HTMLElement;
}

interface WhatStripeDid {
  readonly mounted: string[];
  readonly went: WhereAnElementWent[];
  readonly destroyed: string[];
  readonly groups: TheElementsOfTheForm[];
  /** Each charge it was asked to confirm, which carries a secret and no elements. */
  readonly paid: Record<string, unknown>[];
}

interface AFakeStripe {
  readonly stripe: TheStripeOnThePage;
  readonly did: WhatStripeDid;
}

function fakeStripe(): AFakeStripe {
  const did: WhatStripeDid = { mounted: [], went: [], destroyed: [], groups: [], paid: [] };

  const element = (kind: string): AnElementOfStripe => ({
    mount: (into) => {
      did.mounted.push(kind);
      did.went.push({ kind, into });
    },
    on: () => undefined,
    destroy: () => did.destroyed.push(kind),
  });

  return {
    did,
    stripe: {
      elements: () => {
        const group: TheElementsOfTheForm = {
          create: (kind) => element(kind),
          submit: () => Promise.resolve({}),
        };

        did.groups.push(group);

        return group;
      },
      confirmSetup: () => Promise.resolve({}),
      confirmPayment: (asked) => {
        did.paid.push(asked);

        return Promise.resolve({});
      },
    },
  };
}

/** What the host is told to do between one drawing and the next. */
interface WhatTheHostDraws {
  /** The node the form is drawn into is replaced by another one, and the host lives through it. */
  readonly replacesTheNode: boolean;
  /** The node is taken away and nothing is put in its place. */
  readonly takesTheNodeAway: boolean;
}

interface ADrivenHook {
  readonly host: HTMLElement;
  readonly did: WhatStripeDid;
  /**
   * The node the host is drawing the card form into now, and null where it draws none. It is the
   * last of the two the host draws, because the wallets go above the card form.
   */
  readonly theNode: () => HTMLElement | null;
  readonly draws: (what: WhatTheHostDraws) => Promise<void>;
  readonly letsStripeArrive: () => Promise<void>;
  readonly theElements: () => TheElementsOfTheForm | null;
  /** The one charge of a plan with no free month, confirmed on the secret of its invoice. */
  readonly confirmsThePayment: (clientSecret: string) => Promise<WhatTheConfirmationSaid>;
}

/** The elements of Stripe that went into a node the host still holds, which is what she sees. */
const theElementsOnThePage = (driven: ADrivenHook): string[] =>
  driven.did.went.filter((drawn) => driven.host.contains(drawn.into)).map((drawn) => drawn.kind);

async function aFormDrivenByTheHook(
  options: { readonly stripeArrivesLate?: boolean } = {},
): Promise<ADrivenHook> {
  const stripe = fakeStripe();
  const host = document.createElement('div');
  let itArrives = (): void => undefined;
  const theArrival =
    options.stripeArrivesLate === true
      ? new Promise<void>((answer) => {
          itArrives = () => answer();
        })
      : Promise.resolve();

  document.body.append(host);

  let drawsNext: (what: WhatTheHostDraws) => void = () => undefined;
  let readsTheElements: () => TheElementsOfTheForm | null = () => null;
  let paysWith: (clientSecret: string) => Promise<WhatTheConfirmationSaid> = () =>
    Promise.resolve({});

  /**
   * A page that draws the card form, and draws it again on a node of its own.
   *
   * The count is the key of the node, which is what makes a drawing replace the node rather than
   * keep it: that is what a page does when it draws its children again, and the hook lives on
   * either way, which is the state the form has to come back from.
   */
  function AHostThatRedraws() {
    const [drawing, setDrawing] = useState({ count: 0, holds: true });
    const theWallets = useRef<HTMLDivElement | null>(null);
    const { drawsTheCardForm, theElements, confirmsThePayment } = useTheCardFormSheFillsIn({
      publishableKey: A_KEY,
      stripeArrives: () => theArrival.then(() => stripe.stripe),
      comesBackTo: WHERE_A_BANK_SENDS_HER_BACK,
      // The wallets of a device, drawn the way the page she buys Emi on draws them: an element of
      // the same group, mounted into a node of the page rather than into the card form.
      alsoDraws: (elements) => {
        const wallet = elements.create('expressCheckout');
        const into = theWallets.current;

        if (into !== null) {
          wallet.mount(into);
        }

        return [wallet];
      },
    });

    drawsNext = (what) =>
      setDrawing((held) => ({
        count: what.replacesTheNode ? held.count + 1 : held.count,
        holds: !what.takesTheNodeAway,
      }));
    readsTheElements = theElements;
    paysWith = confirmsThePayment;

    return drawing.holds ? (
      <>
        <div key={`the wallets ${drawing.count}`} ref={theWallets} />
        <div key={`the card form ${drawing.count}`} ref={drawsTheCardForm} />
      </>
    ) : null;
  }

  const root = createRoot(host);

  await act(async () => {
    root.render(<AHostThatRedraws />);
  });

  return {
    host,
    did: stripe.did,
    theNode: () => [...host.querySelectorAll('div')].at(-1) ?? null,
    theElements: () => readsTheElements(),
    confirmsThePayment: (clientSecret: string) => paysWith(clientSecret),
    draws: async (what: WhatTheHostDraws) => {
      await act(async () => {
        drawsNext(what);
      });
    },
    letsStripeArrive: async () => {
      await act(async () => {
        itArrives();
      });
    },
  };
}

beforeEach(() => {
  // React draws nothing outside an act environment, and the runner sets no such flag of its own.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('the card form of a page that draws its children again', () => {
  describe('the first drawing', () => {
    it('draws the wallets and the card form into the node the page gave it', async () => {
      const driven = await aFormDrivenByTheHook();

      expect(theElementsOnThePage(driven)).toEqual([THE_WALLETS, THE_CARD_FORM]);
      expect(driven.did.destroyed).toEqual([]);
    });
  });

  describe('the node it drew into being replaced', () => {
    it('draws the wallets and the card form into the node on the page now', async () => {
      const driven = await aFormDrivenByTheHook();
      const before = driven.theNode();

      await driven.draws({ replacesTheNode: true, takesTheNodeAway: false });

      expect(driven.theNode()).not.toBe(before);
      expect(theElementsOnThePage(driven)).toEqual([THE_WALLETS, THE_CARD_FORM]);
      expect(driven.did.mounted).toEqual([THE_WALLETS, THE_CARD_FORM, THE_WALLETS, THE_CARD_FORM]);
    });

    it('destroys the pair that went with the node, the wallets included', async () => {
      const driven = await aFormDrivenByTheHook();

      await driven.draws({ replacesTheNode: true, takesTheNodeAway: false });

      expect(driven.did.destroyed).toEqual([THE_WALLETS, THE_CARD_FORM]);
    });

    it('answers the group of the pair on the page, so a press confirms on that one', async () => {
      const driven = await aFormDrivenByTheHook();

      await driven.draws({ replacesTheNode: true, takesTheNodeAway: false });

      expect(driven.did.groups).toHaveLength(2);
      expect(driven.theElements()).toBe(driven.did.groups[1]);
    });
  });

  describe('the node it drew into going away', () => {
    it('destroys the pair and answers no group at all, because there is none', async () => {
      const driven = await aFormDrivenByTheHook();

      await driven.draws({ replacesTheNode: false, takesTheNodeAway: true });

      expect(driven.did.destroyed).toEqual([THE_WALLETS, THE_CARD_FORM]);
      expect(theElementsOnThePage(driven)).toEqual([]);
      expect(driven.theElements()).toBeNull();
    });
  });

  describe('Stripe arriving after she has moved on', () => {
    it('draws into the node on the page, never into the one that was replaced', async () => {
      const driven = await aFormDrivenByTheHook({ stripeArrivesLate: true });
      const before = driven.theNode();

      await driven.draws({ replacesTheNode: true, takesTheNodeAway: false });
      await driven.letsStripeArrive();

      expect(theElementsOnThePage(driven)).toEqual([THE_WALLETS, THE_CARD_FORM]);
      expect(driven.did.mounted).toEqual([THE_WALLETS, THE_CARD_FORM]);
      expect(driven.did.went.map((drawn) => drawn.into)).not.toContain(before);
    });

    it('draws nothing at all where the node is gone, and holds no group', async () => {
      const driven = await aFormDrivenByTheHook({ stripeArrivesLate: true });

      await driven.draws({ replacesTheNode: false, takesTheNodeAway: true });
      await driven.letsStripeArrive();

      expect(driven.did.mounted).toEqual([]);
      expect(driven.theElements()).toBeNull();
    });
  });

  /**
   * The one charge of a plan with no free month. Her card is on the customer by then, so the
   * charge carries the secret of the invoice and no elements: nothing is collected here, and the
   * only thing that may still happen is her bank asking her a question.
   */
  describe('the charge of a plan with no free month', () => {
    const theSecret = 'in_000000000001_secret_the-double-wrote-this';

    it('confirms the charge on the secret it was given, and collects nothing', async () => {
      const driven = await aFormDrivenByTheHook();

      const said = await driven.confirmsThePayment(theSecret);

      expect(said.error).toBeUndefined();
      expect(driven.did.paid).toHaveLength(1);
      expect(driven.did.paid[0]).toEqual({
        clientSecret: theSecret,
        confirmParams: { return_url: WHERE_A_BANK_SENDS_HER_BACK },
        redirect: 'if_required',
      });
    });

    it('sends her bank the address it sends her back to, which is her account', async () => {
      const driven = await aFormDrivenByTheHook();

      await driven.confirmsThePayment(theSecret);

      const asked = driven.did.paid[0] as { confirmParams?: { return_url?: string } };

      expect(asked.confirmParams?.return_url).toBe(WHERE_A_BANK_SENDS_HER_BACK);
    });

    it('confirms no setup, because the card was collected by the press before it', async () => {
      const driven = await aFormDrivenByTheHook();

      await driven.confirmsThePayment(theSecret);

      expect(driven.did.paid[0]?.elements).toBeUndefined();
    });
  });
});
