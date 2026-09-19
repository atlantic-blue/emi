import { EnvelopeError, systemRandom } from '@emi/crypto';

import { dayVault } from '../../src/services/vault/dayVault';
import { aDayRecord, aVaultKey } from '../fixtures/dayRecord';
import { herRandom } from '../fixtures/herVault';

/**
 * React Native runs on Hermes, which has no `globalThis.crypto`. Node has one, which is why every
 * test passed while the first run crashed on the phone. This takes the global away for the length
 * of one case and puts it back, so the seal is measured against the runtime she actually holds.
 */
async function onARuntimeWithNoGlobalCrypto<T>(run: () => T | Promise<T>): Promise<T> {
  const held = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Reflect.deleteProperty(globalThis, 'crypto');
  try {
    return await run();
  } finally {
    if (held !== undefined) {
      Object.defineProperty(globalThis, 'crypto', held);
    }
  }
}

describe('the day vault', () => {
  describe('on a runtime that has no generator of its own', () => {
    it('seals her day with the source it was given, and opens it again', async () => {
      const record = aDayRecord();
      const vault = dayVault(aVaultKey(), herRandom);

      const opened = await onARuntimeWithNoGlobalCrypto(() => vault.open(vault.seal(record)));

      expect(opened).toEqual(record);
    });

    it('refuses rather than sealing under a weak nonce when the source it holds has nothing to draw from', async () => {
      const vault = dayVault(aVaultKey(), systemRandom);

      const refusal = await onARuntimeWithNoGlobalCrypto(() => {
        try {
          vault.seal(aDayRecord());
        } catch (error: unknown) {
          return error;
        }

        return undefined;
      });

      expect(refusal).toBeInstanceOf(EnvelopeError);
      expect((refusal as EnvelopeError).refusal).toBe('random-source-is-missing');
    });
  });
});
