import { createHash, webcrypto } from 'node:crypto';

/**
 * The phone's random generator, which expo-crypto has no implementation of off a phone: the
 * preset's own stand in hands back zeroes, and zeroes are what `drawKey` refuses. This gives the
 * generator the operating system gives, so a first run in a test makes a key the way a first run
 * on a phone makes one.
 */
export function getRandomValues<T extends ArrayBufferView>(into: T): T {
  return webcrypto.getRandomValues(into as unknown as Uint8Array) as unknown as T;
}

export const CryptoDigestAlgorithm = { SHA256: 'SHA-256' } as const;

export const CryptoEncoding = { HEX: 'hex', BASE64: 'base64' } as const;

/** The digest the phone makes, made here by Node, so a code challenge is the real one. */
export async function digestStringAsync(
  algorithm: string,
  data: string,
  options?: { readonly encoding?: string },
): Promise<string> {
  if (algorithm !== CryptoDigestAlgorithm.SHA256) {
    throw new Error(`the stand in makes no ${algorithm} digest`);
  }

  return Promise.resolve(
    createHash('sha256')
      .update(data, 'utf8')
      .digest(options?.encoding === CryptoEncoding.BASE64 ? 'base64' : 'hex'),
  );
}
