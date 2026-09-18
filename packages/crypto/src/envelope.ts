import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import type { Symptom } from '@emi/cycle';

import { recordBytes, recordFromBytes, type DayRecord } from './record';

/**
 * The bytes of section 7.2 of the design, in order: one byte of version, then a 24 byte nonce,
 * then the ciphertext and its 16 byte authentication tag. One implementation, used by the phone
 * and read by the service, so a change to the format can only happen in one place.
 */
export const envelopeVersion = 0x01;
/** Bytes. The cipher takes one key length and refuses every other. */
export const keyLength = 32;
/**
 * Bytes. A nonce this long can be drawn at random for every write without ever repeating, which is
 * what lets one key seal every day she logs.
 */
export const nonceLength = 24;
/**
 * Bytes, at the end of the sealed part. One changed bit anywhere before it fails the tag, so a
 * record that somebody edited does not open at all.
 */
export const tagLength = 16;

/** The version byte and the nonce, before the ciphertext starts. */
export const headerLength = 1 + nonceLength;

/**
 * Every way a seal or an open refuses, as a value, so a caller matches on the reason rather than
 * on the words of a message.
 */
export type EnvelopeRefusal =
  | 'key-is-the-wrong-length'
  | 'random-source-is-missing'
  | 'random-source-is-the-wrong-length'
  | 'nonce-is-all-zero'
  | 'envelope-is-truncated'
  | 'version-is-not-known'
  | 'envelope-is-not-authentic';

/**
 * Carries the refusal beside the message, so a truncated envelope and a changed one can be told
 * apart by the code that catches them.
 */
export class EnvelopeError extends Error {
  readonly refusal: EnvelopeRefusal;

  constructor(refusal: EnvelopeRefusal, message: string) {
    super(message);
    this.name = 'EnvelopeError';
    this.refusal = refusal;
  }
}

/** Where the nonce comes from. The phone passes the platform's generator, a vector passes bytes. */
export type RandomSource = (byteCount: number) => Uint8Array;

/**
 * What the service is allowed to see: the version and the nonce, and the sealed bytes that it
 * holds no key to.
 */
export interface EnvelopeParts {
  readonly version: number;
  readonly nonce: Uint8Array;
  /** The ciphertext and the tag together, which is what the cipher reads. */
  readonly sealed: Uint8Array;
}

/** The two seams a test reaches for: where the nonce comes from, and which catalogue is read. */
export interface SealOptions {
  /** Where the nonce comes from. Left out, it is the platform's own generator. */
  readonly random?: RandomSource;
  /** The symptom catalogue the slugs are read against. Left out, it is the one that ships. */
  readonly catalogue?: readonly Symptom[];
}

/**
 * The only way to write an envelope, so nothing can be sealed that has not passed the ranges of a
 * day first.
 */
export function sealRecord(
  record: DayRecord,
  key: Uint8Array,
  options: SealOptions = {},
): Uint8Array {
  return sealBytes(recordBytes(record, options.catalogue), key, options.random ?? systemRandom);
}

/**
 * Reads a day back out. The ranges are not checked again here: a day she wrote years ago is hers
 * to read, whatever the catalogue holds now.
 */
export function openRecord(envelope: Uint8Array, key: Uint8Array): DayRecord {
  return recordFromBytes(openBytes(envelope, key));
}

// Not exported: `sealRecord` and `sealVaultKey` are the only two ways to write an envelope, so
// nothing can seal a day that has not passed the ranges of section 6.2 first.
function sealBytes(plaintext: Uint8Array, key: Uint8Array, random: RandomSource): Uint8Array {
  const nonce = drawNonce(random);
  const sealed = xchacha20poly1305(checkedKey(key), nonce).encrypt(plaintext);

  const envelope = new Uint8Array(headerLength + sealed.length);
  envelope[0] = envelopeVersion;
  envelope.set(nonce, 1);
  envelope.set(sealed, headerLength);

  return envelope;
}

/**
 * The one other thing Emi seals: a vault key, under the key her recovery code derives. Thirty two
 * bytes exactly, so this cannot become a second way to write a day that skipped the ranges of
 * section 6.2. Those two are the whole list of what an envelope may carry.
 */
export function sealVaultKey(
  vaultKey: Uint8Array,
  under: Uint8Array,
  random: RandomSource = systemRandom,
): Uint8Array {
  if (vaultKey.length !== keyLength) {
    throw new EnvelopeError(
      'key-is-the-wrong-length',
      `a vault key is ${keyLength} bytes, this one is ${vaultKey.length}`,
    );
  }

  return sealBytes(vaultKey, checkedKey(under), random);
}

/**
 * Refuses the same way whether the bytes were changed or the key is wrong, because telling the two
 * apart would say which of them somebody got right.
 */
export function openBytes(envelope: Uint8Array, key: Uint8Array): Uint8Array {
  const parts = readEnvelope(envelope);
  // The key is checked outside the block below, so a key of the wrong length says so rather
  // than arriving as a failed authentication.
  const cipher = xchacha20poly1305(checkedKey(key), parts.nonce);

  try {
    return cipher.decrypt(parts.sealed);
  } catch {
    throw new EnvelopeError(
      'envelope-is-not-authentic',
      'these bytes were changed after they were sealed, or they were sealed under another key',
    );
  }
}

/**
 * What the service is allowed to do with an envelope. It reads the shape and never the content,
 * because it holds no key and this repository is the proof of that.
 */
export function readEnvelope(envelope: Uint8Array): EnvelopeParts {
  if (envelope.length < headerLength + tagLength + 1) {
    throw new EnvelopeError(
      'envelope-is-truncated',
      `an envelope carries at least ${headerLength + tagLength + 1} bytes, these are ${envelope.length}`,
    );
  }

  const version = envelope[0];
  if (version !== envelopeVersion) {
    throw new EnvelopeError(
      'version-is-not-known',
      `this envelope says version ${String(version)}, and version ${envelopeVersion} is the only one`,
    );
  }

  return {
    version,
    nonce: envelope.slice(1, headerLength),
    sealed: envelope.slice(headerLength),
  };
}

/**
 * The platform's own generator, and what a seal draws from when nothing else is handed in. A
 * runtime that has none refuses here rather than falling back to something weaker.
 */
export function systemRandom(byteCount: number): Uint8Array {
  const source = globalThis.crypto;
  if (typeof source?.getRandomValues !== 'function') {
    throw new EnvelopeError(
      'random-source-is-missing',
      'this runtime has no crypto.getRandomValues, so pass a random source',
    );
  }

  return source.getRandomValues(new Uint8Array(byteCount));
}

function drawNonce(random: RandomSource): Uint8Array {
  const nonce = random(nonceLength);
  if (nonce.length !== nonceLength) {
    throw new EnvelopeError(
      'random-source-is-the-wrong-length',
      `a nonce is ${nonceLength} bytes, the source returned ${nonce.length}`,
    );
  }

  // A source that is not running returns zeroes, and a nonce used twice under one key is the one
  // mistake this cipher does not survive. Real randomness never lands here.
  if (nonce.every((byte) => byte === 0)) {
    throw new EnvelopeError('nonce-is-all-zero', 'the random source returned nothing but zeroes');
  }

  return nonce;
}

function checkedKey(key: Uint8Array): Uint8Array {
  if (key.length !== keyLength) {
    throw new EnvelopeError(
      'key-is-the-wrong-length',
      `a vault key is ${keyLength} bytes, this one is ${key.length}`,
    );
  }
  return key;
}
