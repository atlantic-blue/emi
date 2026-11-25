import type { AccountDeleteStore, AccountStore } from '../store/accounts';
import type { EntitlementStore } from './entitlements';

/**
 * The gate a write passes, which is the second half of contract WIRE-2 and the floor under
 * contracts PAY-4 and WIRE-5.
 *
 * The gate asks one question: is this account paid at this instant. It answers yes or no. So no
 * caller learns which route paid, which plan she holds, or what she was charged.
 *
 * Both routes answer through here. The account item carries the instant a store purchase paid
 * until, and the payment item under each way in carries the instant a card paid until, so a woman
 * who paid on myemi.app and a woman who paid in the App Store both write.
 *
 * The store half reads the state beside the instant, because the App Store counts a woman as
 * covered while it retries her card and the expiry instant has already passed. The phone gate
 * reads those two statuses as paid, so a date alone here would refuse a write the phone allowed,
 * and her day would sit on the phone and never reach the vault.
 *
 * A pull, an export and a delete never reach this gate. Her own history stays readable, exportable
 * and deletable for ever, and only a new entry stops.
 */

/**
 * The status a write is refused with. The application reads it as the moment to offer the plans,
 * so it is the one status of this service that is an invitation rather than a fault.
 */
export const paymentIsRequired = 402;

/** What a caller is told when nobody paid. It names no date, no route and no plan. */
export const aSubscriptionIsNeeded = 'a new entry needs a subscription';

/**
 * What the gate asks of storage. Two reads of the account partition and one read of each payment
 * partition it names, and never a write of anything.
 */
export interface WhatTheWriteGateReads {
  readonly accounts: Pick<AccountStore, 'readAccount'> & Pick<AccountDeleteStore, 'payerDigestsOf'>;
  readonly entitlements: Pick<EntitlementStore, 'readEntitlement'>;
}

/** The one call the write makes. It answers whether a new entry is hers to write now. */
export type SaysWhetherSheMayWrite = (accountId: string, now: Date) => Promise<boolean>;

/**
 * The one state of contract PAY-5 that covers her whatever the instant says. The server writes it
 * for Apple status 1, 3 and 4, so a billing retry and a billing grace period both land here, and a
 * failed renewal keeps her writing until the grace period ends or the subscription expires.
 */
export const theStoreStateThatCovers = 'active';

/**
 * Whether an instant this service wrote has not passed yet. A date it cannot read at all counts as
 * passed. A date it can read is read as far as it goes, so the date her payment ran to refuses her
 * and the shape it was written in never does.
 */
function stillRuns(paidUntil: string | undefined, now: Date): boolean {
  const at = paidUntil === undefined ? Number.NaN : Date.parse(paidUntil);

  return !Number.isNaN(at) && at > now.getTime();
}

/**
 * Whether she is paid at one instant. The store half is read first and the site half after it. The
 * first way in that covers her answers, so a purchase in the App Store costs one read, and the
 * payment partitions are reached only when that read says nothing.
 */
export async function sheIsPaidAt(
  held: WhatTheWriteGateReads,
  accountId: string,
  now: Date,
): Promise<boolean> {
  const account = await held.accounts.readAccount(accountId);

  if (
    account?.subscriptionState === theStoreStateThatCovers ||
    stillRuns(account?.subscribedUntil, now)
  ) {
    return true;
  }

  for (const payerDigest of new Set(await held.accounts.payerDigestsOf(accountId))) {
    const paying = await held.entitlements.readEntitlement(payerDigest);

    if (stillRuns(paying?.paidUntil, now)) {
      return true;
    }
  }

  return false;
}

/** The call the write is given, with the two partitions it reads bound to it. */
export function saysWhetherSheMayWrite(held: WhatTheWriteGateReads): SaysWhetherSheMayWrite {
  return (accountId, now) => sheIsPaidAt(held, accountId, now);
}
