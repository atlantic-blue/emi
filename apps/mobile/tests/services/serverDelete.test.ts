import { base64Of, presentedSignatureIn, signatureVerifies } from '@emi/crypto';

import {
  accountPath,
  deleteTheServerAccount,
  serverDeleteMilliseconds,
  type SendRequest,
  type VaultRequest,
} from '../../src/services/sync/deleteAccount';
import { deviceKey, deviceKeyItem } from '../../src/services/sync/deviceKey';
import { vaultAddress, vaultAddressVariable } from '../../src/services/sync/vaultAddress';
import { fixedRandom, memorySecureStore } from '../fixtures/secureStore';

/**
 * The phone's half of contract WIRE-4: one signed request, and an honest reading of what came back.
 *
 * The signature is checked here with the verifier the service uses, so the request these cases
 * describe is a request the authorizer would let through rather than one that merely has four
 * headers on it.
 */

const now = new Date('2026-09-18T10:05:00.000Z');
const address = 'https://vault.emi.test';

interface Sent {
  readonly requests: VaultRequest[];
  readonly send: SendRequest;
}

function aVaultAnswering(status: number): Sent {
  const requests: VaultRequest[] = [];

  return {
    requests,
    send: (request) => {
      requests.push(request);

      return Promise.resolve({ status });
    },
  };
}

async function herPhone(privateKeySeed = 5) {
  const keychain = memorySecureStore();
  const key = await deviceKey(keychain, fixedRandom(privateKeySeed));

  return { keychain, key };
}

describe('the delete the phone sends to the vault', () => {
  describe('the request it makes', () => {
    it('goes to the account path on the address the build carries', async () => {
      const { keychain } = await herPhone();
      const vault = aVaultAnswering(200);

      await deleteTheServerAccount(keychain, vault.send, now, address);

      expect(vault.requests).toHaveLength(1);
      expect(vault.requests[0]?.url).toBe(`${address}/v1/account`);
      expect(vault.requests[0]?.method).toBe('DELETE');
    });

    it('carries a signature the service verifies, over that method and that path', async () => {
      const { keychain, key } = await herPhone();
      const vault = aVaultAnswering(200);

      await deleteTheServerAccount(keychain, vault.send, now, address);

      const presented = presentedSignatureIn(vault.requests[0]?.headers ?? {});

      expect(presented?.accountId).toBe(key.accountId);
      expect(presented?.instant).toBe(now.toISOString());
      expect(signatureVerifies(presented as never, 'DELETE', accountPath, key.publicKey)).toBe(
        true,
      );
    });

    it('signs the digest of an empty body, because it carries nothing else', async () => {
      const { keychain, key } = await herPhone();
      const vault = aVaultAnswering(200);

      await deleteTheServerAccount(keychain, vault.send, now, address);

      const presented = presentedSignatureIn(vault.requests[0]?.headers ?? {});

      expect(signatureVerifies(presented as never, 'DELETE', accountPath, key.publicKey)).toBe(
        true,
      );
      expect(Object.keys(vault.requests[0] ?? {})).toEqual(['url', 'method', 'headers']);
    });

    it('leaves one slash between the address and the path when the address ends in one', async () => {
      const { keychain } = await herPhone();
      const vault = aVaultAnswering(200);

      await deleteTheServerAccount(keychain, vault.send, now, `${address}/`);

      expect(vault.requests[0]?.url).toBe(`${address}/v1/account`);
    });
  });

  describe('what it reads back', () => {
    it('is gone when the vault answers that it deleted the account', async () => {
      const { keychain } = await herPhone();

      expect(await deleteTheServerAccount(keychain, aVaultAnswering(200).send, now, address)).toBe(
        'gone',
      );
    });

    it('is not reached on a refusal, because a refusal cannot be told from a stale clock', async () => {
      const { keychain } = await herPhone();

      expect(await deleteTheServerAccount(keychain, aVaultAnswering(403).send, now, address)).toBe(
        'not-reached',
      );
    });

    it('is not reached on a fault at the far end', async () => {
      const { keychain } = await herPhone();

      expect(await deleteTheServerAccount(keychain, aVaultAnswering(500).send, now, address)).toBe(
        'not-reached',
      );
    });

    it('is not reached when the request itself raises', async () => {
      const { keychain } = await herPhone();
      const send: SendRequest = () => Promise.reject(new Error('there is no network here'));

      expect(await deleteTheServerAccount(keychain, send, now, address)).toBe('not-reached');
    });
  });

  describe('a phone with nothing on a server to delete', () => {
    it('sends no request at all when the build carries no address', async () => {
      const { keychain } = await herPhone();
      const vault = aVaultAnswering(200);

      expect(await deleteTheServerAccount(keychain, vault.send, now, null)).toBe('no-account');
      expect(vault.requests).toEqual([]);
    });

    it('sends no request at all when this phone holds no key to sign with', async () => {
      const vault = aVaultAnswering(200);

      expect(await deleteTheServerAccount(memorySecureStore(), vault.send, now, address)).toBe(
        'no-account',
      );
      expect(vault.requests).toEqual([]);
    });
  });

  describe('a vault that never answers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('is not reached once the wait is over, rather than holding the screen for ever', async () => {
      const { keychain } = await herPhone();
      const never: SendRequest = () => new Promise(() => undefined);
      const asking = deleteTheServerAccount(keychain, never, now, address);

      await jest.advanceTimersByTimeAsync(serverDeleteMilliseconds + 1);

      expect(await asking).toBe('not-reached');
    });

    it('waits eight seconds, which is under the ten the api gives the function', () => {
      expect(serverDeleteMilliseconds).toBe(8000);
    });
  });

  describe('the address the build carries', () => {
    it('has any trailing slash taken off it', () => {
      expect(vaultAddress(`${address}//`)).toBe(address);
    });

    it('is nothing at all when the build carries none, or carries an empty one', () => {
      expect(vaultAddress(undefined)).toBeNull();
      expect(vaultAddress('   ')).toBeNull();
    });

    it('names the variable the bundler replaces, which the source spells out to be replaced', () => {
      expect(vaultAddressVariable).toBe('EXPO_PUBLIC_EMI_VAULT_URL');
    });
  });

  describe('the key it signs with', () => {
    it('is the one already in the keychain, never a second one made to delete with', async () => {
      const { keychain, key } = await herPhone();
      const before = keychain.items()[deviceKeyItem];

      await deleteTheServerAccount(keychain, aVaultAnswering(200).send, now, address);

      expect(keychain.items()[deviceKeyItem]).toBe(before);
      expect(before).toBe(base64Of(key.privateKey));
    });
  });
});
