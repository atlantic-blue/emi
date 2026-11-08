import { createPublicKey, verify } from 'node:crypto';

import { bytesFromBase64, instantWindowSeconds } from '@emi/crypto';

import { type PublishedKey, telegramIssuer } from './exchange';

/**
 * Whether to believe an identity token, and the one value read out of it when the answer is yes.
 *
 * Nothing here reaches a network, a table or a clock of its own, so every rule is driven by a
 * token the test signed with a key pair it made, against the instant the test names.
 *
 * The subject is the whole of what comes out. It never reaches a caller, a log line or the table:
 * what is written down is a keyed hash of it under a salt no person sees.
 */

/**
 * The one algorithm this service verifies. The discovery document of the login names RS256 first,
 * and a token signed any other way is refused rather than carried, which also refuses `none`.
 */
export const signingAlgorithm = 'RS256';

/** Every way a token is refused, as a value, so a test matches the reason and not the words. */
export type TokenRefusal =
  | 'the-token-is-not-three-parts'
  | 'the-token-is-not-readable'
  | 'the-algorithm-is-not-the-one-telegram-signs-with'
  | 'no-published-key-has-that-identifier'
  | 'the-signature-does-not-verify'
  | 'the-issuer-is-not-telegram'
  | 'the-audience-is-not-this-bot'
  | 'the-token-has-expired'
  | 'the-token-was-not-made-just-now'
  | 'the-nonce-is-not-the-one-that-was-sent'
  | 'the-token-carries-no-subject';

/** What the token is read against: the set, the bot, the clock, and the nonce the surface sent. */
export interface WhatATokenIsReadAgainst {
  readonly publishedKeys: readonly PublishedKey[];
  readonly botIdentifier: string;
  readonly now: Date;
  /** The value the surface sent, where it sent one. */
  readonly nonce?: string;
}

/** A token that was believed, or the reason it was not. */
export type TokenRead = { readonly subject: string } | { readonly refusal: TokenRefusal };

interface TokenHeader {
  readonly alg?: unknown;
  readonly kid?: unknown;
}

interface TokenClaims {
  readonly iss?: unknown;
  readonly aud?: unknown;
  readonly sub?: unknown;
  readonly exp?: unknown;
  readonly iat?: unknown;
  readonly nonce?: unknown;
}

/**
 * A token writes its three parts in the address safe alphabet and drops the padding, so the
 * characters are translated and the length is made up before the ordinary reader sees them.
 */
export function bytesFromBase64Url(text: string): Uint8Array {
  const held = text.replace(/-/g, '+').replace(/_/g, '/');
  const padding = held.length % 4 === 0 ? '' : '='.repeat(4 - (held.length % 4));

  return bytesFromBase64(`${held}${padding}`);
}

function jsonIn(part: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytesFromBase64Url(part))) as unknown;
  } catch {
    return null;
  }
}

function secondsOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function signatureVerifiesAgainst(signed: string, signature: string, named: PublishedKey): boolean {
  try {
    return verify(
      'sha256',
      new TextEncoder().encode(signed),
      createPublicKey({ key: { kty: named.kty, n: named.n, e: named.e }, format: 'jwk' }),
      bytesFromBase64Url(signature),
    );
  } catch {
    // A member of the set that is not an RSA key at all, or a signature that is not base 64,
    // raises here rather than answering false, and both mean the same thing to a caller.
    return false;
  }
}

/** The subject the token names, once every rule above holds, or the first rule that does not. */
export function subjectIn(token: string, against: WhatATokenIsReadAgainst): TokenRead {
  const parts = token.split('.');
  const [header, payload, signature] = parts;

  if (parts.length !== 3 || header === undefined || payload === undefined) {
    return { refusal: 'the-token-is-not-three-parts' };
  }

  const read = jsonIn(header) as TokenHeader | null;
  const claims = jsonIn(payload) as TokenClaims | null;

  if (read === null || claims === null || signature === undefined) {
    return { refusal: 'the-token-is-not-readable' };
  }

  if (read.alg !== signingAlgorithm) {
    return { refusal: 'the-algorithm-is-not-the-one-telegram-signs-with' };
  }

  const named = against.publishedKeys.find(
    (held) => typeof read.kid === 'string' && held.kid === read.kid,
  );

  if (named === undefined) {
    return { refusal: 'no-published-key-has-that-identifier' };
  }

  if (!signatureVerifiesAgainst(`${header}.${payload}`, signature, named)) {
    return { refusal: 'the-signature-does-not-verify' };
  }

  if (claims.iss !== telegramIssuer) {
    return { refusal: 'the-issuer-is-not-telegram' };
  }

  // A token minted for another bot is a valid token, signed by the same set, so this is the one
  // check that tells the two apart. A list of audiences is refused as well: this login mints one.
  if (claims.aud !== against.botIdentifier) {
    return { refusal: 'the-audience-is-not-this-bot' };
  }

  const at = Math.floor(against.now.getTime() / 1000);
  const expires = secondsOf(claims.exp);
  const made = secondsOf(claims.iat);

  if (expires === null || expires <= at) {
    return { refusal: 'the-token-has-expired' };
  }

  if (made === null || Math.abs(at - made) > instantWindowSeconds) {
    return { refusal: 'the-token-was-not-made-just-now' };
  }

  if (
    against.nonce !== undefined &&
    typeof claims.nonce === 'string' &&
    claims.nonce !== against.nonce
  ) {
    return { refusal: 'the-nonce-is-not-the-one-that-was-sent' };
  }

  return typeof claims.sub === 'string' && claims.sub.length > 0
    ? { subject: claims.sub }
    : { refusal: 'the-token-carries-no-subject' };
}
