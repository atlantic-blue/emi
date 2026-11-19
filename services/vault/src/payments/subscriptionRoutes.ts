import { type HttpRequestEvent, type HttpResponse, methodOf, refusal } from '../api';
import {
  finishCardChange,
  paymentMethodPath,
  startCardChange,
  type WhatACardChangeNeeds,
} from './changeCard';
import { readSubscription, type WhatTheReadNeeds } from './readSubscription';
import { startSubscription, subscriptionPath, type WhatTheStartNeeds } from './startSubscription';

/**
 * The four things the money answers for one woman: a press that starts a subscription, a read that
 * says whether one is running, a press that collects a new payment method, and the call that makes
 * what she collected the one every charge goes to.
 *
 * All four sit behind the token authorizer of the pool and all four are the same function, because
 * they read the same claim, reach the same partition and need the same two grants. A method one of
 * these paths does not answer is refused here rather than guessed at.
 */

/** What a caller is told for a method one of these paths does not answer. It names no method. */
export const nothingAnswersThatMethod = 'nothing answers that method';

/** What a caller is told for a path this function is wired to and does not answer. */
export const nothingOfTheMoneyAnswersThatPath = 'nothing answers that path';

/** The two paths this function answers. A request on any other one is refused by its path. */
export const pathsOfTheMoney: readonly string[] = [subscriptionPath, paymentMethodPath];

/** Everything the four routes need between them. */
export type WhatTheSubscriptionRoutesNeed = WhatTheStartNeeds & WhatACardChangeNeeds;

/** The function the api calls for all four, with everything they need bound to them. */
export function subscriptionRoutes(
  held: WhatTheSubscriptionRoutesNeed,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  const read: WhatTheReadNeeds = { entitlements: held.entitlements, poolId: held.poolId };
  const routes: Readonly<Record<string, (event: HttpRequestEvent) => Promise<HttpResponse>>> = {
    [`POST ${subscriptionPath}`]: startSubscription(held),
    [`GET ${subscriptionPath}`]: readSubscription(read),
    [`POST ${paymentMethodPath}`]: startCardChange(held),
    [`PUT ${paymentMethodPath}`]: finishCardChange(held),
  };

  return (event) => {
    const route = routes[`${methodOf(event)} ${event.rawPath}`];

    if (route !== undefined) {
      return route(event);
    }

    return Promise.resolve(
      pathsOfTheMoney.includes(event.rawPath)
        ? refusal(405, nothingAnswersThatMethod)
        : refusal(404, nothingOfTheMoneyAnswersThatPath),
    );
  };
}
