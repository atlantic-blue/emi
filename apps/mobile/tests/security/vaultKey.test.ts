import { base64Of, keyLength, type RandomSource } from '@emi/crypto';

import {
  invalidItemMessage,
  keychainItemShape,
  keychainOptions,
} from '../../src/services/vault/keychain';
import {
  createVaultKey,
  readVaultKey,
  vaultKey,
  VaultKeyError,
  vaultKeyItem,
} from '../../src/services/vault/vaultKey';
import { ensureValidKey, resetExpoSecureStore, WHEN_UNLOCKED } from '../fixtures/expoSecureStore';
import { fixedRandom, memorySecureStore } from '../fixtures/secureStore';

jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));

const thirtyTwoRandomBytes = fixedRandom(11);

function refusalOf(run: () => Promise<unknown>): Promise<VaultKeyError> {
  return run().then(
    () => {
      throw new Error('the key was made and a refusal was expected');
    },
    (error: unknown) => {
      if (error instanceof VaultKeyError) {
        return error;
      }

      throw error;
    },
  );
}

describe('the vault key', () => {
  beforeEach(() => {
    resetExpoSecureStore();
  });

  describe('making one', () => {
    it('writes thirty two bytes to the keychain and nowhere else', async () => {
      const store = memorySecureStore();

      const key = await createVaultKey(store, thirtyTwoRandomBytes);

      expect(key).toHaveLength(keyLength);
      expect(store.writes().map((written) => written.key)).toEqual([vaultKeyItem]);
    });

    it('writes it as base 64, which is what the keychain holds', async () => {
      const store = memorySecureStore();

      const key = await createVaultKey(store, thirtyTwoRandomBytes);

      expect(await store.read(vaultKeyItem)).toBe(base64Of(key));
    });

    it('names the item the design names, and the platform accepts that name', () => {
      expect(vaultKeyItem).toBe('emi.vaultKey.v1');
      expect(() => {
        ensureValidKey(vaultKeyItem);
      }).not.toThrow();
    });

    it('refuses a source that returns the wrong number of bytes', async () => {
      const short: RandomSource = () => new Uint8Array(16);

      const refusal = await refusalOf(() => createVaultKey(memorySecureStore(), short));

      expect(refusal.refusal).toBe('random-source-is-the-wrong-length');
    });

    it('refuses a source that returns nothing but zeroes, which is a source that is not running', async () => {
      const stopped: RandomSource = (byteCount) => new Uint8Array(byteCount);

      const refusal = await refusalOf(() => createVaultKey(memorySecureStore(), stopped));

      expect(refusal.refusal).toBe('random-source-returned-zeroes');
    });

    it('writes nothing when it refuses, so a failed first run leaves no half a key behind', async () => {
      const store = memorySecureStore();
      const stopped: RandomSource = (byteCount) => new Uint8Array(byteCount);

      await refusalOf(() => createVaultKey(store, stopped));

      expect(store.writes()).toEqual([]);
      expect(await store.read(vaultKeyItem)).toBeNull();
    });
  });

  describe('a second creation while one exists', () => {
    it('is refused', async () => {
      const store = memorySecureStore();
      await createVaultKey(store, fixedRandom(1));

      const refusal = await refusalOf(() => createVaultKey(store, fixedRandom(2)));

      expect(refusal.refusal).toBe('vault-key-already-exists');
    });

    it('leaves the first key exactly where it was, because every day she wrote is sealed under it', async () => {
      const store = memorySecureStore();
      const first = await createVaultKey(store, fixedRandom(1));

      await refusalOf(() => createVaultKey(store, fixedRandom(2)));

      expect(await readVaultKey(store)).toEqual(first);
      expect(store.writes()).toHaveLength(1);
    });
  });

  describe('reading one back', () => {
    it('finds nothing on a phone that never made one', async () => {
      expect(await readVaultKey(memorySecureStore())).toBeNull();
    });

    it('reads the key from the keychain, byte for byte', async () => {
      const store = memorySecureStore();
      const made = await createVaultKey(store, thirtyTwoRandomBytes);

      expect(await readVaultKey(store)).toEqual(made);
    });

    it('reads a key the keychain kept through a reinstall, which is why it is kept there', async () => {
      const made = await createVaultKey(memorySecureStore(), thirtyTwoRandomBytes);
      const afterTheReinstall = memorySecureStore({ [vaultKeyItem]: base64Of(made) });

      expect(await readVaultKey(afterTheReinstall)).toEqual(made);
    });

    it('refuses an item of the wrong length rather than reading it as nothing', async () => {
      const store = memorySecureStore({ [vaultKeyItem]: base64Of(new Uint8Array(16).fill(9)) });

      const refusal = await refusalOf(() => readVaultKey(store));

      expect(refusal.refusal).toBe('vault-key-is-the-wrong-length');
    });

    it('refuses an item that is not base 64, and says nothing about what it read', async () => {
      const store = memorySecureStore({ [vaultKeyItem]: 'not base 64 at all' });

      const refusal = await refusalOf(() => readVaultKey(store));

      expect(refusal.refusal).toBe('vault-key-is-not-base64');
      expect(refusal.message).not.toContain('not base 64 at all');
    });
  });

  describe('the first run', () => {
    it('makes a key when the phone holds none', async () => {
      const store = memorySecureStore();

      const key = await vaultKey(store, thirtyTwoRandomBytes);

      expect(key).toHaveLength(keyLength);
      expect(await store.read(vaultKeyItem)).toBe(base64Of(key));
    });

    it('hands back the same key every run after that, and writes nothing again', async () => {
      const store = memorySecureStore();

      const first = await vaultKey(store, fixedRandom(1));
      const again = await vaultKey(store, fixedRandom(2));

      expect(again).toEqual(first);
      expect(store.writes()).toHaveLength(1);
    });
  });

  describe('what a refusal is allowed to say', () => {
    it('carries the reason and never the key, in any refusal this module raises', async () => {
      const store = memorySecureStore();
      const key = await createVaultKey(store, thirtyTwoRandomBytes);
      const written = base64Of(key);

      const refusals = [
        await refusalOf(() => createVaultKey(store, fixedRandom(2))),
        await refusalOf(() => readVaultKey(memorySecureStore({ [vaultKeyItem]: 'not base 64' }))),
        await refusalOf(() =>
          readVaultKey(memorySecureStore({ [vaultKeyItem]: base64Of(new Uint8Array(8)) })),
        ),
      ];

      for (const refusal of refusals) {
        expect(refusal.message).not.toContain(written);
        expect(String(refusal.stack)).not.toContain(written);
        expect(JSON.stringify(refusal)).not.toContain(written);
      }
    });

    it('logs nothing at all while a key is made, read and refused', async () => {
      const said: unknown[] = [];
      const sinks = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const kept = sinks.map((sink) => [sink, console[sink]] as const);
      for (const sink of sinks) {
        console[sink] = (...parts: unknown[]) => said.push(...parts);
      }

      try {
        const store = memorySecureStore();
        await vaultKey(store, thirtyTwoRandomBytes);
        await vaultKey(store, thirtyTwoRandomBytes);
        await refusalOf(() => createVaultKey(store, fixedRandom(2)));
      } finally {
        for (const [sink, original] of kept) {
          console[sink] = original;
        }
      }

      expect(said).toEqual([]);
    });
  });

  describe('the double answers what the platform answers', () => {
    const platform = jest.requireActual<typeof import('expo-secure-store')>('expo-secure-store');
    const names = [
      vaultKeyItem,
      'emi.deviceKey.v1',
      'emi_vault-key.1',
      '',
      'emi vaultKey',
      'emi:vaultKey',
      'emi/vaultKey',
      'emi.vaultKey.v1!',
    ];

    it.each(names)('refuses or accepts "%s" the way expo-secure-store does', async (name) => {
      const fromThePlatform = await platform.getItemAsync(name).then(
        () => null,
        (error: Error) => error.message,
      );
      const fromTheDouble = await Promise.resolve()
        .then(() => {
          ensureValidKey(name);
        })
        .then(
          () => null,
          (error: Error) => error.message,
        );

      expect(fromTheDouble).toBe(fromThePlatform);
    });

    it('copied the platform rule rather than writing a looser one', () => {
      for (const name of names) {
        expect(keychainItemShape.test(name)).toBe(/^[\w.-]+$/.test(name));
      }
      expect(invalidItemMessage).toContain('Invalid key provided to SecureStore');
    });
  });

  describe('how the item is written', () => {
    it('is readable only while she has the phone unlocked', () => {
      expect(keychainOptions()).toEqual({ keychainAccessible: WHEN_UNLOCKED });
    });
  });
});
