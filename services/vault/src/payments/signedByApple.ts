import { X509Certificate, verify } from 'node:crypto';

/**
 * Whether Apple signed a body, read from the body itself.
 *
 * A notification of the App Store carries no token of this account, so the signature stands where
 * an authorizer stands on every other route. Apple signs the whole body as one JSON Web Signature
 * and carries the certificates that verify it in the header of that signature, so three things are
 * read here and all three have to hold: every certificate signs the one in front of it, the last
 * one is a root this repository pins, and the signature over the body verifies under the first one.
 *
 * Nothing of the body is read until all three hold. A caller is handed the payload or a reason, and
 * never both, so a route cannot read a field of a body whose signature failed.
 */

/** The field a signed payload carries its chain of certificates in, newest first. */
export const chainField = 'x5c';

/** The one algorithm Apple signs a notification with, which is the one this service verifies. */
export const notificationAlgorithm = 'ES256';

/** How many certificates a chain may carry, which bounds the work one unsigned body can ask for. */
export const mostCertificatesInAChain = 8;

/** Every way a body is not one Apple signed, as a value, so a caller matches a reason not words. */
export type AppleSignatureRefusal =
  | 'that-is-no-signed-payload'
  | 'the-header-names-another-algorithm'
  | 'the-header-carries-no-chain'
  | 'a-certificate-cannot-be-read'
  | 'the-chain-is-broken'
  | 'the-chain-reaches-no-pinned-root'
  | 'a-certificate-is-not-of-this-moment'
  | 'the-signature-does-not-verify'
  | 'the-payload-carries-no-object';

/** What a verification is bound to: the roots it will stand on, and the instant it runs at. */
export interface WhatAVerificationHolds {
  /** The pinned roots, as base 64 of the bytes their publisher publishes. */
  readonly roots: readonly string[];
  readonly now: Date;
}

/** The payload of a body Apple signed, or the reason this service believes it signed none. */
export type WhatTheSignatureSaid =
  | { readonly payload: Readonly<Record<string, unknown>> }
  | { readonly refusal: AppleSignatureRefusal };

function objectIn(decoded: string): Readonly<Record<string, unknown>> | null {
  try {
    const held = JSON.parse(decoded) as unknown;

    return typeof held === 'object' && held !== null && !Array.isArray(held)
      ? (held as Readonly<Record<string, unknown>>)
      : null;
  } catch {
    return null;
  }
}

/** One part of a signed payload as text. Each one is base 64 in the address safe alphabet. */
function textOfPart(part: string): string {
  return Buffer.from(part, 'base64url').toString('utf8');
}

function certificatesIn(written: readonly unknown[]): X509Certificate[] | null {
  const read: X509Certificate[] = [];

  for (const one of written) {
    if (typeof one !== 'string' || one.length === 0) {
      return null;
    }

    try {
      read.push(new X509Certificate(Buffer.from(one, 'base64')));
    } catch {
      return null;
    }
  }

  return read;
}

/**
 * Whether each certificate was issued by the next one along and carries that one's signature. Both
 * halves are read: a name that matches is not a signature, and a signature with no matching name
 * is a certificate somebody else's chain happened to carry.
 */
function eachOneSignsTheOneBefore(chain: readonly X509Certificate[]): boolean {
  return chain.every((held, at) => {
    const issuer = chain[at + 1];

    if (issuer === undefined) {
      return true;
    }

    try {
      return held.checkIssued(issuer) && held.verify(issuer.publicKey);
    } catch {
      return false;
    }
  });
}

/**
 * Whether the end of the chain is a root this repository pins. The bytes are compared first, which
 * is the whole of it where Apple carries the root in the chain as it does today. The signature is
 * read as well, so a chain that stops one certificate short of the root still stands if a pinned
 * root signed it.
 */
function reachesAPinnedRoot(top: X509Certificate, roots: readonly string[]): boolean {
  return roots.some((written) => {
    const pinned = new X509Certificate(Buffer.from(written, 'base64'));

    if (pinned.raw.equals(top.raw)) {
      return true;
    }

    try {
      return top.checkIssued(pinned) && top.verify(pinned.publicKey);
    } catch {
      return false;
    }
  });
}

function everyOneIsOfThisMoment(chain: readonly X509Certificate[], now: Date): boolean {
  return chain.every((held) => held.validFromDate <= now && now <= held.validToDate);
}

/**
 * The payload of one body Apple signed, or the reason it signed none of it.
 *
 * The chain is read before the signature, because a signature is only worth reading once the key
 * that made it is one Apple stands behind. The signature is read in the pair form a JSON Web
 * Signature carries rather than in the form the platform writes by default, which is the structure
 * that wraps the same two numbers and verifies nothing here.
 */
export function payloadSignedByApple(
  signedPayload: unknown,
  held: WhatAVerificationHolds,
): WhatTheSignatureSaid {
  const parts = typeof signedPayload === 'string' ? signedPayload.split('.') : [];

  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return { refusal: 'that-is-no-signed-payload' };
  }

  const [header, payload, signature] = parts as [string, string, string];
  const read = objectIn(textOfPart(header));

  if (read === null) {
    return { refusal: 'that-is-no-signed-payload' };
  }

  if (read.alg !== notificationAlgorithm) {
    return { refusal: 'the-header-names-another-algorithm' };
  }

  const written = read[chainField];

  if (
    !Array.isArray(written) ||
    written.length === 0 ||
    written.length > mostCertificatesInAChain
  ) {
    return { refusal: 'the-header-carries-no-chain' };
  }

  const chain = certificatesIn(written);

  if (chain === null) {
    return { refusal: 'a-certificate-cannot-be-read' };
  }

  if (!eachOneSignsTheOneBefore(chain)) {
    return { refusal: 'the-chain-is-broken' };
  }

  const top = chain[chain.length - 1] as X509Certificate;
  const leaf = chain[0] as X509Certificate;

  if (!reachesAPinnedRoot(top, held.roots)) {
    return { refusal: 'the-chain-reaches-no-pinned-root' };
  }

  // Read after the chain, so a body nobody signed is refused as unsigned rather than as old.
  if (!everyOneIsOfThisMoment(chain, held.now)) {
    return { refusal: 'a-certificate-is-not-of-this-moment' };
  }

  let verified = false;

  try {
    verified = verify(
      'sha256',
      new TextEncoder().encode(`${header}.${payload}`),
      { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature, 'base64url'),
    );
  } catch {
    verified = false;
  }

  if (!verified) {
    return { refusal: 'the-signature-does-not-verify' };
  }

  const body = objectIn(textOfPart(payload));

  return body === null ? { refusal: 'the-payload-carries-no-object' } : { payload: body };
}
