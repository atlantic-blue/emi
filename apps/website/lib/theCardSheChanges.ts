import { THE_API_HOST } from './theTelegramSignIn';

/**
 * The two calls the Change card row makes: one that opens a setup for the customer she already
 * pays under, and one that tells the service which setup her browser finished.
 *
 * Her card never reaches Emi. Stripe takes it in its own element and answers an identifier of the
 * setup, and that identifier is the whole of what travels back here.
 */

/** The route both calls of a card change answer on, behind the token authorizer of the pool. */
export const WHERE_A_CARD_IS_CHANGED = `${THE_API_HOST}/v1/payments/payment-method`;

/** The one field the confirmation carries, as the route names it. */
export const THE_FIELD_A_SETUP_TRAVELS_IN = 'setupRef';

/** What the page mounts the card form on, which is the whole of what the press answers. */
export interface TheSetupSheFillsIn {
  readonly clientSecret: string;
}

/** How this module reaches the api. A test hands it one that answers without a network. */
export type HowItAsks = typeof fetch;

interface WhatThePressSaid {
  readonly clientSecret?: unknown;
}

interface WhatTheConfirmationSaid {
  readonly changed?: unknown;
}

/**
 * The setup she fills the new card in on, or nothing at all where the route would not open one.
 * Every refusal reads the same to the page: one line, and the form where it was.
 */
export async function startsACardChange(
  idToken: string,
  asks: HowItAsks = fetch,
): Promise<TheSetupSheFillsIn | null> {
  let answered: Response;

  try {
    answered = await asks(WHERE_A_CARD_IS_CHANGED, {
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

  let said: WhatThePressSaid;

  try {
    said = (await answered.json()) as WhatThePressSaid;
  } catch {
    return null;
  }

  return typeof said.clientSecret === 'string' && said.clientSecret.length > 0
    ? { clientSecret: said.clientSecret }
    : null;
}

/**
 * The setup she finished, named to the service, which makes what she gave Stripe the card every
 * charge goes to.
 *
 * It answers whether the card moved. A route that answered anything other than a change reads as
 * no change, because a page that says her card moved when it did not is worse than one that asks
 * her to press again.
 */
export async function finishesACardChange(
  idToken: string,
  setupRef: string,
  asks: HowItAsks = fetch,
): Promise<boolean> {
  let answered: Response;

  try {
    answered = await asks(WHERE_A_CARD_IS_CHANGED, {
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

  let said: WhatTheConfirmationSaid;

  try {
    said = (await answered.json()) as WhatTheConfirmationSaid;
  } catch {
    return false;
  }

  return said.changed === true;
}
