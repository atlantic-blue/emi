import { invalidItemMessage, keychainItemShape } from '../../src/services/vault/keychain';

/**
 * The application reaches the keychain through expo-secure-store, which has no implementation off
 * a phone. This stands in for it and answers what the module answers: the module's own item name
 * rule, its own words for a name outside it, a read of an absent item that answers nothing rather
 * than raising, and a refusal that arrives as a rejected promise because every call over there is
 * asynchronous. A double that took more than the phone takes would make the suite green over a
 * product that fails.
 *
 * The items outlive the application here, the way they outlive it on the phone, so a test can
 * delete the application and install it again. `resetExpoSecureStore` is a different phone.
 */
const held = new Map<string, string>();

/** What the application asked of the platform, so a test can read the options it wrote with. */
const asked: KeychainCall[] = [];

export interface KeychainCall {
  readonly call: 'read' | 'write' | 'delete';
  readonly key: string;
  readonly options: unknown;
}

/** The five accessibility levels the module exports. Emi writes with the first. */
export const WHEN_UNLOCKED = 'whenUnlocked';
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'whenUnlockedThisDeviceOnly';
export const AFTER_FIRST_UNLOCK = 'afterFirstUnlock';
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 'afterFirstUnlockThisDeviceOnly';
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'whenPasscodeSetThisDeviceOnly';

export async function getItemAsync(key: string, options: unknown = {}): Promise<string | null> {
  ensureValidKey(key);
  asked.push({ call: 'read', key, options });

  return await Promise.resolve(held.get(key) ?? null);
}

export async function setItemAsync(
  key: string,
  value: string,
  options: unknown = {},
): Promise<void> {
  ensureValidKey(key);

  if (typeof value !== 'string') {
    throw new Error(
      'Invalid value provided to SecureStore. Values must be strings; consider JSON-encoding your values if they are serializable.',
    );
  }

  asked.push({ call: 'write', key, options });
  held.set(key, value);

  await Promise.resolve();
}

/**
 * One item the platform will not let go of. A keychain error is rare and it is the one thing that
 * turns a finished delete into an unfinished one, so a test has to be able to produce it.
 */
let refused: string | null = null;

export function theKeychainRefusesToRemove(item: string | null): void {
  refused = item;
}

export async function deleteItemAsync(key: string, options: unknown = {}): Promise<void> {
  ensureValidKey(key);
  asked.push({ call: 'delete', key, options });

  if (key === refused) {
    throw new Error('the platform would not remove this item');
  }

  held.delete(key);

  await Promise.resolve();
}

/** Every call the application made, in order, with the options it passed. */
export function callsToTheKeychain(): KeychainCall[] {
  return [...asked];
}

/** Every item this phone holds, so a test can see what reached the keychain and what did not. */
export function itemsInTheKeychain(): Record<string, string> {
  return Object.fromEntries(held);
}

/** A different phone: it has never held any of this. */
export function resetExpoSecureStore(): void {
  held.clear();
  asked.length = 0;
  refused = null;
}

/** The module's own check, over the rule the application copied from it. */
export function ensureValidKey(key: string): void {
  if (!keychainItemShape.test(key)) {
    throw new Error(invalidItemMessage);
  }
}
