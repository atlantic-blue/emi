'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { TheChangeCardForm } from '@/components/theChangeCardForm';
import { SITE_ORIGIN } from '@/lib/addresses';
import {
  type OneReceipt,
  theReceiptAmount,
  theReceiptDay,
  theReceiptsSheHolds,
} from '@/lib/theReceiptsSheHolds';
import { theSessionHeld, whenTheSessionChanges } from '@/lib/theSessionSheHolds';
import { type HowStripeArrives, thePublishableKey } from '@/lib/theStripeOnThePage';
import {
  type HowItAsks,
  type WhatSheHolds,
  theDateWritten,
  theRenewalSheSets,
  theSubscriptionSheHolds,
  theYearHasRunOut,
  theYearIsAlmostUp,
  whatTheRenewalRowDoes,
  whichCardSheReads,
} from '@/lib/theSubscriptionSheHolds';

/**
 * The subscription card of her account, from
 * `docs/design/website/sign-in/boards/Profile.dc.html`: the plan, the date, the state and the way
 * she paid.
 *
 * It runs in her browser because the session runs there. A server of this site never reads her
 * tokens, so it cannot know whether she pays, and the card is drawn once the browser has asked.
 *
 * The three rows the board draws under the card are Receipts, Change card and Cancel renewal.
 * Receipts opens a list of what Stripe holds, inside the card. Change card opens the card form of
 * the Buy Emi board, inside the card, and closes it again once the service is charging the new
 * card. Cancel renewal stops the renewal at the end of the year she paid for, and once it is
 * stopped the same row starts it again.
 *
 * A change that the route would not take leaves the card exactly as it was and says one line. The
 * card is never drawn from what the press asked for: it is drawn from what the route answered, so
 * a renewal that did not move on the payment service does not read as moved here.
 */

/** Where a woman with no subscription is offered one, which is the page she buys Emi on. */
export const WHERE_SHE_BUYS_EMI = 'checkout/';

/** The page this card is drawn on, which a bank that asked her a question sends her back to. */
export const WHERE_HER_ACCOUNT_IS = 'account/';

/** What the card is bound to, so a test drives the real card against an api that answers it. */
export interface WhatTheSubscriptionCardNeeds {
  readonly language: Language;
  readonly words: SiteWords;
  readonly asks?: HowItAsks;
  /** The key the build was given. An empty one opens the row and draws no card form. */
  readonly publishableKey?: string;
  readonly stripeArrives?: HowStripeArrives;
  /** The instant the card is drawn for, which decides whether the date she paid until has passed. */
  readonly clock?: () => Date;
}

/**
 * The token her browser holds, in three states rather than two.
 *
 * Nothing at all is the state a server is in and the state the first drawing in her browser is in,
 * because that drawing has to match what the server sent or the page cannot take it over. Two
 * states would draw "no subscription" at a woman who pays, for as long as it takes her browser to
 * read the one it holds.
 */
const whatHerBrowserHolds = (): string | null => theSessionHeld()?.idToken ?? null;

const whatAServerKnows = (): string | undefined => undefined;

/** One press, from the moment it leaves to the moment the route answers it. */
type WhereThePressIs = 'waiting' | 'running' | 'refused';

/** Where the read of her receipts is: never asked, asking, answered, or refused. */
type WhereTheReceiptsAre = 'unasked' | 'running' | 'read' | 'refused';

const rowStyle =
  'flex min-h-[52px] w-full items-center justify-between border-b-hairline border-siteTintLine px-margin text-left text-body-lg last:border-b-0';

