import { accountIdFor, base64Of, bytesFromBase64, deviceKeyLength } from '@emi/crypto';

import {
  accountIdItem,
  deviceKey,
  deviceKeyItem,
  readDeviceKey,
} from '../../src/services/sync/deviceKey';
import { fixedRandom, memorySecureStore } from '../fixtures/secureStore';

describe('the device key', () => {
  describe('making one', () => {
    it('writes thirty two bytes to the keychain and nowhere else', async () => {
      const store = memorySecureStore();

      const key = await deviceKey(store, fixedRandom(3));

      expect(key.privateKey).toHaveLength(deviceKeyLength);
      expect(store.writes().map((written) => written.key)).toEqual([deviceKeyItem, accountIdItem]);
    });

    it('derives the account identifier from the public half', async () => {
      const store = memorySecureStore();

      const key = await deviceKey(store, fixedRandom(3));

      expect(key.accountId).toBe(accountIdFor(key.publicKey));
      expect(await store.read(accountIdItem)).toBe(key.accountId);
    });

    it('writes the key as base 64, which is what the keychain holds', async () => {
      const store = memorySecureStore();

      const key = await deviceKey(store, fixedRandom(3));

      expect(await store.read(deviceKeyItem)).toBe(base64Of(key.privateKey));
    });
  });

  describe('a second call', () => {
    it('returns the key that is already there and makes no other', async () => {
      const store = memorySecureStore();

      const first = await deviceKey(store, fixedRandom(3));
      const again = await deviceKey(store, fixedRandom(99));

      expect(base64Of(again.privateKey)).toBe(base64Of(first.privateKey));
      expect(again.accountId).toBe(first.accountId);
    });

    it('writes nothing the second time, so the account cannot change underneath her', async () => {
      const store = memorySecureStore();

      await deviceKey(store, fixedRandom(3));
      await deviceKey(store, fixedRandom(99));

      expect(store.writes()).toHaveLength(2);
    });
  });

  describe('reading one back', () => {
    it('finds nothing on a phone that never made one', async () => {
      expect(await readDeviceKey(memorySecureStore())).toBeNull();
    });

    it('rebuilds the whole pair from the private half alone', async () => {
      const made = await deviceKey(memorySecureStore(), fixedRandom(3));
      const reinstalled = memorySecureStore({ [deviceKeyItem]: base64Of(made.privateKey) });

      const read = await readDeviceKey(reinstalled);

      expect(read && base64Of(read.publicKey)).toBe(base64Of(made.publicKey));
      expect(read?.accountId).toBe(made.accountId);
    });

    it('reads a key the keychain kept through a reinstall, which is why it is kept there', async () => {
      const made = await deviceKey(memorySecureStore(), fixedRandom(3));
      const survived = memorySecureStore({ [deviceKeyItem]: base64Of(made.privateKey) });

      const read = await readDeviceKey(survived);

      expect(read && bytesFromBase64(base64Of(read.privateKey))).toEqual(made.privateKey);
    });
  });
});
