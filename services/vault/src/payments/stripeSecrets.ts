import { type ParameterStore, parameterHeld } from '../telegram/parameters';

/**
 * The two secret values of the Stripe route, and where each one is read from.
 *
 * Each is a secure string in the parameter store, written by hand, and read at run time. Neither
 * is ever an environment variable: a Lambda update prints the whole configuration of a function,
 * and the pipeline log of this repository is readable by anybody. What the environment holds is the
 * name of a parameter, which is public by design.
 *
 * Nothing in this repository creates either parameter or gives either one a value.
 */

/** The parameter the secret key is written in. It charges a card and reads nothing of hers. */
export const stripeSecretKeyParameter = '/emi/payments/stripe/secret-key';

/** The parameter the signing secret of the webhook endpoint is written in. */
export const stripeWebhookSecretParameter = '/emi/payments/stripe/webhook-secret';

/**
 * One value, read once for the life of a container. A read that failed is not kept, so a parameter
 * written a moment after a cold start is picked up by the next request rather than on the next
 * deploy.
 */
export function secretHeldOnce(
  parameters: ParameterStore,
  parameter: string,
): () => Promise<string> {
  let held: Promise<string> | null = null;

  return () => {
    const reading = held ?? parameterHeld(parameters, parameter);

    held = reading;

    return reading.catch((thrown: unknown) => {
      held = null;

      throw thrown;
    });
  };
}

/** The secret key, for the route that makes the customer and the setup. */
export function stripeSecretKeyOnce(parameters: ParameterStore): () => Promise<string> {
  return secretHeldOnce(parameters, stripeSecretKeyParameter);
}

/** The signing secret, for the webhook, which verifies it before it reads one field of a body. */
export function stripeWebhookSecretOnce(parameters: ParameterStore): () => Promise<string> {
  return secretHeldOnce(parameters, stripeWebhookSecretParameter);
}
