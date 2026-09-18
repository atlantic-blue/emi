import type { SecureStore } from '../../src/services/sync/deviceKey';

/** A keychain held in memory, so the signing path can be driven without a phone. */
export interface RecordingSecureStore extends SecureStore {
  /** Every item written, in the order it was written, so a test can see a second write. */
  writes(): { key: string; value: string }[];
}

export function memorySecureStore(held: Record<string, string> = {}): RecordingSecureStore {
  const items = new Map<string, string>(Object.entries(held));
  const written: { key: string; value: string }[] = [];

  return {
    writes: () => [...written],
    read: (key) => Promise.resolve(items.get(key) ?? null),
    write: (key, value) => {
      items.set(key, value);
      written.push({ key, value });

      return Promise.resolve();
    },
  };
}

/** A generator that gives the same bytes every run, so a failure names the same key. */
export function fixedRandom(seed: number): (byteCount: number) => Uint8Array {
  return (byteCount) => new Uint8Array(byteCount).map((_, at) => (at * 7 + seed) % 256);
}
