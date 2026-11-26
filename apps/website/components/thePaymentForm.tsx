'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { SITE_ORIGIN } from '@/lib/addresses';
import { type AnOffer, theOfferOnThePage } from '@/lib/theOfferSheArrivedWith';
import { anInvoiceInStars, theStarsSheWouldPay } from '@/lib/thePaymentInStars';
import { theSessionHeld } from '@/lib/theSessionSheHolds';
import { theTermsPageIsBuilt } from '@/lib/theTermsPage';
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
 * `docs/design/website/checkout/boards/Checkout.dc.html`: the two ways to pay, the wallets, the
 * card form, the terms line and the press that pays.
 *
 * The wallets and the card form are two elements of Stripe rather than one. Stripe draws each
 * wallet in the first element alone when both are on a page, so the buttons sit above the line and
 * the card form below it, and a device with no wallet draws neither the buttons nor the line.
 *
 * Nothing is asked of Emi until she presses. The elements are made in the setup mode, so the
 * customer and the setup are made by the press and a reader who opens the page and leaves has
 * bought nothing and is held nowhere.
 *
 * One press can confirm twice. The card is always collected against a setup, and a plan with no
 * free month is then charged at once, which is a second confirmation on the invoice the service
 * answers with. The one price has a free month in front of it, so there it confirms once.
 *
 * The Stars choice is paid for in Telegram and not here. The press asks for an invoice and hands
 * her browser the address the route answered, so this page takes nothing and holds nothing: the
 * payment arrives as a message to the bot, and her account reads it afterwards. A payment in Stars
 * buys one year and renews nothing, and it carries no free month.
 *
 * Two things the Stars choice says that the board does not. It names the count of Stars, because
 * the board was drawn before the price was decided. And it tells her to come back to this page
 * rather than to open the application, because her account on this site is where the year lands.
 */

/** Where a finished setup leaves her, which is the account page in the language she is reading. */
export const WHERE_A_PAYMENT_LANDS = 'account/';

/**
 * Where the terms sit, under the language she is reading. Nobody has written that page, so the
 * line below names the terms without a press until `theTermsPageIsBuilt` says the page is there.
 */
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
  /** Taken as an argument so a case can draw the terms line with its page and without it. */
  readonly theTermsHaveAPage?: boolean;
}

/** Which of the two ways she is looking at. The board opens on the card. */
type TheWayShePays = 'card' | 'stars';

const theChoice = (chosen: boolean): string =>
  [
    'flex min-h-[64px] w-full items-center justify-between gap-spaceMd rounded-lg bg-siteCard px-margin py-spaceLg text-left',
    chosen ? 'border-2 border-siteAccent' : 'border-hairline border-siteControlLine',
  ].join(' ');

