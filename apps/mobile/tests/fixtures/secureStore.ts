import type { SecureStore } from '../../src/services/vault/keychain';

import { ensureValidKey } from './expoSecureStore';

/**
 * A keychain held in memory, so a key can be made and read without a phone. It refuses an item
 * name the way the platform refuses it, from the platform's own rule, because a double that is
 * looser than the phone hides the failure rather than finding it.
 */
export interface RecordingSecureStore extends SecureStore {
  /** Every item written, in the order it was written, so a test can see a second write. */
  writes(): { key: string; value: string }[];
  /** Every item removed, in order, so a test can see what a delete asked for. */
  removals(): string[];
  /** What it holds now, which is how a test reads the keychain rather than asking Emi. */
  items(): Record<string, string>;
}

export function memorySecureStore(held: Record<string, string> = {}): RecordingSecureStore {
  const items = new Map<string, string>(Object.entries(held));
  const written: { key: string; value: string }[] = [];
  const removed: string[] = [];

  return {
    writes: () => [...written],
    removals: () => [...removed],
    items: () => Object.fromEntries(items),
    read: async (key) => {
      ensureValidKey(key);

      return await Promise.resolve(items.get(key) ?? null);
    },
    write: async (key, value) => {
      ensureValidKey(key);
      items.set(key, value);
      written.push({ key, value });

      await Promise.resolve();
    },
    remove: async (key) => {
      ensureValidKey(key);
      items.delete(key);
      removed.push(key);

      await Promise.resolve();
    },
  };
}

/** A generator that gives the same bytes every run, so a failure names the same key. */
export function fixedRandom(seed: number): (byteCount: number) => Uint8Array {
  return (byteCount) => new Uint8Array(byteCount).map((_, at) => (at * 7 + seed) % 256);
}
