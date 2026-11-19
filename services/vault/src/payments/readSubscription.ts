import { payerDigestFor } from '@emi/crypto';

import { answer, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { EntitlementRoute, EntitlementState, EntitlementStore } from './entitlements';
import { payerNameIn } from './poolToken';

/**
 * What her account page reads: is this sign in paid until a date, and what does the card say.
 *
 * Three fields leave this route and nothing else. No customer, no subscription, no event instant
 * and no digest, because the page draws a date, a state and a word for the way she paid, and a
 * field a page does not draw is a field somebody else can read.
 */

/** What a caller is told when no payer is read. It names neither the pool nor the claim. */
export const thatTokenReadsNothing = 'that token reads no subscription';

/** What the page reads back. A woman who has never paid reads an answer with nothing in it. */
export interface WhatTheAccountPageReads {
  readonly paidUntil?: string;
  readonly state?: EntitlementState;
  readonly route?: EntitlementRoute;
}

/** What the read is bound to: the payment partition and the pool her token is minted by. */
export interface WhatTheReadNeeds {
  readonly entitlements: Pick<EntitlementStore, 'readEntitlement'>;
  readonly poolId: string;
}

/** The three fields, read out of the item under her digest. */
export async function subscriptionFor(
  event: HttpRequestEvent,
  held: WhatTheReadNeeds,
): Promise<HttpResponse> {
  const read = payerNameIn(event, held.poolId);

  if ('refusal' in read) {
    return refusal(401, thatTokenReadsNothing);
  }

  const paying = await held.entitlements.readEntitlement(
    payerDigestFor(held.poolId, read.userName),
  );

  if (paying === undefined) {
    return answer(200, {} satisfies WhatTheAccountPageReads);
  }

  return answer(200, {
    ...(paying.paidUntil === undefined ? {} : { paidUntil: paying.paidUntil }),
    ...(paying.state === undefined ? {} : { state: paying.state }),
    ...(paying.route === undefined ? {} : { route: paying.route }),
  } satisfies WhatTheAccountPageReads);
}

/** The route the api calls, with the payment partition bound to it. */
export function readSubscription(
  held: WhatTheReadNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => subscriptionFor(event, held);
}
