import * as secureStore from 'expo-secure-store';

/**
 * The keychain, as the two calls anything in Emi makes of it. A module that can only read one
 * string and write one string cannot leak a key through a listing or a dump, so the port stays
 * this small on purpose.
 */
export interface SecureStore {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
}

/**
 * Which item names expo-secure-store accepts, copied from the module rather than invented here. It
 * refuses anything else before the platform is reached, so a test double that took a name the
 * phone refuses would be a double that makes the suite green over a product that fails.
 */
export const keychainItemShape = /^[\w.-]+$/;

/** The words expo-secure-store refuses an item name with, so a double refuses with them too. */
export const invalidItemMessage =
  'Invalid key provided to SecureStore. Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".';

/**
 * How every Emi item is written.
 *
 * The item is readable only while she has the phone unlocked, which is the threat model the whole
 * product starts from: she opens Emi in public. This is not the variant that stays on one device,
 * so a phone restored from her own backup still opens her history rather than sending her to the
 * recovery code for an upgrade she chose.
 */
export function keychainOptions(): secureStore.SecureStoreOptions {
  return { keychainAccessible: secureStore.WHEN_UNLOCKED };
}

/** The keychain on the phone. Every other implementation of the port is a test double. */
export function expoKeychain(): SecureStore {
  return {
    read: async (key) => (await secureStore.getItemAsync(key, keychainOptions())) ?? null,
    write: (key, value) => secureStore.setItemAsync(key, value, keychainOptions()),
  };
}
