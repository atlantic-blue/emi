'use client';

import { useState } from 'react';

import type { SiteWords } from '@/app/words';
import { type AnOffer, theOfferOnThePage } from '@/lib/theOfferSheArrivedWith';

/**
 * The plan half of the Buy Emi page, from
 * `docs/design/website/checkout/boards/Checkout.dc.html`: the heading, the one plan in its box,
 * and the sentence that says what she pays after the free month.
 *
 * It runs in her browser because the price depends on the address she arrived with, and a server
 * of this site answers one cached page for every reader of a language. The column it sits in is
 * drawn in her browser already, behind the sign in gate, so nothing moved from a server that was
 * being drawn there before.
 *
 * The offer is read once, when the page draws. The press that pays reads it the same way, so the
 * amount she agreed to and the amount the body asks for are decided by one address and one
 * instant, and the page cannot say one price and buy another.
 */
export function ThePlanSheIsBuying({
  words,
  now,
}: {
  readonly words: SiteWords;
  /** Taken as an argument so a case can draw the page on either side of the end of the offer. */
  readonly now?: Date;
}) {
  const [offer] = useState<AnOffer | null>(() => theOfferOnThePage(now));
  const onTheOffer = offer !== null;

  return (
    <section aria-labelledby="her-plan" className="flex flex-col gap-spaceMd">
      <h2 className="text-[19px] leading-[26px] font-semibold" id="her-plan">
        {words.checkoutPlanHeading}{' '}
        <span className="font-normal text-siteQuietText">
          {onTheOffer ? words.checkoutOfferEveryYear : words.checkoutPlanEveryYear}
        </span>
      </h2>
      <div className="flex items-center justify-between gap-spaceMd rounded-lg border-2 border-siteAccent px-margin py-margin">
        <span className="flex flex-col">
          <span className="text-body-lg font-semibold">{words.checkoutPlanYearly}</span>
          <span className="text-body-sm text-siteQuietText">
            {onTheOffer ? words.checkoutOfferRenews : words.checkoutPlanRenews}
          </span>
        </span>
        <span className="font-mono text-body-lg font-medium">
          {onTheOffer ? words.checkoutOfferAmount : words.checkoutPlanAmount}
        </span>
      </div>
      <p className="text-body-sm text-siteQuietText">
        {onTheOffer ? words.checkoutOfferPrice : words.checkoutPrice}
      </p>
    </section>
  );
}
