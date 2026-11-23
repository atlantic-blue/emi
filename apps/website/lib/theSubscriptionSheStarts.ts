import { THE_API_HOST } from './theTelegramSignIn';

/**
 * The two calls the page makes to Emi: start a subscription, and say which setup her browser
 * finished so the subscription is created.
 *
 * Each one carries her identity token. The second also names the setup her browser finished and
 * the offer the page was showing, and nothing else. The route cuts the payer digest from a claim
 * of that token, so the page sends no account identifier, no address and no name, and the values
 * it reads back open nothing on their own.
 */

/** The route that makes the customer and the setup, behind the token authorizer of the pool. */
export const WHERE_A_SUBSCRIPTION_STARTS = `${THE_API_HOST}/v1/payments/subscription`;

/** The one field the second call carries, as the route names it. */
export const THE_FIELD_A_SETUP_TRAVELS_IN = 'setupRef';

/**
 * The field the offer travels in, as the route names it. It is sent only when the page drew the
 * offer to her, because the route refuses any value but the one offer it sells.
 */
export const THE_FIELD_AN_OFFER_TRAVELS_IN = 'offer';

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
  readonly paymentSecret?: unknown;
}

/**
 * What the route answers once the subscription exists: nothing to pay, or the secret of the one
 * charge her browser has to confirm.
 *
 * The free month belongs to the one price, so a press at that price leaves nothing to confirm. A
 * press on an offer is charged at once, and the charge is confirmed in her browser so her bank can
 * ask her its question there.
 */
export interface TheSubscriptionSheIsOn {
  readonly paymentSecret: string | null;
}

/**
 * The setup she finished, named to the service, which creates the yearly subscription.
 *
 * It answers what she is on, or nothing at all. A route that answered anything other than a
 * subscription reads as no subscription, because a page that says she is paying when she is not
 * leaves her reading a date nothing charges.
 *
 * The offer is carried only by a page that drew the offer to her. The route decides the discount
 * from the offer and its own clock, so this call asks for an offer and never for an amount.
 */
export async function finishASubscription(
  idToken: string,
  setupRef: string,
  asks: HowItAsks = fetch,
  offer?: string | null,
): Promise<TheSubscriptionSheIsOn | null> {
  let answered: Response;

  try {
    answered = await asks(WHERE_A_SUBSCRIPTION_STARTS, {
      method: 'PUT',
      headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        [THE_FIELD_A_SETUP_TRAVELS_IN]: setupRef,
        ...(offer === undefined || offer === null
          ? {}
          : { [THE_FIELD_AN_OFFER_TRAVELS_IN]: offer }),
      }),
    });
  } catch {
    return null;
  }

  if (!answered.ok) {
    return null;
  }

  let said: WhatTheCreationSaid;

  try {
    said = (await answered.json()) as WhatTheCreationSaid;
  } catch {
    return null;
  }

  if (said.started !== true) {
    return null;
  }

  const paymentSecret = said.paymentSecret;

  return {
    paymentSecret:
      typeof paymentSecret === 'string' && paymentSecret.length > 0 ? paymentSecret : null,
  };
}
