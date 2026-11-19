import type { EntitlementStore } from './entitlements';
import { type ReachesStripe, renewalOfSubscription } from './stripe';

/**
 * The renewals a delete stops, which is step 10 of the path in `docs/design/payments.md`.
 *
 * The payment itself is never touched. The year she paid for runs to its end, so `paidUntil` stays
 * exactly as the last event left it and the item stays where it is. What changes is the renewal:
 * Stripe is told to stop at the end of the period, and the item is written with where that leaves
 * her.
 *
 * It raises where Stripe did not answer, because the delete that calls it must then remove nothing.
 * A renewal left running behind an account that is gone charges a woman who cannot reach a page to
 * stop it.
 */

/** What stopping is bound to: the payment partition, Stripe, the key and the clock. */
export interface WhatStoppingNeeds {
  readonly entitlements: EntitlementStore;
  readonly reaches: ReachesStripe;
  /** The secret key, read from the parameter store rather than held as a value here. */
  readonly secretKey: () => Promise<string>;
  readonly clock: () => Date;
}

/** The one call the delete makes. It answers how many renewals it stopped. */
export type StopsEveryRenewal = (payerDigests: readonly string[]) => Promise<number>;

/**
 * Whether the payment under one digest still renews through Stripe.
 *
 * A woman who paid with Stars cancels in Telegram, and a payment already cancelling or lapsed has
 * nothing left to stop, so both read as nothing here rather than as a call Stripe would refuse.
 */
function theSubscriptionThatRenews(
  paying: Awaited<ReturnType<EntitlementStore['readEntitlement']>>,
): string | null {
  return paying?.route === 'card' &&
    paying.state === 'active' &&
    paying.subscriptionRef !== undefined
    ? paying.subscriptionRef
    : null;
}

/** Every renewal behind these digests, stopped at the end of the period each one paid for. */
export async function stopEveryRenewalOf(
  held: WhatStoppingNeeds,
  payerDigests: readonly string[],
): Promise<number> {
  let stopped = 0;

  for (const payerDigest of new Set(payerDigests)) {
    const paying = await held.entitlements.readEntitlement(payerDigest);
    const subscriptionRef = theSubscriptionThatRenews(paying);

    if (subscriptionRef === null) {
      continue;
    }

    const now = held.clock();

    await renewalOfSubscription(
      { reaches: held.reaches, secretKey: await held.secretKey() },
      subscriptionRef,
      false,
    );

    await held.entitlements.writeEntitlement({
      payerDigest,
      // Nothing from Stripe ordered this write, so it is ordered by the instant it ran at, the
      // same way the press on Cancel renewal is.
      eventAt: Math.floor(now.getTime() / 1000),
      writtenAt: now.toISOString(),
      state: 'cancelling',
    });

    stopped += 1;
  }

  return stopped;
}

/** The call the delete is given, with everything it needs bound to it. */
export function stopsEveryRenewal(held: WhatStoppingNeeds): StopsEveryRenewal {
  return (payerDigests) => stopEveryRenewalOf(held, payerDigests);
}
