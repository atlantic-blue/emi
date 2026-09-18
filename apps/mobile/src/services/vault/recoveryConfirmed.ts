import type { SecureStore } from './keychain';

/**
 * The instant she said she had written the recovery code down. It sits in the keychain beside the
 * vault key, and for the same reason: it outlives the application, so a reinstall does not ask her
 * to write down a code she already has on paper.
 *
 * It holds no part of the code. There is nothing here that helps anybody recover a vault, which is
 * the whole point of keeping the code out of it.
 */

/** The keychain item, named here and nowhere else, which `tools/pipeline/keyLeak.ts` enforces. */
export const recoveryConfirmedItem = 'emi.recoveryConfirmed.v1';

/** When she confirmed, or nothing at all when she has not. */
export async function readRecoveryConfirmed(store: SecureStore): Promise<Date | null> {
  const held = await store.read(recoveryConfirmedItem);

  if (held === null) {
    return null;
  }

  const at = new Date(held);

  // An item that is not an instant reads as not confirmed, so she is asked again. Asking twice
  // costs her a minute. Never asking would cost her the vault.
  return Number.isNaN(at.getTime()) ? null : at;
}

/** Written when she says she has the code on paper, and never before. */
export async function writeRecoveryConfirmed(store: SecureStore, at: Date): Promise<void> {
  await store.write(recoveryConfirmedItem, at.toISOString());
}
