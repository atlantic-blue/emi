import { type ParameterStore, parameterHeld } from '../telegram/parameters';

/**
 * Where the Stripe secret key is read from, and how often.
 *
 * It is a secure string in the parameter store, written by hand, and it is read at run time. It is
 * never an environment variable: a Lambda update prints the whole configuration of a function, and
 * the pipeline log of this repository is readable by anybody. What the environment holds is the
 * name of a parameter, which is public by design.
 */

/** The parameter the key is written in. Nothing in this repository creates it or gives it a value. */
export const stripeSecretKeyParameter = '/emi/payments/stripe/secret-key';

/**
 * The key, read once for the life of a container. A read that failed is not kept, so a parameter
 * written a moment after a cold start is picked up by the next request rather than on the next
 * deploy.
 */
export function stripeSecretKeyOnce(parameters: ParameterStore): () => Promise<string> {
  let held: Promise<string> | null = null;

  return () => {
    const reading = held ?? parameterHeld(parameters, stripeSecretKeyParameter);

    held = reading;

    return reading.catch((thrown: unknown) => {
      held = null;

      throw thrown;
    });
  };
}
