import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { base64Of, bytesFromBase64 } from './base64';
import type { RandomSource } from './envelope';

/**
 * The request signature of section 7.3 of the design. There is no email address and no password,
 * so the key pair on the phone is the whole account. One implementation signs on the phone and
 * verifies in the service, because two implementations of one format drift.
 */

/** Bytes. Ed25519 takes one length for a private key and one for a public key, and both are this. */
export const deviceKeyLength = 32;

/** Bytes. Ed25519 writes a signature of exactly this length and reads no other. */
export const signatureLength = 64;

/** Bytes of the digest that the account identifier is cut from. Sixteen bytes carry 128 bits. */
export const accountIdBytes = 16;

/** Characters. Crockford base 32 writes 128 bits in this many, with two bits of padding left. */
export const accountIdLength = 26;

/**
 * Seconds. A request signed further from now than this is refused, in either direction, so a
 * captured request stops working soon after it is captured.
 */
export const instantWindowSeconds = 300;

/** The header that names the account. It is one of the three the api reads as an identity source. */
export const accountHeader = 'emi-account';

/** The header that carries the instant the request was signed at. */
export const instantHeader = 'emi-instant';

/** The header that carries the signature itself, as base 64. */
export const signatureHeader = 'emi-signature';

/**
 * The header that carries the digest of the body. A request authorizer never receives a body, so
 * the digest travels beside the signature and the function behind the api compares it against the
 * body it did receive.
 */
export const bodyHashHeader = 'emi-body-sha256';

/**
 * Crockford base 32, which has no letter that a person can read as a digit. The account identifier
 * is the one value in this product a woman might ever read aloud.
 */
export const crockfordAlphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Every way a signature is refused, as a value. An unknown account is absent from this list on
 * purpose: it is answered with `signature-does-not-verify`, because a caller who can tell the two
 * apart can ask this api which accounts exist.
 */
export type SignatureRefusal =
  | 'header-is-missing'
  | 'instant-is-not-an-instant'
  | 'instant-is-not-fresh'
  | 'signature-is-not-readable'
  | 'signature-does-not-verify'
  | 'signature-was-used-before'
  | 'body-hash-does-not-match';

/**
 * What a refused request is told, by refusal. The words for an unknown account are the words for a
 * bad signature, and the service holds that by answering with the same refusal value.
 */
export const refusalMessages: Readonly<Record<SignatureRefusal, string>> = {
  'header-is-missing': 'the request carries no signature',
  'instant-is-not-an-instant': 'the request carries no signature',
  'instant-is-not-fresh': 'the request was signed too long ago',
  'signature-is-not-readable': 'the request carries no signature',
  'signature-does-not-verify': 'the signature does not verify',
  // A replayed request is told what a bad signature is told. The caller learns that it was
  // refused and never which of the two checks refused it.
  'signature-was-used-before': 'the signature does not verify',
  'body-hash-does-not-match': 'the body is not the body that was signed',
};

/** Carries the refusal beside the message, so a caller matches the reason and not the words. */
export class SignatureError extends Error {
  readonly refusal: SignatureRefusal;

  constructor(refusal: SignatureRefusal, message: string) {
    super(message);
    this.name = 'SignatureError';
    this.refusal = refusal;
  }
}

/** A private key and the public key that comes from it. The private half never leaves the phone. */
export interface DeviceKeyPair {
  readonly privateKey: Uint8Array;
  readonly publicKey: Uint8Array;
}

/** The four values a signed request carries in its headers. */
export interface PresentedSignature {
  readonly accountId: string;
  readonly instant: string;
  readonly signature: string;
  readonly bodyHash: string;
}

/** What is signed: the method, the path, the instant, and the digest of the body. */
export interface RequestToSign {
  readonly method: string;
  readonly path: string;
  readonly instant: string;
  readonly bodyHash: string;
}

/** Bytes written as lowercase hexadecimal, which is how a digest travels in a header. */
export function hexOf(bytes: Uint8Array): string {
  let written = '';

  for (const byte of bytes) {
    written += byte.toString(16).padStart(2, '0');
  }

  return written;
}

/**
 * Crockford base 32 of the bytes, most significant bit first, with the tail padded by zero bits.
 * Sixteen bytes therefore give 26 characters.
 */
export function crockfordBase32(bytes: Uint8Array): string {
  let written = '';
  let held = 0;
  let count = 0;

  for (const byte of bytes) {
    held = (held << 8) | byte;
    count += 8;

    while (count >= 5) {
      count -= 5;
      written += crockfordAlphabet[(held >> count) & 0b11111] as string;
    }
  }

  if (count > 0) {
    written += crockfordAlphabet[(held << (5 - count)) & 0b11111] as string;
  }

  return written;
}

/**
 * Who she is, to the server: the first sixteen bytes of the digest of her public key. The server
 * learns nothing from it, because it is derived from a value she chose at random on her own phone.
 */
