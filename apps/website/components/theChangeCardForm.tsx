'use client';

import { useCallback, useState } from 'react';

import type { SiteWords } from '@/app/words';
import { type HowItAsks, finishesACardChange, startsACardChange } from '@/lib/theCardSheChanges';
import type { HowStripeArrives } from '@/lib/theStripeOnThePage';
import { useTheCardFormSheFillsIn } from '@/lib/useTheCardFormSheFillsIn';

/**
 * The form the Change card row opens, under the card of her account.
 *
 * It is the card half of the Buy Emi board, drawn inside the account card: the element Stripe
 * takes a card or a wallet in, and one press. The wallets of the device and the terms line belong
 * to the page she buys Emi on, because this is a card she is replacing rather than a payment she
 * is agreeing to.
 *
 * The press takes three steps and she sees one. Emi opens a setup, Stripe takes what she filled in
 * against that setup, and Emi is then told which setup it was. The form closes on the third, so a
 * card that reached Stripe and not the service leaves the form open and her able to press again.
 */

/** What the form is driving, so a test runs the real component against doubles of both. */
export interface WhatTheChangeCardFormNeeds {
  readonly words: SiteWords;
  /** The token her browser holds, which both calls of the change carry. */
  readonly idToken: string;
  /** The key the build was given. An empty one draws no form at all. */
  readonly publishableKey: string;
  /** Where a bank that asked her a question sends her back to, written out whole. */
  readonly comesBackTo: string;
  readonly stripeArrives?: HowStripeArrives;
  readonly asks?: HowItAsks;
  /** Called once the service is charging the new card, which is where the form closes. */
  readonly whenTheCardChanged: () => void;
}

export function TheChangeCardForm({
  words,
  idToken,
  publishableKey,
  comesBackTo,
  stripeArrives: arrives,
  asks,
  whenTheCardChanged,
}: WhatTheChangeCardFormNeeds) {
  const [changing, setChanging] = useState(false);
  const [whatWentWrong, setWhatWentWrong] = useState<string | null>(null);
  const { drawsTheCardForm, theElements, isComplete, confirms } = useTheCardFormSheFillsIn({
    publishableKey,
    stripeArrives: arrives,
    comesBackTo,
  });

  const changesTheCard = useCallback(async (): Promise<void> => {
    const elements = theElements();

    if (elements === null || changing) {
      return;
    }

    setChanging(true);
    setWhatWentWrong(null);

    if (!(await isComplete(elements))) {
      setChanging(false);

      return;
    }

    const started = await startsACardChange(idToken, asks);

    if (started === null) {
      setChanging(false);
      setWhatWentWrong(words.accountCardDidNotChange);

      return;
    }

    const said = await confirms(elements, started.clientSecret);

    if (said.error !== undefined) {
      setChanging(false);
      setWhatWentWrong(said.error.message ?? words.accountCardDidNotChange);

      return;
    }

    const setupRef = said.setupIntent?.id;

    if (setupRef === undefined || !(await finishesACardChange(idToken, setupRef, asks))) {
      setChanging(false);
      setWhatWentWrong(words.accountCardDidNotChange);

      return;
    }

    setChanging(false);
    whenTheCardChanged();
  }, [
    asks,
    changing,
    confirms,
    idToken,
    isComplete,
    theElements,
    whenTheCardChanged,
    words.accountCardDidNotChange,
  ]);

  if (publishableKey.length === 0) {
    return (
      <div className="flex flex-col border-b-hairline border-siteTintLine px-margin py-spaceMd">
        <span className="text-body-sm text-siteQuietText">{words.checkoutNoPaymentFormYet}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-spaceMd border-b-hairline border-siteTintLine px-margin py-spaceMd">
      <div ref={drawsTheCardForm} />
      {whatWentWrong === null ? null : (
        <p className="text-body-sm text-siteAccent" role="alert">
          {whatWentWrong}
        </p>
      )}
      <button
        className="min-h-[52px] rounded-lg bg-siteAccent text-body-lg font-semibold text-siteCard"
        disabled={changing}
        onClick={() => void changesTheCard()}
        type="button"
      >
        {words.accountSaveNewCard}
      </button>
    </div>
  );
}
