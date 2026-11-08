import { base64Of } from '@emi/crypto';

/**
 * The two calls the sign in makes to Telegram: it exchanges the code for an identity token, and it
 * reads the keys Telegram signs with.
 *
 * Both go through one port, so a test reads the address, the headers and the body the function
 * actually sent. That is what proves the redirect address is the one this module holds rather than
 * one a caller asked for.
 */

/** What a call carries. The body is absent on a read. */
export interface AskedOf {
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
}

/** What a call comes back with, as the status and the text. */
export interface AnsweredBy {
  readonly status: number;
  readonly body: string;
}

/** How this module reaches Telegram. A test hands it one that answers without a network. */
export type ReachesTelegram = (address: string, asked: AskedOf) => Promise<AnsweredBy>;

/** The issuer every identity token of this login names. */
export const telegramIssuer = 'https://oauth.telegram.org';

/** Where a code is exchanged for an identity token. */
export const tokenAddress = `${telegramIssuer}/token`;

/** Where the keys Telegram signs with are published. */
export const publishedKeysAddress = `${telegramIssuer}/.well-known/jwks.json`;

/**
 * The one address Telegram ever redirects to, held here and never taken from a request. It carries
 * a language because every route of the site sits under one, and Telegram matches the address and
 * not the page: the page it names reads the state value and sends her on in her own language.
 */
export const redirectAddress = 'https://myemi.app/en/sign-in/telegram/';

/** What a code is exchanged with: the two halves she brings, and the two the function holds. */
export interface AnExchange {
  readonly code: string;
  readonly codeVerifier: string;
  readonly botIdentifier: string;
  readonly clientSecret: string;
}

/** One key of the published set, as far as this service reads it. */
export interface PublishedKey {
  readonly kid?: string;
  readonly kty?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
}

interface WhatTelegramSaid {
  readonly id_token?: unknown;
}

interface WhatTheSetSaid {
  readonly keys?: unknown;
}

function readJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

/**
 * The identity token for a code, or nothing at all when Telegram does not answer with one.
 *
 * The client secret travels as basic authorization, which is where Telegram reads it, so it is in
 * no address and no query string. The redirect address is the constant above: a caller that sends
 * another one changes nothing, because nothing here reads it.
 */
export async function identityTokenFor(
  exchange: AnExchange,
  reaches: ReachesTelegram,
): Promise<string | null> {
  const asked = new URLSearchParams({
    grant_type: 'authorization_code',
    code: exchange.code,
    code_verifier: exchange.codeVerifier,
    redirect_uri: redirectAddress,
  });

  const credential = base64Of(
    new TextEncoder().encode(`${exchange.botIdentifier}:${exchange.clientSecret}`),
  );

  let answered: AnsweredBy;

  try {
    answered = await reaches(tokenAddress, {
      method: 'POST',
      headers: {
        authorization: `Basic ${credential}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: asked.toString(),
    });
  } catch {
    return null;
  }

  if (answered.status !== 200) {
    return null;
  }

  const said = readJson(answered.body) as WhatTelegramSaid | null;
  const token = said?.id_token;

  return typeof token === 'string' && token.length > 0 ? token : null;
}

/** The published set, or an empty list when Telegram does not answer with one. */
export async function publishedKeysFrom(
  reaches: ReachesTelegram,
): Promise<readonly PublishedKey[]> {
  let answered: AnsweredBy;

  try {
    answered = await reaches(publishedKeysAddress, { method: 'GET', headers: {} });
  } catch {
    return [];
  }

  if (answered.status !== 200) {
    return [];
  }

  const said = readJson(answered.body) as WhatTheSetSaid | null;
  const held = said?.keys;

  return Array.isArray(held) ? (held as readonly PublishedKey[]) : [];
}

/**
 * The set, read once and held for as long as the container lives, so a sign in pays one request
 * and not two. A read that answered with nothing is not held: a container that cached an empty set
 * would refuse every sign in for the rest of its life.
 */
export function publishedKeysOnce(
  reaches: ReachesTelegram,
): () => Promise<readonly PublishedKey[]> {
  let held: Promise<readonly PublishedKey[]> | null = null;

  return () => {
    const reading = held ?? publishedKeysFrom(reaches);

    held = reading;

    return reading.then((keys) => {
      if (keys.length === 0) {
        held = null;
      }

      return keys;
    });
  };
}
