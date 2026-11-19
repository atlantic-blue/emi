'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { thePriceOnThisSite } from '@/lib/theOnePrice';
import { theSessionHeld, whenTheSessionChanges } from '@/lib/theSessionSheHolds';
import {
  type HowItAsks,
  type WhatSheHolds,
  theDateWritten,
  theSubscriptionSheHolds,
  theYearHasRunOut,
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
 * None of them is a press yet, so each is drawn as the board draws it and refuses a press, and the
 * line under them says so.
 */

/** Where a woman with no subscription is offered one, which is the page she buys Emi on. */
export const WHERE_SHE_BUYS_EMI = 'checkout/';

/** What the card is bound to, so a test drives the real card against an api that answers it. */
export interface WhatTheSubscriptionCardNeeds {
  readonly language: Language;
  readonly words: SiteWords;
  readonly asks?: HowItAsks;
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

const theRows = ['accountReceipts', 'accountChangeCard', 'accountCancelRenewal'] as const;

export function TheSubscriptionCard({
  language,
  words,
  asks,
  clock = () => new Date(),
}: WhatTheSubscriptionCardNeeds) {
  const token = useSyncExternalStore(whenTheSessionChanges, whatHerBrowserHolds, whatAServerKnows);
  const [answered, setAnswered] = useState<{ readonly held: WhatSheHolds | null } | null>(null);

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
                {(which === 'active' ? words.accountRenewsOn : words.accountPaidUntil)
                  .replace('{amount}', thePriceOnThisSite.amount)
                  .replace('{date}', theDateWritten(language, words, paidUntil))}
              </span>
            </span>
            <span className="rounded-full bg-siteTintLine px-spaceMd py-spaceXs text-body-sm font-semibold">
              {which === 'active' ? words.accountStateActive : words.accountStateRenewalOff}
            </span>
          </div>

          {read?.route === 'card' ? (
            <div className="flex min-h-[52px] items-center justify-between border-b-hairline border-siteTintLine px-margin text-body-lg">
              <span>{words.accountPaidWith}</span>
              <span className="text-siteQuietText">{words.accountPaidWithCard}</span>
            </div>
          ) : null}

          {theRows.map((row) => (
            <button
              className="flex min-h-[52px] w-full items-center justify-between border-b-hairline border-siteTintLine px-margin text-left text-body-lg text-siteQuietText last:border-b-0"
              disabled
              key={row}
              type="button"
            >
              <span>{words[row]}</span>
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}

      {which === 'noSubscription' ? null : (
        <span className="ml-spaceLg text-body-sm text-siteQuietText">
          {words.accountRowsComeLater}
        </span>
      )}

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
