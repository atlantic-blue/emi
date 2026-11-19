/**
 * What the website and the application both need to start a sign in with Telegram, and what the
 * relay page needs to tell a sign in the application started from one the website started.
 *
 * Telegram redirects to one registered address, which is a page of the website. The application
 * opens the same authorization address in the authentication session of the phone, so its press
 * and the website press carry the same parameters, and the relay sends a return the application
 * started on to the private scheme the session ends on.
 */

/** The host Telegram answers its own sign in on. */
export const THE_TELEGRAM_HOST = 'https://oauth.telegram.org';

/** Where a press sends her, which is the authorization endpoint the discovery document names. */
export const WHERE_TELEGRAM_ASKS_HER = `${THE_TELEGRAM_HOST}/auth`;

/** The api the sign in function answers on. The route it calls takes no authorizer. */
export const THE_API_HOST = 'https://2pumohtm7l.execute-api.eu-central-1.amazonaws.com';

/** The route the sign in function answers, which takes a code and a verifier and no signature. */
export const WHERE_THE_SIGN_IN_FUNCTION_ANSWERS = `${THE_API_HOST}/v1/sign-in/telegram`;

/** The bot of Emi, as the client identifier of this sign in and as the audience its token carries. */
export const THE_EMI_BOT_ID = '9068004348';

/** The one scope Emi asks for, which returns a subject and three instants and nothing of her. */
export const THE_TELEGRAM_SCOPE = 'openid';

/** How many bytes the verifier is made of. 32 bytes is 256 bits. */
export const VERIFIER_BYTES = 32;

/** How many bytes the state value and the nonce are each made of. 16 bytes is 128 bits. */
export const STATE_BYTES = 16;

/** The one address Telegram registers, which every language and every surface comes back to. */
export const THE_REGISTERED_RETURN_ADDRESS = 'https://myemi.app/en/sign-in/telegram/';

/** Where the relay sends a return the application started, which ends its browser session. */
export const WHERE_THE_APPLICATION_COMES_BACK = 'emi://sign-in/telegram';

/**
 * The first part of a state the application writes. A state the website writes starts with a
 * language, and this is not one, so the website can never write it.
 */
export const THE_APPLICATION_MARK = 'app';

/** What a state value joins its parts with, which base 64 of an address never writes. */
export const BESIDE_THE_LANGUAGE = '.';

/** A state the application writes: the mark, the language she reads in, and a random value. */
export function anApplicationStateFor(language: string, random: string): string {
  return [THE_APPLICATION_MARK, language, random].join(BESIDE_THE_LANGUAGE);
}

/** Whether the application started the sign in a state belongs to. */
export function isAnApplicationState(state: string | null): boolean {
  return (state ?? '').startsWith(`${THE_APPLICATION_MARK}${BESIDE_THE_LANGUAGE}`);
}

/** The values a press puts in the address it opens. */
export interface WhatAPressAsksFor {
  readonly redirectUri: string;
  readonly state: string;
  readonly codeChallenge: string;
}

/** The authorization address a press opens, with the parameters the design names and no others. */
export function whereTelegramAsksHerFor(asked: WhatAPressAsksFor): string {
  return `${WHERE_TELEGRAM_ASKS_HER}?${theQueryOf([
    ['client_id', THE_EMI_BOT_ID],
    ['redirect_uri', asked.redirectUri],
    ['response_type', 'code'],
    ['scope', THE_TELEGRAM_SCOPE],
    ['state', asked.state],
    ['code_challenge', asked.codeChallenge],
    ['code_challenge_method', 'S256'],
  ])}`;
}

/** What Telegram sent the relay back with, as far as the application reads it. */
export interface WhatTelegramSentBack {
  readonly code: string | null;
  readonly state: string | null;
  readonly error: string | null;
}

/**
 * The address the relay sends a return the application started to. A refusal from Telegram goes
 * back too, so the session closes and the application says it did not finish.
 */
export function theAddressBackToTheApplication(came: WhatTelegramSentBack): string {
  const carried: [string, string][] = [];

  for (const [name, value] of [
    ['code', came.code],
    ['error', came.error],
    ['state', came.state],
  ] as const) {
    if (value !== null) {
      carried.push([name, value]);
    }
  }

  return `${WHERE_THE_APPLICATION_COMES_BACK}?${theQueryOf(carried)}`;
}

/**
 * What an address carries after its question mark. Read by hand, because the address parser of a
 * phone does not read every part of an address on a private scheme.
 */
export function whatAnAddressCarries(address: string): WhatTelegramSentBack {
  const query = address.split('#')[0]?.split('?')[1] ?? '';
  const carried = new Map<string, string>();

  for (const pair of query.split('&')) {
    const [name = '', value = ''] = pair.split('=');
    const named = theWordIn(name);

    if (named !== '' && !carried.has(named)) {
      carried.set(named, theWordIn(value));
    }
  }

  return {
    code: carried.get('code') ?? null,
    state: carried.get('state') ?? null,
    error: carried.get('error') ?? null,
  };
}

function theWordIn(encoded: string): string {
  try {
    return decodeURIComponent(encoded.replace(/\+/g, ' '));
  } catch {
    return '';
  }
}

function theQueryOf(parameters: readonly (readonly [string, string])[]): string {
  return parameters
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&');
}
