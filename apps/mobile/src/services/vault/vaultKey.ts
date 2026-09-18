import { Base64Error, base64Of, bytesFromBase64, keyLength, type RandomSource } from '@emi/crypto';
import { getRandomValues } from 'expo-crypto';

import type { SecureStore } from './keychain';

/**
 * The key that encrypts every day she logs. Thirty two random bytes, made once on her phone and
 * never transmitted.
 *
 * It lives in the keychain and not in the database because the platform deletes an application's
 * database with the application. A woman who reinstalls Emi would otherwise find her own history
 * unreadable. Feature 5 step 7 measures that on a real device, because it is the platform's
 * behaviour and no test suite can prove it.
 */

/**
 * The phone's own generator. expo-crypto also offers `getRandomBytes`, which falls back to
 * Math.random while a remote debugger is attached, and a key drawn from Math.random is a key
 * anybody can draw again. This call has no fallback: a runtime with no generator leaves the bytes
 * as zeroes, and zeroes are refused below rather than used.
 */
export const phoneRandom: RandomSource = (byteCount) => getRandomValues(new Uint8Array(byteCount));

/** The keychain item that holds the key, as base 64. */
export const vaultKeyItem = 'emi.vaultKey.v1';

/**
 * Every way the key refuses, as a value, so a caller matches on the reason rather than on the
 * words of a message. No message here carries the key, and `tools/pipeline/keyLeak.ts` is what
 * keeps that true.
 */
export type VaultKeyRefusal =
  | 'vault-key-already-exists'
  | 'vault-key-is-the-wrong-length'
  | 'vault-key-is-not-base64'
  | 'random-source-is-the-wrong-length'
  | 'random-source-returned-zeroes';

/** Carries the refusal beside the message, the way the envelope and the signature do. */
export class VaultKeyError extends Error {
  readonly refusal: VaultKeyRefusal;

  constructor(refusal: VaultKeyRefusal, message: string) {
    super(message);
    this.name = 'VaultKeyError';
    this.refusal = refusal;
  }
}

/**
 * The key this phone holds, or nothing when it has never made one.
 *
 * An item of the wrong length refuses rather than reading as nothing, because nothing is what
 * sends the caller to make a second key over the top of the first.
 */
export async function readVaultKey(store: SecureStore): Promise<Uint8Array | null> {
  const held = await store.read(vaultKeyItem);

  if (held === null) {
    return null;
  }

  return checkedKey(bytesOf(held));
}

/**
 * The key, made once.
 *
 * A second creation while one exists is refused. Replacing the key is not losing a password: every
 * day she has ever written was sealed under the first one, and nothing would open them again.
 */
export async function createVaultKey(
  store: SecureStore,
  random: RandomSource,
): Promise<Uint8Array> {
  if ((await store.read(vaultKeyItem)) !== null) {
    throw new VaultKeyError(
      'vault-key-already-exists',
      'this phone holds a vault key already, and a second one would leave every day she has written sealed under a key nobody has',
    );
  }

  const made = drawKey(random);
  await store.write(vaultKeyItem, base64Of(made));

  return made;
}

/** What the first run calls: the key she has, or the key this makes for her. */
export async function vaultKey(store: SecureStore, random: RandomSource): Promise<Uint8Array> {
  return (await readVaultKey(store)) ?? (await createVaultKey(store, random));
}

function drawKey(random: RandomSource): Uint8Array {
  const drawn = random(keyLength);

  if (drawn.length !== keyLength) {
    throw new VaultKeyError(
      'random-source-is-the-wrong-length',
      `a vault key is ${keyLength} bytes, the source returned ${drawn.length}`,
    );
  }

  // A generator that is not running returns zeroes, and a key of zeroes seals every day under a
  // key anybody can guess. Real randomness never lands here.
  if (drawn.every((byte) => byte === 0)) {
    throw new VaultKeyError(
      'random-source-returned-zeroes',
      'the random source returned nothing but zeroes',
    );
  }

  return drawn;
}

function bytesOf(held: string): Uint8Array {
  try {
    return bytesFromBase64(held);
  } catch (error) {
    if (error instanceof Base64Error) {
      // The refusal says what is wrong and never what was read, because the thing that was read
      // is the key.
      throw new VaultKeyError('vault-key-is-not-base64', 'the keychain item is not base 64');
    }

    throw error;
  }
}

function checkedKey(key: Uint8Array): Uint8Array {
  if (key.length !== keyLength) {
    throw new VaultKeyError(
      'vault-key-is-the-wrong-length',
      `a vault key is ${keyLength} bytes, the keychain holds ${key.length}`,
    );
  }

  return key;
}