export function TheSubscriptionCard({
  language,
  words,
  asks,
  publishableKey = thePublishableKey(),
  stripeArrives,
  clock = () => new Date(),
}: WhatTheSubscriptionCardNeeds) {
  const token = useSyncExternalStore(whenTheSessionChanges, whatHerBrowserHolds, whatAServerKnows);
  const [answered, setAnswered] = useState<{ readonly held: WhatSheHolds | null } | null>(null);
  const [thePress, setThePress] = useState<WhereThePressIs>('waiting');
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [theReceipts, setTheReceipts] = useState<readonly OneReceipt[]>([]);
  const [thePageAfter, setThePageAfter] = useState<string | null>(null);
  const [theReceiptsRead, setTheReceiptsRead] = useState<WhereTheReceiptsAre>('unasked');
  const [theCardFormIsOpen, setTheCardFormIsOpen] = useState(false);
  const closesTheCardForm = useCallback(() => setTheCardFormIsOpen(false), []);

  useEffect(() => {
    if (token === null || token === undefined) {
      return;
    }

    let left = false;

    void theSubscriptionSheHolds(token, asks).then((held) => {
      if (!left) {
        setAnswered({ held });
      }
    });

    return () => {
      left = true;
    };
  }, [asks, token]);

  // Until her browser has read the session, and until the route has answered the token it found,
  // the card draws nothing. A card drawn before either would say she holds no subscription.
  if (token === undefined || (token !== null && answered === null)) {
    return null;
  }

  const now = clock();
  const read = token === null ? null : (answered?.held ?? null);
  const which = whichCardSheReads(read, now);
  const paidUntil = read?.paidUntil;
  const theRenewal = whatTheRenewalRowDoes(read);
  // A payment in Stars renews nothing and is not held on a card, so the two rows that change a
  // renewal and a card are not drawn at all. She stops nothing: the year ends on its own.
  const nothingRenews = read?.route === 'stars';

  const theLineUnderThePlan = (): string => {
    if (nothingRenews) {
      return words.accountStarsPaidUntil;
    }

    return which === 'active' ? words.accountRenewsOn : words.accountPaidUntil;
  };

  const readsAPageOfReceipts = (cursor: string | null): void => {
    if (token === null || token === undefined) {
      return;
    }

    setTheReceiptsRead('running');

    void theReceiptsSheHolds(token, cursor, asks).then((page) => {
      if (page === null) {
        setTheReceiptsRead('refused');

        return;
      }

      setTheReceiptsRead('read');
      setTheReceipts((held) => (cursor === null ? page.receipts : [...held, ...page.receipts]));
      setThePageAfter(page.cursor);
    });
  };

  const pressesReceipts = (): void => {
    if (receiptsOpen) {
      setReceiptsOpen(false);

      return;
    }

    setReceiptsOpen(true);

    // A read she already has is drawn again rather than asked for again, and a read that was
    // refused is asked for again, because pressing the row twice is the whole of what she can do
    // about a refusal.
    if (theReceiptsRead === 'unasked' || theReceiptsRead === 'refused') {
      readsAPageOfReceipts(null);
    }
  };

  const pressesTheRenewal = (): void => {
    if (token === null || token === undefined || theRenewal === 'nothing') {
      return;
    }

    setThePress('running');

    void theRenewalSheSets(token, theRenewal === 'starts', asks).then((held) => {
      setThePress(held === null ? 'refused' : 'waiting');

      if (held !== null) {
        setAnswered({ held });
      }
    });
  };

  return (
    <section aria-labelledby="her-subscription" className="flex flex-col gap-spaceSm">
      <h2
        className="ml-spaceLg text-body-sm font-semibold tracking-[0.02em] text-siteQuietText"
        id="her-subscription"
      >
        {words.accountSubscriptionHeading}
      </h2>

      {which === 'noSubscription' || paidUntil === undefined ? (
        <div className="flex flex-col gap-spaceMd rounded-lg bg-siteCard p-margin">
          <span className="text-body-lg">{words.accountNoSubscription}</span>
          <a className="text-body-lg text-siteAccent" href={`/${language}/${WHERE_SHE_BUYS_EMI}`}>
            {words.accountBuyEmi}
          </a>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-siteCard">
          <div className="flex flex-wrap items-center justify-between gap-spaceMd border-b-hairline border-siteTintLine p-margin">
            <span className="flex flex-col">
              <span className="text-body-lg font-semibold">{words.accountPlanName}</span>
              <span className="text-body-sm text-siteQuietText">
                {theLineUnderThePlan().replace(
                  '{date}',
                  theDateWritten(language, words, paidUntil),
                )}
              </span>
            </span>
            <span className="rounded-full bg-siteTintLine px-spaceMd py-spaceXs text-body-sm font-semibold">
              {which === 'active' ? words.accountStateActive : words.accountStateRenewalOff}
            </span>
          </div>

          {read?.route === undefined ? null : (
            <div className="flex min-h-[52px] items-center justify-between border-b-hairline border-siteTintLine px-margin text-body-lg">
              <span>{words.accountPaidWith}</span>
              <span className="text-siteQuietText">
                {nothingRenews ? words.accountPaidWithStars : words.accountPaidWithCard}
              </span>
            </div>
          )}

          <button
            aria-expanded={receiptsOpen}
            className={rowStyle}
            onClick={pressesReceipts}
            type="button"
          >
            <span>{words.accountReceipts}</span>
            <span aria-hidden="true">›</span>
          </button>

          {receiptsOpen ? (
            <div className="flex flex-col border-b-hairline border-siteTintLine">
              {theReceiptsRead === 'refused' ? (
                <span className="px-margin py-spaceMd text-body-sm text-siteAccent" role="status">
                  {words.accountReceiptsDidNotLoad}
                </span>
              ) : null}

              {theReceiptsRead === 'read' && theReceipts.length === 0 ? (
                <span className="px-margin py-spaceMd text-body-sm text-siteQuietText">
                  {words.accountReceiptsEmpty}
                </span>
              ) : null}

              {theReceipts.map((receipt) => (
                <a
                  className={rowStyle}
                  href={receipt.invoiceUrl}
                  key={receipt.invoiceUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span>{theReceiptDay(language, receipt.invoicedAt)}</span>
                  <span className="text-siteQuietText">
                    {theReceiptAmount(language, receipt.amount, receipt.currency)}
                  </span>
                </a>
              ))}

              {thePageAfter === null ? null : (
                <button
                  className={`${rowStyle} text-siteAccent`}
                  disabled={theReceiptsRead === 'running'}
                  onClick={() => {
                    readsAPageOfReceipts(thePageAfter);
                  }}
                  type="button"
                >
                  <span>{words.accountMoreReceipts}</span>
                </button>
              )}
            </div>
          ) : null}

          {nothingRenews ? null : (
            <button
              aria-expanded={theCardFormIsOpen}
              className={rowStyle}
              onClick={() => setTheCardFormIsOpen(!theCardFormIsOpen)}
              type="button"
            >
              <span>{words.accountChangeCard}</span>
              <span aria-hidden="true">›</span>
            </button>
          )}

          {theCardFormIsOpen && !nothingRenews && token !== null && token !== undefined ? (
            <TheChangeCardForm
              asks={asks}
              comesBackTo={`${SITE_ORIGIN}/${language}/${WHERE_HER_ACCOUNT_IS}`}
              idToken={token}
              publishableKey={publishableKey}
              stripeArrives={stripeArrives}
              whenTheCardChanged={closesTheCardForm}
              words={words}
            />
          ) : null}

          {nothingRenews ? null : (
            <button
              className={`${rowStyle} ${theRenewal === 'nothing' ? 'text-siteQuietText' : 'text-siteAccent'}`}
              disabled={theRenewal === 'nothing' || thePress === 'running'}
              onClick={pressesTheRenewal}
              type="button"
            >
              <span>
                {theRenewal === 'starts' ? words.accountTurnRenewalOn : words.accountCancelRenewal}
              </span>
            </button>
          )}

          {nothingRenews && theYearIsAlmostUp(read, now) ? (
            <a
              className={`${rowStyle} text-siteAccent`}
              href={`/${language}/${WHERE_SHE_BUYS_EMI}`}
            >
              <span>{words.accountBuyAnotherYear}</span>
            </a>
          ) : null}
        </div>
      )}

      {thePress === 'refused' ? (
        <span className="ml-spaceLg text-body-sm text-siteAccent" role="status">
          {words.accountRenewalDidNotChange}
        </span>
      ) : null}

      {theYearHasRunOut(read, now) ? (
        <a
          className="ml-spaceLg text-body-lg text-siteAccent"
          href={`/${language}/${WHERE_SHE_BUYS_EMI}`}
        >
          {words.accountBuyEmi}
        </a>
      ) : null}
    </section>
  );
}
