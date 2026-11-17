import { THE_API_HOST } from './theTelegramSignIn';

/**
 * The one call the page makes to Emi: start a subscription, and read back the secret the form is
 * mounted on.
 *
 * It carries her identity token and nothing else. The route cuts the payer digest from a claim of
 * that token, so the page sends no account identifier, no address and no name, and it reads back
 * one value that opens nothing on its own.
 */

/** The route that makes the customer and the setup, behind the token authorizer of the pool. */
export const WHERE_A_SUBSCRIPTION_STARTS = `${THE_API_HOST}/v1/payments/subscription`;

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
