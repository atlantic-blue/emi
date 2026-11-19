import { type HttpRequestEvent, type HttpResponse, methodOf, refusal } from '../api';
import { readReceipts, receiptsPath, type WhatTheReceiptsNeed } from './readReceipts';
import { readSubscription, type WhatTheReadNeeds } from './readSubscription';
import { startSubscription, subscriptionPath, type WhatTheStartNeeds } from './startSubscription';

/**
 * The three things the money answers for one sign in: a press that starts a subscription, a read
 * that says whether one is running, and a list of the receipts it has left behind.
 *
 * All three sit behind the token authorizer of the pool and all three are the same function,
 * because they read the same claim, work under the same digest and need the same grants. Three
 * routes of the api reach this function and no other, so a path or a method that is not one of
 * them is refused here rather than guessed at.
 */

/** What a caller is told for a method this path does not answer. It names no method. */
export const nothingAnswersThatMethod = 'nothing answers that method';

/** Everything the three routes need between them. */
export type WhatTheSubscriptionRoutesNeed = WhatTheStartNeeds;

/** The function the api calls for all three, with everything they need bound to it. */
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
    [subscriptionPath]: { POST: startSubscription(held), GET: readSubscription(read) },
    [receiptsPath]: { GET: readReceipts(receipts) },
  };

  return (event) => {
    const route = routes[event.rawPath]?.[methodOf(event)];

    return route === undefined
      ? Promise.resolve(refusal(405, nothingAnswersThatMethod))
      : route(event);
  };
}
