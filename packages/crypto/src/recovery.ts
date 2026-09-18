import { argon2id } from '@noble/hashes/argon2.js';

import {
  EnvelopeError,
  type EnvelopeParts,
  headerLength,
  keyLength,
  openBytes,
  type RandomSource,
  readEnvelope,
  sealVaultKey,
  systemRandom,
  tagLength,
} from './envelope';
import { crockfordAlphabet } from './signature';

/**
 * Section 7.1 of the design: the one way back into a vault whose key lives on a phone she no
 * longer has. Twenty six characters she writes down, a salt, and the vault key sealed under a key
 * derived from the two. Emi stores the code nowhere, which is why nobody at Emi can recover it for
 * her, and why nobody at Emi can read her days either. Those are the same sentence.
 */

/** Characters. Twenty six drawn uniformly from an alphabet of 32 carry 130 bits. */
export const recoveryCodeLength = 26;

/** Bits, written out because it is the number that says the code cannot be guessed. */
export const recoveryCodeBits = 130;

/** Bytes. Fresh for every account, so two women never derive one key from one code. */
export const recoverySaltLength = 16;

/**
 * Argon2id, as one constant, because contract VAULT-2 puts a ceiling on the unlock and feature 6
 * step 8 measures it on the slowest phone available. That step raises or lowers the memory here
 * and records the number it measured. Nothing else in Emi chooses these.
 *
 * The values are the floor the Open Web Application Security Project recommends. They cost about
 * 106 milliseconds on the machine this was written on, and a phone is slower.
 */
export const recoveryParameters = {
  /** Kibibytes of memory, which is the cost a graphics card cannot buy its way around. */
  memoryKiB: 19456,
  /** Passes over that memory. */
  passes: 2,
  /** Lanes. One, because a phone deriving this once has nothing to gain from more. */
  lanes: 1,
  /** Bytes out, which is a vault key's length because that is what it wraps. */
  derivedLength: keyLength,
} as const;

/**
 * Bytes. A wrapped vault key is always exactly this long: the envelope header, thirty two bytes of
 * key, and the tag. A length that is anything else is not a wrapped key, and the service refuses it
 * on that alone without holding any key of its own.
 */
export const wrappedVaultKeyLength = headerLength + keyLength + tagLength;

/** Every way the recovery half refuses, as a value, so a caller reads a reason and not a message. */
export type RecoveryRefusal =
  | 'recovery-code-is-the-wrong-length'
  | 'recovery-code-is-not-crockford-base32'
  | 'recovery-salt-is-the-wrong-length'
  | 'random-source-is-the-wrong-length'
  | 'random-source-returned-zeroes'
  | 'wrapped-vault-key-is-the-wrong-length'
  | 'wrapped-vault-key-does-not-open';

/** Carries the refusal beside the message, the way the envelope and the signature do. */
export class RecoveryError extends Error {
  readonly refusal: RecoveryRefusal;

  constructor(refusal: RecoveryRefusal, message: string) {
    super(message);
    this.name = 'RecoveryError';
    this.refusal = refusal;
  }
}

/**
 * The letters Crockford base 32 leaves out, and what a person who writes one down meant instead.
 * She reads the code off paper and types it back, so a capital I is a one and a letter O is a
 * zero. U is absent from the alphabet on purpose and maps to nothing, because a U she typed is a
 * character she read wrong rather than a character that stands for something.
 */
const readAs: Readonly<Record<string, string>> = { I: '1', L: '1', O: '0' };

/**
 * A code she can write on paper. Every character is drawn from a byte, and 256 divides by 32
 * exactly, so masking the low five bits leaves every character as likely as every other. A modulo
 * of an alphabet that did not divide would quietly make the first characters more common.
 */
export function drawRecoveryCode(random: RandomSource = systemRandom): string {
  const drawn = drawn_(random, recoveryCodeLength);
  let code = '';

  for (const byte of drawn) {
    code += crockfordAlphabet[byte & 0b11111] as string;
  }

  return code;
}

/** A salt of its own for every account, which is what stops one derivation serving two women. */
export function drawRecoverySalt(random: RandomSource = systemRandom): Uint8Array {
  return drawn_(random, recoverySaltLength);
}

/**
 * What she typed, read as the code she wrote down.
 *
 * Case, the two letters that look like a one, the letter that looks like a zero, and the spaces
 * and hyphens she put in to keep her place are all hers to get wrong. A character the alphabet
 * genuinely does not carry is refused, and the refusal never says which character it was, because
 * a message that repeats the code is a message that carries the code.
 */
