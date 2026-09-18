import {
  drawRecoveryCode,
  drawRecoverySalt,
  openWrappedVaultKey,
  type RandomSource,
  recoveryKeyFrom,
  wrapVaultKey,
} from '@emi/crypto';

import { phoneRandom } from './vaultKey';

/**
 * The phone's half of contract VAULT-2. The vault key never leaves this phone, so the wrapped key
 * and the salt are the only two things the server is ever given, and neither opens anything
 * without the code she wrote on paper.
 *
 * Feature 6 step 8 measures the unlock on a real phone and sets the Argon2id parameters, which
 * live as one constant in `@emi/crypto`.
 */

/** What a phone makes once, and hands out in three different directions. */
export interface Recovery {
  /**
   * Shown to her, once, and written down by nobody. It is returned rather than stored on purpose:
   * a function that kept this would be the thing that breaks the promise.
   */
  readonly code: string;
  /** Goes to the server with the registration. */
  readonly salt: Uint8Array;
  /** Goes to the server with the registration. */
  readonly wrappedVaultKey: Uint8Array;
}

/** What the server holds for her, and what a second phone asks it for. */
export interface HeldRecovery {
  readonly salt: Uint8Array;
  readonly wrappedVaultKey: Uint8Array;
}

/**
 * A code, a salt, and this phone's vault key sealed under the key the two derive.
 *
 * The salt is drawn fresh here rather than taken from anywhere shared, because a salt two accounts
 * had in common would mean one code derived one key for both of them.
 */
export function makeRecovery(vaultKey: Uint8Array, random: RandomSource = phoneRandom): Recovery {
  const code = drawRecoveryCode(random);
  const salt = drawRecoverySalt(random);

  return {
    code,
    salt,
    wrappedVaultKey: wrapVaultKey(vaultKey, recoveryKeyFrom(code, salt), random),
  };
}

/**
 * Her vault key back, from the code she typed and what the server held.
 *
 * A code that is not hers raises rather than returning bytes. Thirty two bytes that are not her
 * key would be worse than nothing: the phone would seal her next day under them and the day she
 * wrote yesterday would never open again.
 */
export function vaultKeyFromRecovery(typed: string, held: HeldRecovery): Uint8Array {
  return openWrappedVaultKey(held.wrappedVaultKey, recoveryKeyFrom(typed, held.salt));
}

/**
 * True when the code she typed is the code this recovery was made from. The confirmation screen
 * asks this, and it asks it by opening the wrapped key rather than by comparing two strings, so
 * what the screen proves is the thing that matters: that what she wrote down opens her vault.
 */
export function recoveryCodeOpens(typed: string, held: HeldRecovery): boolean {
  try {
    vaultKeyFromRecovery(typed, held);

    return true;
  } catch {
    return false;
  }
}
