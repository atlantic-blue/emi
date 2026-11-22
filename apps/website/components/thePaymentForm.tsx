'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { SITE_ORIGIN } from '@/lib/addresses';
import { type AnOffer, theOfferOnThePage } from '@/lib/theOfferSheArrivedWith';
import { theSessionHeld } from '@/lib/theSessionSheHolds';
import {
  type HowStripeArrives,
  type TheElementsOfTheForm,
  stripeArrives,
} from '@/lib/theStripeOnThePage';
import {
  finishASubscription,
  type HowItAsks,
  startASubscription,
} from '@/lib/theSubscriptionSheStarts';
import { useTheCardFormSheFillsIn } from '@/lib/useTheCardFormSheFillsIn';
import { goTo } from '@/lib/whereSheGoesNext';

/**
 * The half of the Buy Emi page that takes money, from
 * `docs/design/website/checkout/boards/Checkout.dc.html`: the card route, the wallets, the card
 * form, the terms line and the press that pays.
 *
 * The board draws a second route, Telegram Stars in the Emi bot. No bot answers it, so the page
 * leaves that route out by decision and draws the card route alone. One route is not a choice, so
 * the route is a line she reads and not a press.
 *
 * The wallets and the card form are two elements of Stripe rather than one. Stripe draws each
 * wallet in the first element alone when both are on a page, so the buttons sit above the line and
 * the card form below it, and a device with no wallet draws neither the buttons nor the line.
 *
 * Nothing is asked of Emi until she presses. The elements are made in the setup mode, so the
 * customer and the setup are made by the press and a reader who opens the page and leaves has
 * bought nothing and is held nowhere.
 */

/** Where a finished setup leaves her, which is the account page in the language she is reading. */
export const WHERE_A_PAYMENT_LANDS = 'account/';

/** Where the terms sit, under the language she is reading. That page is built by its own step. */
export const WHERE_THE_TERMS_ARE = 'terms/';

/** What the form is driving, so a test runs the real component against doubles of both. */
export interface WhatThePaymentFormNeeds {
  readonly language: Language;
  readonly words: SiteWords;
  /** The key the build was given. An empty one draws no form at all. */
  readonly publishableKey: string;
  readonly stripeArrives?: HowStripeArrives;
  readonly asks?: HowItAsks;
  /** Taken as an argument so a case can press on either side of the end of the offer. */
  readonly now?: Date;
}

const theRoute =
  'flex min-h-[64px] w-full items-center justify-between gap-spaceMd rounded-lg border-2 border-siteAccent bg-siteCard px-margin py-spaceLg';

