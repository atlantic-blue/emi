import type { ParameterStore } from '../telegram/parameters';
import { secretHeldOnce } from './stripeSecrets';

/**
 * The one secret value of the App Store route, and where it is read from.
 *
 * It is a secure string in the parameter store, written by hand, and read at run time. It is never
 * an environment variable: a Lambda update prints the whole configuration of a function, and the
 * pipeline log of this repository is readable by anybody. What the environment holds is the name of
 * a parameter, which is public by design.
 *
 * Nothing in this repository creates the parameter or gives it a value.
 */

/**
 * The parameter the App Store Server api credential is written in, beside the two Stripe names. It
 * holds one json object with the key identifier, the issuer identifier and the private key, because
 * App Store Connect issues the three together.
 */
export const appStoreApiKeyParameter = '/emi/payments/apple/api-key';

/** The credential, read once for the life of a container, for the route that asks Apple. */
export function appStoreApiKeyOnce(parameters: ParameterStore): () => Promise<string> {
  return secretHeldOnce(parameters, appStoreApiKeyParameter);
}
