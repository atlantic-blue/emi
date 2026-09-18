import {
  accountIdFor,
  base64Of,
  bytesFromBase64,
  type DeviceKeyPair,
  deviceKeyPairFrom,
  newDeviceKeyPair,
  type RandomSource,
} from '@emi/crypto';

import type { SecureStore } from '../vault/keychain';

/**
 * Her account, made on her phone. There is no sign up screen, because there is nothing to sign up
 * with: thirty two random bytes are the whole account, and the identifier falls out of them.
 *
 * The key is in the keychain and not in the database, because the platform deletes an application's
 * database with the application. A woman who reinstalls Emi must still be the same account.
 */

/** The keychain item that holds the private key, as base 64. */
export const deviceKeyItem = 'emi.deviceKey.v1';

/** The keychain item that holds the account identifier, so a read needs no arithmetic. */
export const accountIdItem = 'emi.accountId.v1';

/** The key pair and the identifier that comes from it. */
export interface DeviceKey extends DeviceKeyPair {
  readonly accountId: string;
}

function keyOf(privateKey: Uint8Array): DeviceKey {
  const pair = deviceKeyPairFrom(privateKey);

  return { ...pair, accountId: accountIdFor(pair.publicKey) };
}

/** The key she already has, or nothing when this phone has never made one. */
export async function readDeviceKey(store: SecureStore): Promise<DeviceKey | null> {
  const held = await store.read(deviceKeyItem);

  return held === null ? null : keyOf(bytesFromBase64(held));
}

/**
 * The key, made once. A second call returns the first key rather than making another, because a
 * replaced key is a new account, and a new account is her history left behind on a server she can
 * no longer prove she owns.
 */
export async function deviceKey(store: SecureStore, random: RandomSource): Promise<DeviceKey> {
  const held = await readDeviceKey(store);

  if (held !== null) {
    return held;
  }

  const made = newDeviceKeyPair(random);
  const accountId = accountIdFor(made.publicKey);

  await store.write(deviceKeyItem, base64Of(made.privateKey));
  await store.write(accountIdItem, accountId);

  return { ...made, accountId };
}