export function ThePaymentForm({
  language,
  words,
  publishableKey,
  stripeArrives: arrives = stripeArrives,
  asks,
  now,
}: WhatThePaymentFormNeeds) {
  // Read once, when the form draws, which is the same read the plan above it makes. The press and
  // the words on it then agree with the amount she was shown, whatever the clock does afterwards.
  const [offer] = useState<AnOffer | null>(() => theOfferOnThePage(now));
  const [hasAWallet, setHasAWallet] = useState(false);
  const [paying, setPaying] = useState(false);
  const [whatWentWrong, setWhatWentWrong] = useState<string | null>(null);
  const theWallets = useRef<HTMLDivElement | null>(null);
  // A wallet confirms through the press of Stripe's own element rather than through the one this
  // page draws, and that element is made once, so it is given the press rather than a copy of it.
  const pressesPay = useRef<(elements: TheElementsOfTheForm) => void>(() => undefined);

  const drawsTheWallets = useCallback((elements: TheElementsOfTheForm) => {
    const wallet = elements.create('expressCheckout');
    const into = theWallets.current;

    wallet.on('ready', (said) => {
      const offered = said.availablePaymentMethods;

      setHasAWallet(typeof offered === 'object' && offered !== null);
    });
    wallet.on('confirm', () => pressesPay.current(elements));

    if (into !== null) {
      wallet.mount(into);
    }

    return [wallet];
  }, []);

  const { drawsTheCardForm, theElements, isComplete, confirms } = useTheCardFormSheFillsIn({
    publishableKey,
    stripeArrives: arrives,
    comesBackTo: `${SITE_ORIGIN}/${language}/${WHERE_A_PAYMENT_LANDS}`,
    alsoDraws: drawsTheWallets,
  });

  const pay = useCallback(
    async (elements: TheElementsOfTheForm): Promise<void> => {
      const session = theSessionHeld();

      if (session === null || paying) {
        return;
      }

      setPaying(true);
      setWhatWentWrong(null);

      if (!(await isComplete(elements))) {
        setPaying(false);

        return;
      }

      const started = await startASubscription(session.idToken, asks);

      if (started === null) {
        setPaying(false);
        setWhatWentWrong(words.checkoutCouldNotStart);

        return;
      }

      const said = await confirms(elements, started.clientSecret);

      if (said.error !== undefined) {
        setPaying(false);
        setWhatWentWrong(said.error.message ?? words.checkoutCouldNotStart);

        return;
      }

      // Stripe holds her card at this line and nothing charges it yet. The subscription is created
      // by the call below, so a press that stopped here would leave her paying nothing and reading
      // an account page that says so.
      const setupRef = said.setupIntent?.id;
      const created =
        setupRef === undefined
          ? false
          : await finishASubscription(session.idToken, setupRef, asks, offer);

      if (!created) {
        setPaying(false);
        setWhatWentWrong(words.checkoutCouldNotStart);

        return;
      }

      goTo(`/${language}/${WHERE_A_PAYMENT_LANDS}`);
    },
    [asks, confirms, isComplete, language, offer, paying, words.checkoutCouldNotStart],
  );

  useEffect(() => {
    pressesPay.current = (elements) => void pay(elements);
  }, [pay]);

  if (publishableKey.length === 0) {
    return <p className="text-body-sm text-siteQuietText">{words.checkoutNoPaymentFormYet}</p>;
  }

  const terms = words.checkoutTerms.split('{terms}');

  return (
    <>
      <section aria-labelledby="how-she-pays" className="flex flex-col gap-spaceMd">
        <h2 className="text-[19px] leading-[26px] font-semibold" id="how-she-pays">
          {words.checkoutMethodHeading}{' '}
          <span className="font-normal text-siteQuietText">{words.checkoutMethodQuestion}</span>
        </h2>
        <div className={theRoute}>
          <span className="flex flex-col">
            <span className="text-body-lg font-semibold">{words.checkoutPayByCard}</span>
            <span className="text-body-sm text-siteQuietText">{words.checkoutPayByCardWhere}</span>
          </span>
        </div>
      </section>

      <div className="flex flex-col gap-spaceMd">
        <div ref={theWallets} />
        {hasAWallet ? (
          <div
            aria-hidden="true"
            className="flex items-center gap-spaceMd py-spaceXs text-body-sm text-siteQuietText"
          >
            <span className="h-hairline grow bg-siteTintLine" />
            {words.checkoutOrPayByCard}
            <span className="h-hairline grow bg-siteTintLine" />
          </div>
        ) : null}
        <div ref={drawsTheCardForm} />
        <p className="text-body-sm text-siteQuietText">
          {terms[0]}
          <a className="text-siteAccent" href={`/${language}/${WHERE_THE_TERMS_ARE}`}>
            {words.checkoutTermsLink}
          </a>
          {terms[1]}
        </p>
        {whatWentWrong === null ? null : (
          <p className="text-body-sm text-siteAccent" role="alert">
            {whatWentWrong}
          </p>
        )}
        <button
          className="min-h-[52px] rounded-lg bg-siteAccent text-body-lg font-semibold text-siteCard"
          disabled={paying}
          onClick={() => {
            const elements = theElements();

            if (elements !== null) {
              void pay(elements);
            }
          }}
          type="button"
        >
          {offer === null ? words.checkoutPay : words.checkoutOfferPay}
        </button>
      </div>
    </>
  );
}
