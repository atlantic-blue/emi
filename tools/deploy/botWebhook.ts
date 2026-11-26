/**
 * Registers the address the Emi bot sends its updates to.
 *
 * Telegram keeps one webhook address for each bot, so this is told rather than asked: the deploy
 * says where the api is now, which secret every update must carry, and which two updates the bot
 * is allowed to send. A bot registered against an older address goes on sending updates there, and
 * a payment then reaches nothing.
 *
 * Nothing of the answer is printed but the one field that says it worked. The token of the bot is
 * part of the address of every call of this api, and the log of this repository is readable by
 * anybody, so no address and no part of a body ever reaches the report.
 */

/** The two updates the bot may send. Anything else is refused by Telegram before it leaves. */
export const theUpdatesTheBotMaySend: readonly string[] = ['message', 'pre_checkout_query'];

/** The path the api answers an update on, which is the path of the route in `infra/api.tf`. */
export const theUpdatesPath = '/v1/telegram/updates';

/** What one call answered, read as the two fields this tool keeps. */
export interface AnsweredByTheBotApi {
  readonly ok: boolean;
  /** What Telegram called the refusal, where it named one. It carries no value of ours. */
  readonly because?: string;
}

/** How the call is made, so a test drives this with no network and no token. */
export type TellsTelegram = (which: {
  readonly address: string;
  readonly body: string;
}) => Promise<AnsweredByTheBotApi>;

/** What one registration needs. The token and the secret are read from the parameter store. */
export interface WhatARegistrationNeeds {
  readonly apiEndpoint: string;
  readonly botToken: string;
  readonly secretToken: string;
  readonly tells: TellsTelegram;
  readonly report: (line: string) => void;
}

/** The address of one method of the bot api. The token is in it because this api reads it nowhere else. */
export function botMethodAddress(botToken: string, method: string): string {
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

/** Where the updates are sent, which is the api address and the path of the route. */
export function theWebhookAddress(apiEndpoint: string): string {
  return `${apiEndpoint.replace(/\/+$/, '')}${theUpdatesPath}`;
}

/**
 * One registration. It raises on a refusal, so a deploy that could not register the bot fails
 * rather than reporting a success nobody checked.
 */
export async function registerTheWebhook(held: WhatARegistrationNeeds): Promise<void> {
  if (held.apiEndpoint.length === 0) {
    throw new Error('the registration was given no api address');
  }

  if (held.botToken.length === 0 || held.secretToken.length === 0) {
    throw new Error('the registration was given no token or no secret');
  }

  const answered = await held.tells({
    address: botMethodAddress(held.botToken, 'setWebhook'),
    body: JSON.stringify({
      url: theWebhookAddress(held.apiEndpoint),
      secret_token: held.secretToken,
      allowed_updates: theUpdatesTheBotMaySend,
    }),
  });

  if (!answered.ok) {
    // The reason Telegram named, and nothing else of the answer. A body of this api echoes what it
    // was sent, which on this call is the secret.
    throw new Error(
      `the bot api did not register the webhook, and named ${answered.because ?? 'nothing'}`,
    );
  }

  held.report('The Emi bot now sends its updates to this api. The answer said ok.');
}