export function accountIdFor(publicKey: Uint8Array): string {
  if (publicKey.length !== deviceKeyLength) {
    throw new SignatureError(
      'signature-does-not-verify',
      `a public key is ${deviceKeyLength} bytes and this one is ${publicKey.length}`,
    );
  }

  return crockfordBase32(sha256(publicKey).subarray(0, accountIdBytes));
}

/** The public half of a private key she already holds, so a reinstall recovers the whole pair. */
export function deviceKeyPairFrom(privateKey: Uint8Array): DeviceKeyPair {
  if (privateKey.length !== deviceKeyLength) {
    throw new SignatureError(
      'signature-does-not-verify',
      `a device key is ${deviceKeyLength} bytes and this one is ${privateKey.length}`,
    );
  }

  return { privateKey, publicKey: ed25519.getPublicKey(privateKey) };
}

/** A new key pair from the platform's own generator. This is the whole of making an account. */
export function newDeviceKeyPair(random: RandomSource): DeviceKeyPair {
  const privateKey = random(deviceKeyLength);

  if (privateKey.length !== deviceKeyLength) {
    throw new SignatureError(
      'signature-does-not-verify',
      `the random source gave ${privateKey.length} bytes and a device key needs ${deviceKeyLength}`,
    );
  }

  return deviceKeyPairFrom(privateKey);
}

/** The digest of the body, as lowercase hexadecimal. An empty body has a digest like any other. */
export function bodyHashOf(body: string | Uint8Array): string {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;

  return hexOf(sha256(bytes));
}

/**
 * What the key signs: four lines, in this order, joined by a newline. The path carries the query
 * string where the request has one, because a cursor a caller can change is a cursor nobody signed.
 */
export function signingString(request: RequestToSign): string {
  return [request.method.toUpperCase(), request.path, request.instant, request.bodyHash].join('\n');
}

/** The signature over that string, as base 64. */
export function signRequest(request: RequestToSign, privateKey: Uint8Array): string {
  const message = new TextEncoder().encode(signingString(request));

  return base64Of(ed25519.sign(message, privateKey));
}

/** The four headers a signed request carries, ready to be given to the transport. */
export function signedHeaders(
  keyPair: DeviceKeyPair,
  request: RequestToSign,
): Readonly<Record<string, string>> {
  return {
    [accountHeader]: accountIdFor(keyPair.publicKey),
    [instantHeader]: request.instant,
    [bodyHashHeader]: request.bodyHash,
    [signatureHeader]: signRequest(request, keyPair.privateKey),
  };
}

/**
 * Reads the four headers back. A header name arrives lowercase from the api and from a browser, so
 * the reader lowercases what it is given rather than trusting the case it was sent in.
 */
export function presentedSignatureIn(
  headers: Readonly<Record<string, string | undefined>>,
): PresentedSignature | null {
  const read = (name: string): string | undefined => {
    const found = Object.entries(headers).find(([held]) => held.toLowerCase() === name);

    return found?.[1];
  };

  const accountId = read(accountHeader);
  const instant = read(instantHeader);
  const signature = read(signatureHeader);
  const bodyHash = read(bodyHashHeader);

  if (
    accountId === undefined ||
    instant === undefined ||
    signature === undefined ||
    bodyHash === undefined
  ) {
    return null;
  }

  return { accountId, instant, signature, bodyHash };
}

/**
 * The instant, as milliseconds, or null when the text is not the one written form. One written
 * form, so two texts can never stand for one moment.
 */
export function instantAt(instant: string): number | null {
  const at = Date.parse(instant);

  if (Number.isNaN(at) || new Date(at).toISOString() !== instant) {
    return null;
  }

  return at;
}

/**
 * Whether the instant is inside the window, in either direction. A clock that runs ahead is as much
 * of a problem as one that runs behind, and neither one may open the window wider.
 */
export function instantIsFresh(instant: string, now: Date): boolean {
  const at = instantAt(instant);

  if (at === null) {
    return false;
  }

  return Math.abs(now.getTime() - at) <= instantWindowSeconds * 1000;
}

/**
 * Whether the signature is this public key's signature over this request. A signature of the wrong
 * length is refused rather than thrown, because the caller chose the length and every refusal here
 * has to cost the same.
 */
export function signatureVerifies(
  presented: PresentedSignature,
  method: string,
  path: string,
  publicKey: Uint8Array,
): boolean {
  let signature: Uint8Array;

  try {
    signature = bytesFromBase64(presented.signature);
  } catch {
    return false;
  }

  if (signature.length !== signatureLength || publicKey.length !== deviceKeyLength) {
    return false;
  }

  const message = new TextEncoder().encode(
    signingString({ method, path, instant: presented.instant, bodyHash: presented.bodyHash }),
  );

  try {
    return ed25519.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

/**
 * A public key nobody holds the private half of, verified against when the account is unknown. The
 * work is the point: without it, an unknown account answers faster than a bad signature, and the
 * difference in the timing is an index of who holds an account here.
 */
export const decoyPublicKey: Uint8Array = ed25519.getPublicKey(
  sha256(new TextEncoder().encode('emi decoy')),
);