export function readRecoveryCode(typed: string): string {
  let read = '';

  for (const character of typed.toUpperCase()) {
    if (character === '-' || character === ' ') {
      continue;
    }

    const meant = readAs[character] ?? character;

    if (!crockfordAlphabet.includes(meant)) {
      throw new RecoveryError(
        'recovery-code-is-not-crockford-base32',
        'a recovery code holds only the characters Emi showed her',
      );
    }

    read += meant;
  }

  if (read.length !== recoveryCodeLength) {
    throw new RecoveryError(
      'recovery-code-is-the-wrong-length',
      `a recovery code is ${recoveryCodeLength} characters, this one is ${read.length}`,
    );
  }

  return read;
}

/**
 * The key the vault key is wrapped under. It exists for as long as this call runs and is written
 * nowhere: the phone keeps the vault key, the server keeps the wrapped bytes, and the code that
 * joins them is on her paper.
 */
export function recoveryKeyFrom(code: string, salt: Uint8Array): Uint8Array {
  const read = readRecoveryCode(code);

  if (salt.length !== recoverySaltLength) {
    throw new RecoveryError(
      'recovery-salt-is-the-wrong-length',
      `a recovery salt is ${recoverySaltLength} bytes, this one is ${salt.length}`,
    );
  }

  return argon2id(read, salt, {
    m: recoveryParameters.memoryKiB,
    t: recoveryParameters.passes,
    p: recoveryParameters.lanes,
    dkLen: recoveryParameters.derivedLength,
  });
}

/** The vault key, sealed under the recovery key, in the envelope of section 7.2. */
export function wrapVaultKey(
  vaultKey: Uint8Array,
  recoveryKey: Uint8Array,
  random: RandomSource = systemRandom,
): Uint8Array {
  return sealVaultKey(vaultKey, recoveryKey, random);
}

/**
 * The vault key back, or nothing at all.
 *
 * A wrong code derives a wrong key, the tag does not check out, and this raises. It never returns
 * thirty two bytes that are not her key, which is the whole reason the wrap carries a tag: a
 * wrapper without one would hand back rubbish and the phone would seal her next day under it.
 */
export function openWrappedVaultKey(wrapped: Uint8Array, recoveryKey: Uint8Array): Uint8Array {
  readWrappedVaultKey(wrapped);

  let opened: Uint8Array;

  try {
    opened = openBytes(wrapped, recoveryKey);
  } catch (thrown) {
    if (thrown instanceof EnvelopeError && thrown.refusal === 'envelope-is-not-authentic') {
      throw new RecoveryError(
        'wrapped-vault-key-does-not-open',
        'that recovery code does not open this vault',
      );
    }

    throw thrown;
  }

  if (opened.length !== keyLength) {
    throw new RecoveryError(
      'wrapped-vault-key-is-the-wrong-length',
      `a wrapped vault key holds ${keyLength} bytes, these held ${opened.length}`,
    );
  }

  return opened;
}

/**
 * What the service is allowed to do with a wrapped key: read its shape. It holds no recovery key
 * and no vault key, so this is the whole of what it can check, and the fixed length is what makes
 * that check worth anything.
 */
export function readWrappedVaultKey(wrapped: Uint8Array): EnvelopeParts {
  if (wrapped.length !== wrappedVaultKeyLength) {
    throw new RecoveryError(
      'wrapped-vault-key-is-the-wrong-length',
      `a wrapped vault key is ${wrappedVaultKeyLength} bytes, these are ${wrapped.length}`,
    );
  }

  return readEnvelope(wrapped);
}

function drawn_(random: RandomSource, byteCount: number): Uint8Array {
  const drawn = random(byteCount);

  if (drawn.length !== byteCount) {
    throw new RecoveryError(
      'random-source-is-the-wrong-length',
      `this needs ${byteCount} bytes, the source returned ${drawn.length}`,
    );
  }

  // A generator that is not running returns zeroes. Zeroes here are a code anybody can type and a
  // salt every account shares, and contract VAULT-2 names that second one by itself.
  if (drawn.every((byte) => byte === 0)) {
    throw new RecoveryError(
      'random-source-returned-zeroes',
      'the random source returned nothing but zeroes',
    );
  }

  return drawn;
}
