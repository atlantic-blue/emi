import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Whether a delivery came from Stripe, read from the `Stripe-Signature` header and the body as it
 * arrived.
 *
 * Stripe signs the timestamp and the body together, so the body is hashed exactly as it was sent.
 * A reader that parsed the body and wrote it out again would hash different bytes for the same
 * event, and every delivery would then be refused.
 */

/** The header every delivery carries. The api gateway lowercases every header name it hands on. */
export const signatureHeader = 'stripe-signature';

/** The scheme of the signature this service checks. Stripe names the current one `v1`. */
export const signatureScheme = 'v1';

/**
 * How far the timestamp of a delivery may sit from now, in seconds. Stripe's own libraries default
 * to five minutes, and the window is what stops a delivery somebody captured being replayed later.
 */
export const signatureWindowSeconds = 300;

/** Every way a delivery is refused, as a value, so a test matches the reason and not the words. */
export type SignatureRefusal =
  | 'no-signature-header'
  | 'the-header-carries-no-timestamp'
  | 'the-header-carries-no-signature-of-this-scheme'
  | 'the-signature-does-not-verify'
  | 'the-delivery-is-not-from-now';

/** What the header names: the instant it was signed at, and every signature under it. */
export interface SignedAt {
  readonly timestamp: string;
  readonly signatures: readonly string[];
}

/**
 * The parts of the header, which is a list of pairs. More than one `v1` may be there while a
 * signing secret is being rolled, so every one is kept and any of them may be the one that holds.
 */
export function signedPartsIn(header: string): SignedAt {
  const pairs = header
    .split(',')
    .map((pair) => pair.split('='))
    .flatMap(([name, value]) =>
      name === undefined || value === undefined ? [] : [[name.trim(), value.trim()] as const],
    );

  return {
    timestamp: pairs.find(([name]) => name === 't')?.[1] ?? '',
    signatures: pairs.filter(([name]) => name === signatureScheme).map(([, value]) => value),
  };
}

function matches(expected: string, presented: string): boolean {
  const owed = Buffer.from(expected, 'hex');
  const given = Buffer.from(presented, 'hex');

  // Compared in constant time, and only once the lengths agree: the comparison raises on two
  // buffers of different lengths, and a length is not a secret.
  return owed.length === given.length && timingSafeEqual(owed, given);
}

/**
 * The reason the header alone is not a signature of Stripe, or nothing at all where it could be
 * one. It reads no secret, so a delivery refused here is refused before anything is read from the
 * parameter store and before one field of the body is parsed.
 */
export function headerRefusalOf(header: string | undefined): SignatureRefusal | null {
  if (header === undefined || header.length === 0) {
    return 'no-signature-header';
  }

  const parts = signedPartsIn(header);

  if (parts.timestamp.length === 0 || !Number.isFinite(Number(parts.timestamp))) {
    return 'the-header-carries-no-timestamp';
  }

  return parts.signatures.length === 0 ? 'the-header-carries-no-signature-of-this-scheme' : null;
}

/**
 * The reason a delivery is not from Stripe, or nothing at all when it is. The whole body and the
 * whole header go in, so nothing of either is read before this answers.
 */
export function signatureRefusalOf(
  header: string | undefined,
  body: string,
  signingSecret: string,
  now: Date,
): SignatureRefusal | null {
  const shape = headerRefusalOf(header);

  if (shape !== null || header === undefined) {
    return shape;
  }

  const parts = signedPartsIn(header);
  const signedAt = Number(parts.timestamp);
  const expected = createHmac('sha256', signingSecret)
    .update(`${parts.timestamp}.${body}`)
    .digest('hex');

  if (!parts.signatures.some((presented) => matches(expected, presented))) {
    return 'the-signature-does-not-verify';
  }

  // The window is read after the signature, because a timestamp is part of what was signed: a
  // delivery nobody signed is refused as unsigned rather than as old.
  return Math.abs(Math.floor(now.getTime() / 1000) - signedAt) > signatureWindowSeconds
    ? 'the-delivery-is-not-from-now'
    : null;
}
