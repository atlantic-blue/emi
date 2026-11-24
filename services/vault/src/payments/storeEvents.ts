import type { EntitlementState } from './entitlements';

/**
 * What one notification of the App Store says, and what each kind of it writes on her account.
 *
 * Eight kinds are read and every other one is taken and dropped. Apple sends every notification of
 * this application to one address, and an endpoint that failed on a kind it does not know would
 * turn each new notification Apple invents into five refusals over three days.
 *
 * Nothing here reads a signature or a table. It is handed a payload whose chain already verified,
 * and it answers what the write should be, so the rules of section 8 of the design sit in one file
 * a reader can check against that document line by line.
 */

/** Apple: the subscription renewed, and the money was taken. */
export const didRenew = 'DID_RENEW';

/** Apple: the App Store refunded the transaction, so she holds nothing from it any more. */
export const refunded = 'REFUND';

/** Apple: the refund was reversed, and what it took away is reinstated. */
export const refundReversed = 'REFUND_REVERSED';

/** Apple: the subscription ended. The subtype says whether she chose that or a bank did. */
export const expired = 'EXPIRED';

/** Apple: a renewal did not go through, and the App Store is still trying. */
export const failedToRenew = 'DID_FAIL_TO_RENEW';

/** Apple: the grace period that followed a failed renewal is over. */
export const gracePeriodExpired = 'GRACE_PERIOD_EXPIRED';

/** Apple: she turned the renewal off, or back on. The subtype says which. */
export const renewalStatusChanged = 'DID_CHANGE_RENEWAL_STATUS';

/** Apple: she chose a different plan for the next renewal, which is the crossgrade of section 2. */
export const renewalPlanChanged = 'DID_CHANGE_RENEWAL_PREF';

/** The eight kinds section 8 of the design names, and the whole of what this route acts on. */
export const notificationsTheRouteReads = [
  didRenew,
  refunded,
  refundReversed,
  expired,
  failedToRenew,
  gracePeriodExpired,
  renewalStatusChanged,
  renewalPlanChanged,
] as const;

/** One of those eight, as a type, so a reader of a notification is held to the list above. */
export type NotificationTheRouteReads = (typeof notificationsTheRouteReads)[number];

/** Apple's own word for a renewal she turned off, which is the state `cancelling`. */
export const autoRenewDisabled = 'AUTO_RENEW_DISABLED';

/** Apple's own word for a renewal she turned back on. */
export const autoRenewEnabled = 'AUTO_RENEW_ENABLED';

/** True where this service acts on a kind of notification at all. */
export function readsThisNotification(type: string): type is NotificationTheRouteReads {
  return (notificationsTheRouteReads as readonly string[]).includes(type);
}

/** What one notification writes: where it leaves her, and which of the two instants it takes. */
export interface WhatOneNotificationWrites {
  readonly state: EntitlementState;
  /**
   * True for the refund alone. Apple carries the instant it took the money back on the transaction
   * itself, and that instant is what the date becomes, so a refunded woman is not paid until the
   * expiry she no longer holds.
   */
  readonly takesTheRevocation: boolean;
}

/**
 * Where one notification leaves her, in the words of contract PAY-5, or nothing at all where it
 * moves neither the date nor the state.
 *
 * A failed renewal keeps her writing, and so does the billing retry behind it, because contract
 * PAY-4 keeps a lapse humane and she is still inside the period she paid for. The grace period
 * running out is what ends it, beside the expiry itself.
 *
 * A change of plan writes nothing. Two plans of one level and different durations make every move
 * a crossgrade, which Apple applies at the next renewal, so the plan she holds today is the plan
 * she holds until `DID_RENEW` arrives carrying the new one.
 */
export function whatTheNotificationWrites(
  type: NotificationTheRouteReads,
  subtype: string | null,
): WhatOneNotificationWrites | 'nothing' {
  if (type === refunded) {
    return { state: 'refunded', takesTheRevocation: true };
  }

  if (type === expired || type === gracePeriodExpired) {
    return { state: 'lapsed', takesTheRevocation: false };
  }

  if (type === didRenew || type === refundReversed || type === failedToRenew) {
    return { state: 'active', takesTheRevocation: false };
  }

  if (type === renewalStatusChanged) {
    if (subtype === autoRenewDisabled) {
      return { state: 'cancelling', takesTheRevocation: false };
    }

    // Apple names one of the two subtypes on every one of these, so anything else is a shape this
    // service has not read, and a state written from a guess is worse than no write at all.
    return subtype === autoRenewEnabled
      ? { state: 'active', takesTheRevocation: false }
      : 'nothing';
  }

  return 'nothing';
}
