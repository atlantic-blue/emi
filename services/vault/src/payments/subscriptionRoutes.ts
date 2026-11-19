import { type HttpRequestEvent, type HttpResponse, methodOf, refusal } from '../api';
import {
  finishCardChange,
  paymentMethodPath,
  startCardChange,
  type WhatACardChangeNeeds,
} from './changeCard';
import { changeRenewal } from './changeRenewal';
import { readReceipts, receiptsPath, type WhatTheReceiptsNeed } from './readReceipts';
import { readSubscription, type WhatTheReadNeeds } from './readSubscription';
import { startSubscription, subscriptionPath, type WhatTheStartNeeds } from './startSubscription';

/**
 * The six things the money answers for one sign in: a press that starts a subscription, a read
 * that says whether one is running, a change to the renewal of one, a list of the receipts it has
 * left behind, and the two calls that change the card it is charged to.
 *
 * All six sit behind the token authorizer of the pool and all six are the same function, because
 * they read the same claim, work under the same digest and need the same grants. Six routes of
 * the api reach this function and no other, so a path or a method that is not one of them is
 * refused here rather than guessed at.
 */

/** What a caller is told for a method this path does not answer. It names no method. */
export const nothingAnswersThatMethod = 'nothing answers that method';

/** Everything the six routes need between them. */
export type WhatTheSubscriptionRoutesNeed = WhatTheStartNeeds & WhatACardChangeNeeds;

/** The function the api calls for all six, with everything they need bound to it. */
export function subscriptionRoutes(
  held: WhatTheSubscriptionRoutesNeed,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  const read: WhatTheReadNeeds = { entitlements: held.entitlements, poolId: held.poolId };
  const receipts: WhatTheReceiptsNeed = {
    entitlements: held.entitlements,
    reaches: held.reaches,
    secretKey: held.secretKey,
    poolId: held.poolId,
  };
  const routes: Readonly<
    Record<string, Readonly<Record<string, (event: HttpRequestEvent) => Promise<HttpResponse>>>>
  > = {
    [subscriptionPath]: {
      POST: startSubscription(held),
      PATCH: changeRenewal(held),
      GET: readSubscription(read),
    },
    [receiptsPath]: { GET: readReceipts(receipts) },
    [paymentMethodPath]: { POST: startCardChange(held), PUT: finishCardChange(held) },
  };

  return (event) => {
    const route = routes[event.rawPath]?.[methodOf(event)];

    return route === undefined
      ? Promise.resolve(refusal(405, nothingAnswersThatMethod))
      : route(event);
  };
}
