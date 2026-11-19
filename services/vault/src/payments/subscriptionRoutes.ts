import { type HttpRequestEvent, type HttpResponse, methodOf, refusal } from '../api';
import { changeRenewal } from './changeRenewal';
import { readSubscription, type WhatTheReadNeeds } from './readSubscription';
import { startSubscription, type WhatTheStartNeeds } from './startSubscription';

/**
 * The three things one path answers: a press that starts a subscription, a read that says whether
 * one is running, and a change to the renewal of one.
 *
 * All three sit behind the token authorizer of the pool and all three are the same function,
 * because they read the same claim, write under the same digest and need the same two grants. A
 * method this path does not answer is refused here rather than guessed at.
 */

/** What a caller is told for a method this path does not answer. It names no method. */
export const nothingAnswersThatMethod = 'nothing answers that method';

/** Everything the three routes need between them. */
export type WhatTheSubscriptionRoutesNeed = WhatTheStartNeeds;

/** The function the api calls for each method, with everything the three need bound to it. */
export function subscriptionRoutes(
  held: WhatTheSubscriptionRoutesNeed,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  const read: WhatTheReadNeeds = { entitlements: held.entitlements, poolId: held.poolId };
  const routes: Readonly<Record<string, (event: HttpRequestEvent) => Promise<HttpResponse>>> = {
    POST: startSubscription(held),
    PATCH: changeRenewal(held),
    GET: readSubscription(read),
  };

  return (event) => {
    const route = routes[methodOf(event)];

    return route === undefined
      ? Promise.resolve(refusal(405, nothingAnswersThatMethod))
      : route(event);
  };
}
