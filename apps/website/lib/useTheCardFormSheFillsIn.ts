'use client';

import { useCallback, useRef } from 'react';

import {
  type AnElementOfStripe,
  type HowStripeArrives,
  type TheElementsOfTheForm,
  type WhatTheConfirmationSaid,
  stripeArrives,
} from './theStripeOnThePage';

/**
 * The card form of Stripe, as the two places that collect a payment method drive it: the page she
 * buys Emi on, and the Change card row of her account.
 *
 * Both mount one Payment Element in the setup mode, ask Stripe whether what she filled in is
 * complete, and confirm a setup the service answered with. The two differ in the route they ask
 * for that setup and in where they leave her, so those stay with each form and the rest is here.
 *
 * Stripe is given the element the moment a browser attaches it, rather than on a pass of its own,
 * because the form is drawn inside a row she opens and that row is not there to be mounted into
 * until she opens it.
 *
 * A browser also takes that element away again, and it may hand over another one in its place.
 * She closes the Change card row, or her session goes and the sign in gate draws the page again.
 * An element of Stripe lives inside the node it was mounted into, so an element whose node went
 * away draws nothing at all. Each one is destroyed at that moment, and the next node a browser
 * gives is drawn on from the start.
 *
 * Stripe itself arrives after the press that needed it, which may be after she moved on. So what
 * it answers is drawn only while the node it was asked for is still the node on the page.
 */

/** The currency the one price is charged in, which the elements are drawn for. */
export const THE_CURRENCY = 'eur';

/** What a form hands this module, and what it draws alongside the card. */
export interface WhatTheCardFormNeeds {
  /** The key the build was given. An empty one draws no form at all. */
  readonly publishableKey: string;
  readonly stripeArrives?: HowStripeArrives;
  /** Where a bank that asked her a question sends her back to, written out whole. */
  readonly comesBackTo: string;
  /**
   * Drawn on the same group of elements, before the card form is. The wallets of a device are the
   * one thing that goes here: Stripe draws them in the first element of a page alone, so a form
   * that offers them has to make that element before this module makes its own.
   */
  readonly alsoDraws?: (elements: TheElementsOfTheForm) => readonly AnElementOfStripe[];
}

/** The form on the page: where it is drawn, and the two calls that take what she filled in. */
export interface TheCardFormOnThePage {
  /**
   * Given to the element the card form is drawn inside, where its board draws it. A browser hands
   * it that element, and null where it takes the element off the page again.
   */
  readonly drawsTheCardForm: (into: HTMLDivElement | null) => void;
  /** The group the elements belong to, once Stripe has drawn them, and nothing before that. */
  readonly theElements: () => TheElementsOfTheForm | null;
  /**
   * Whether what she filled in is complete. Where it is not, Stripe has drawn what is missing
   * inside its own element, in her language, so the form repeats nothing and stays where it is.
   */
  readonly isComplete: (elements: TheElementsOfTheForm) => Promise<boolean>;
  /** What she filled in, confirmed against a setup the service answered with. */
  readonly confirms: (
    elements: TheElementsOfTheForm,
    clientSecret: string,
  ) => Promise<WhatTheConfirmationSaid>;
}

export function useTheCardFormSheFillsIn({
  publishableKey,
  stripeArrives: arrives = stripeArrives,
  comesBackTo,
  alsoDraws,
}: WhatTheCardFormNeeds): TheCardFormOnThePage {
  const held = useRef<{ elements: TheElementsOfTheForm; drawn: AnElementOfStripe[] } | null>(null);
  const theNodeOnThePage = useRef<HTMLDivElement | null>(null);

  const drawsTheCardForm = useCallback(
    (into: HTMLDivElement | null): void => {
      theNodeOnThePage.current = into;

      if (into === null) {
        for (const element of held.current?.drawn ?? []) {
          element.destroy();
        }

        held.current = null;

        return;
      }

      if (publishableKey.length === 0 || held.current !== null) {
        return;
      }

      void (async () => {
        const stripe = await arrives(publishableKey);

        if (stripe === null || held.current !== null || theNodeOnThePage.current !== into) {
          return;
        }

        const elements = stripe.elements({ mode: 'setup', currency: THE_CURRENCY });
        const beside = alsoDraws?.(elements) ?? [];
        const form = elements.create('payment');

        form.mount(into);

        held.current = { elements, drawn: [...beside, form] };
      })();
    },
    [alsoDraws, arrives, publishableKey],
  );

  const isComplete = useCallback(async (elements: TheElementsOfTheForm): Promise<boolean> => {
    const ready = await elements.submit();

    return ready.error === undefined;
  }, []);

  const confirms = useCallback(
    async (
      elements: TheElementsOfTheForm,
      clientSecret: string,
    ): Promise<WhatTheConfirmationSaid> => {
      const stripe = await arrives(publishableKey);

      return (
        (await stripe?.confirmSetup({
          elements,
          clientSecret,
          confirmParams: { return_url: comesBackTo },
          redirect: 'if_required',
        })) ?? { error: {} }
      );
    },
    [arrives, comesBackTo, publishableKey],
  );

  const theElements = useCallback(
    (): TheElementsOfTheForm | null => held.current?.elements ?? null,
    [],
  );

  return { drawsTheCardForm, theElements, isComplete, confirms };
}
