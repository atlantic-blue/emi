import { webcrypto } from 'node:crypto';

/**
 * The phone's random generator, which expo-crypto has no implementation of off a phone: the
 * preset's own stand in hands back zeroes, and zeroes are what `drawKey` refuses. This gives the
 * generator the operating system gives, so a first run in a test makes a key the way a first run
 * on a phone makes one.
 */
export function getRandomValues<T extends ArrayBufferView>(into: T): T {
  return webcrypto.getRandomValues(into as unknown as Uint8Array) as unknown as T;
}
