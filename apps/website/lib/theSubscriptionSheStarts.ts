import { THE_API_HOST } from './theTelegramSignIn';

/**
 * The two calls the page makes to Emi: start a subscription, and say which setup her browser
 * finished so the subscription is created.
 *
 * Each one carries her identity token and nothing else. The route cuts the payer digest from a
 * claim of that token, so the page sends no account identifier, no address and no name, and the
 * values it reads back open nothing on their own.
 */

/** The route that makes the customer and the setup, behind the token authorizer of the pool. */
export const WHERE_A_SUBSCRIPTION_STARTS = `${THE_API_HOST}/v1/payments/subscription`;

/** The one field the second call carries, as the route names it. */
export const THE_FIELD_A_SETUP_TRAVELS_IN = 'setupRef';

/** What the route answers with when it has started one. */
export interface TheSetupSheConfirms {
  readonly clientSecret: string;
}

/** How this module reaches the api. A test hands it one that answers without a network. */
export type HowItAsks = typeof fetch;

interface WhatTheRouteSaid {
  readonly clientSecret?: unknown;
}

/**
 * The secret of the setup, or nothing at all where the route would not start one. Every refusal
 * reads the same to the page: she is shown one line and the form stays where it is.
 */
export async function startASubscription(
  idToken: string,
  asks: HowItAsks = fetch,
): Promise<TheSetupSheConfirms | null> {
  let answered: Response;

  try {
    answered = await asks(WHERE_A_SUBSCRIPTION_STARTS, {
      method: 'POST',
      headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
      body: '{}',
    });
  } catch {
    return null;
  }

  if (!answered.ok) {
    return null;
  }

  let said: WhatTheRouteSaid;

  try {
    said = (await answered.json()) as WhatTheRouteSaid;
  } catch {
    return null;
  }

  return typeof said.clientSecret === 'string' && said.clientSecret.length > 0
    ? { clientSecret: said.clientSecret }
    : null;
}

interface WhatTheCreationSaid {
  readonly started?: unknown;
}

/**
 * The setup she finished, named to the service, which creates the yearly subscription on the free
 * month.
 *
 * It answers whether she is on one. A route that answered anything other than a subscription reads
 * as no subscription, because a page that says she is paying when she is not leaves her reading a
 * date nothing charges.
 */
export async function finishASubscription(
  idToken: string,
  setupRef: string,
  asks: HowItAsks = fetch,
): Promise<boolean> {
  let answered: Response;

  try {
    answered = await asks(WHERE_A_SUBSCRIPTION_STARTS, {
      method: 'PUT',
      headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ [THE_FIELD_A_SETUP_TRAVELS_IN]: setupRef }),
    });
  } catch {
    return false;
  }

  if (!answered.ok) {
    return false;
  }

  let said: WhatTheCreationSaid;

  try {
    said = (await answered.json()) as WhatTheCreationSaid;
  } catch {
    return false;
  }

  return said.started === true;
}
