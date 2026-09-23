import { randomFillSync } from 'node:crypto';

import { base64Of, bytesFromBase64, keyLength, type RandomSource } from '@emi/crypto';

import { type DayVault, dayVault } from '../../src/services/vault/dayVault';
import { type ProfileVault, profileVault } from '../../src/services/vault/profileVault';
import { expoKeychain } from '../../src/services/vault/keychain';
import { vaultKeyItem } from '../../src/services/vault/vaultKey';

/**
 * A vault key for a test. It is fixed rather than drawn, so a failure reads the same way twice,
 * and it is never the key a phone holds: the phone draws its own at first run and writes it to the
 * keychain.
 */
export function herKey(): Uint8Array {
  return new Uint8Array(keyLength).map((_, at) => (at * 7 + 13) % 256);
}

/**
 * Where a nonce comes from in a test. The phone draws from expo-crypto and never from the
 * runtime's globals, so a test asks Node for the same thing the same way.
 */
export const herRandom: RandomSource = (byteCount) => randomFillSync(new Uint8Array(byteCount));

/** The vault a test seals and opens with. */
export function herVault(): DayVault {
  return dayVault(herKey(), herRandom);
}

/** The vault a test seals and opens her answers with, under the same key her days are sealed with. */
export function herProfileVault(): ProfileVault {
  return profileVault(herKey(), herRandom);
}

/**
 * Puts the test key in the keychain before the application looks, so rows a test seeds open under
 * the key the application reads. Without this the application makes a key of its own and every
 * seeded day is bytes it cannot open.
 */
export async function herKeyIsInTheKeychain(): Promise<void> {
  await expoKeychain().write(vaultKeyItem, base64Of(herKey()));
}

/**
 * The key the phone actually holds, which is the only way to read a row after a first run: the
 * application drew that key itself and no test knows it in advance.
 */
export async function theVaultOnHerPhone(): Promise<DayVault> {
  const held = await expoKeychain().read(vaultKeyItem);

  if (held === null) {
    throw new Error('this phone holds no vault key, so nothing it wrote can be read');
  }

  return dayVault(bytesFromBase64(held), herRandom);
}
