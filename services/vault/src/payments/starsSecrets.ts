import type { ParameterStore } from '../telegram/parameters';
import { secretHeldOnce } from './stripeSecrets';

/**
 * The two secret values the Stars route reads, and where each one is read from.
 *
 * Each is a secure string in the parameter store, read at run time. Neither is ever an environment
 * variable: a Lambda update prints the whole configuration of a function, and the pipeline log of
 * this repository is readable by anybody.
 *
 * The bot token is the one credential that can act as the Emi bot. The sign in does not read it,
 * and the role of these two functions is the only role that may.
 */

/** The token BotFather gave for the Emi bot. A person wrote it, and nothing here replaces it. */
export const botTokenParameter = '/emi/accounts/telegram/bot-token';

/**
 * The value an update of the bot must present. Terraform makes it, because nothing of her is in it
 * and a value a person never sees is one a person never pastes anywhere.
 */
export const telegramWebhookSecretParameter = '/emi/payments/telegram/webhook-secret';

/** The bot token, for the two calls that sell a year and answer a pre checkout. */
export function botTokenOnce(parameters: ParameterStore): () => Promise<string> {
  return secretHeldOnce(parameters, botTokenParameter);
}

/** The secret an update carries, which the webhook checks before it reads one field of a body. */
export function telegramWebhookSecretOnce(parameters: ParameterStore): () => Promise<string> {
  return secretHeldOnce(parameters, telegramWebhookSecretParameter);
}