export function ThePaymentForm({
  language,
  words,
  publishableKey,
  stripeArrives: arrives = stripeArrives,
  asks,
  now,
  theTermsHaveAPage = theTermsPageIsBuilt,
}: WhatThePaymentFormNeeds) {
  // Read once, when the form draws, which is the same read the plan above it makes. The press and
  // the words on it then agree with the amount she was shown, whatever the clock does afterwards.
  const [offer] = useState<AnOffer | null>(() => theOfferOnThePage(now));
  const [way, setWay] = useState<TheWayShePays>('card');
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

  const { drawsTheCardForm, theElements, isComplete, confirms, confirmsThePayment } =
    useTheCardFormSheFillsIn({
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
      const made =
        setupRef === undefined
          ? null
          : await finishASubscription(session.idToken, setupRef, asks, offer);

      // A press on an offer leaves a charge waiting, so a route that named none has made a
      // subscription nobody has paid for, and an account page saying she pays would be wrong.
      if (made === null || (offer !== null && made.paymentSecret === null)) {
        setPaying(false);
        setWhatWentWrong(words.checkoutCouldNotStart);

        return;
      }

      // A plan with no free month is charged at once, and the charge waits for her browser, so her
      // bank asks its question here rather than against a payment made while she is gone.
      if (made.paymentSecret !== null) {
        const paid = await confirmsThePayment(made.paymentSecret);

        if (paid.error !== undefined) {
          setPaying(false);
          setWhatWentWrong(paid.error.message ?? words.checkoutCouldNotStart);

          return;
        }
      }

      goTo(`/${language}/${WHERE_A_PAYMENT_LANDS}`);
    },
    [
      asks,
      confirms,
      confirmsThePayment,
      isComplete,
      language,
      offer,
      paying,
      words.checkoutCouldNotStart,
    ],
  );

  const opensTheBot = useCallback(async (): Promise<void> => {
    const session = theSessionHeld();

    if (session === null || paying) {
      return;
    }

    setPaying(true);
    setWhatWentWrong(null);

    const said = await anInvoiceInStars(session.idToken, asks, offer);

    if ('opens' in said) {
      // Her browser leaves this site here, so the press stays held: she is reading Telegram by the
      // time anything else could happen on this page.
      goTo(said.opens);

      return;
    }

    setPaying(false);
    setWhatWentWrong(
      said.refused === 'sheAlreadyHoldsEmi'
        ? words.checkoutStarsAlreadyPaid
        : words.checkoutStarsNothingTaken,
    );
  }, [asks, offer, paying, words.checkoutStarsAlreadyPaid, words.checkoutStarsNothingTaken]);

  const picks = (chosen: TheWayShePays): void => {
    setWay(chosen);
    // What went wrong on one way is nothing to do with the other, so the line goes with the way.
    setWhatWentWrong(null);
  };

  useEffect(() => {
    pressesPay.current = (elements) => void pay(elements);
  }, [pay]);

  if (publishableKey.length === 0) {
    return <p className="text-body-sm text-siteQuietText">{words.checkoutNoPaymentFormYet}</p>;
  }

  const terms = words.checkoutTerms.split('{terms}');

  const theTermsLine = (
    <p className="text-body-sm text-siteQuietText">
      {terms[0]}
      {theTermsHaveAPage ? (
        <a className="text-siteAccent" href={`/${language}/${WHERE_THE_TERMS_ARE}`}>
          {words.checkoutTermsLink}
        </a>
      ) : (
        words.checkoutTermsLink
      )}
      {terms[1]}
    </p>
  );

  const theLineThatWentWrong =
    whatWentWrong === null ? null : (
      <p className="text-body-sm text-siteAccent" role="alert">
        {whatWentWrong}
      </p>
    );

  return (
    <>
      <section aria-labelledby="how-she-pays" className="flex flex-col gap-spaceMd">
        <h2 className="text-[19px] leading-[26px] font-semibold" id="how-she-pays">
          {words.checkoutMethodHeading}{' '}
          <span className="font-normal text-siteQuietText">{words.checkoutMethodQuestion}</span>
        </h2>
        <button
          aria-pressed={way === 'card'}
          className={theChoice(way === 'card')}
          onClick={() => picks('card')}
          type="button"
        >
          <span className="flex flex-col">
            <span className="text-body-lg font-semibold">{words.checkoutPayByCard}</span>
            <span className="text-body-sm text-siteQuietText">{words.checkoutPayByCardWhere}</span>
          </span>
        </button>
        <button
          aria-pressed={way === 'stars'}
          className={theChoice(way === 'stars')}
          onClick={() => picks('stars')}
          type="button"
        >
          <span className="flex flex-col">
            <span className="text-body-lg font-semibold">{words.checkoutPayByStars}</span>
            <span className="text-body-sm text-siteQuietText">{words.checkoutPayByStarsWhere}</span>
          </span>
        </button>
      </section>

      {way === 'card' ? (
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
          {theTermsLine}
          {theLineThatWentWrong}
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
      ) : (
        <div className="flex flex-col gap-spaceMd">
          <p className="text-body-lg font-semibold">
            {words.checkoutStarsPrice.replace('{stars}', `${theStarsSheWouldPay(offer)}`)}
          </p>
          <p className="text-body-lg text-siteQuietText">{words.checkoutStarsOneYear}</p>
          <p className="text-body-lg text-siteQuietText">{words.checkoutStarsComeBack}</p>
          {theTermsLine}
          {theLineThatWentWrong}
          <button
            className="min-h-[52px] rounded-lg bg-siteAccent text-body-lg font-semibold text-siteCard"
            disabled={paying}
            onClick={() => void opensTheBot()}
            type="button"
          >
            {words.checkoutStarsOpenTheBot}
          </button>
        </div>
      )}
    </>
  );
}
