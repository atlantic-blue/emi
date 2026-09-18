import {
  accountIdFor,
  base64Of,
  bodyHashOf,
  recoverySaltLength,
  signedHeaders,
  wrappedVaultKeyLength,
} from '@emi/crypto';

import { maximumBodyBytes, register, registerAccount } from '../src/handlers/register';
import { memoryStore } from './fixtures/memoryStore';
import {
  aRecoverySalt,
  aWrappedVaultKey,
  headersFor,
  keyPairFromSeed,
  registrationBody,
  registrationBodyWithRecovery,
  requestEvent,
  signedRequest,
} from './fixtures/requests';

const pair = keyPairFromSeed(3);
const stranger = keyPairFromSeed(101);
const signedAt = new Date('2026-09-18T10:00:00.000Z');

const partsFor = (body: string, instant = signedAt) => ({
  method: 'POST',
  path: '/v1/accounts',
  body,
  instant,
});

const bodyOf = (response: { body: string }) => JSON.parse(response.body) as Record<string, string>;

describe('registering an account, which is contract WIRE-1', () => {
  describe('a public key signed by itself', () => {
    it('is registered, and she is given the identifier it derives', async () => {
      const store = memoryStore();
      const { event } = signedRequest(pair, partsFor(registrationBody(pair)));

      const response = await registerAccount(event, store, signedAt);

      expect(response.statusCode).toBe(201);
      expect(bodyOf(response).accountId).toBe(accountIdFor(pair.publicKey));
    });

    it('is written down, so the authorizer can read the key back', async () => {
      const store = memoryStore();
      const { event } = signedRequest(pair, partsFor(registrationBody(pair)));

      await registerAccount(event, store, signedAt);
      const held = await store.readAccount(accountIdFor(pair.publicKey));

      expect(held && base64Of(held.publicKey)).toBe(base64Of(pair.publicKey));
      expect(held?.createdAt).toBe(signedAt.toISOString());
      expect(held?.recordCount).toBe(0);
    });

    it('asks her for no email address, no password and no name', async () => {
      const store = memoryStore();
      const { event } = signedRequest(pair, partsFor(registrationBody(pair)));

      await registerAccount(event, store, signedAt);
      const held = await store.readAccount(accountIdFor(pair.publicKey));

      expect(Object.keys(held ?? {}).sort()).toEqual([
        'accountId',
        'createdAt',
        'publicKey',
        'recordCount',
        'recoverySalt',
        'wrappedVaultKey',
      ]);
    });

    it('reads the clock itself when it is bound to the api', async () => {
      const store = memoryStore();
      const { event } = signedRequest(pair, partsFor(registrationBody(pair)));

      expect((await register(store, () => signedAt)(event)).statusCode).toBe(201);
    });

    it('reads a body the api sent as base 64', async () => {
      const store = memoryStore();
      const body = registrationBody(pair);
      const parts = partsFor(body);
      const event = {
        ...requestEvent(parts, headersFor(pair, parts)),
        body: base64Of(new TextEncoder().encode(body)),
        isBase64Encoded: true,
      };

      expect((await registerAccount(event, store, signedAt)).statusCode).toBe(201);
    });
  });

  describe('the same key twice', () => {
    it('is refused the second time, with a fresh signature', async () => {
      const store = memoryStore();
      const body = registrationBody(pair);
      const first = signedRequest(pair, partsFor(body));
      const again = signedRequest(pair, partsFor(body, new Date(signedAt.getTime() + 1000)));

      expect((await registerAccount(first.event, store, signedAt)).statusCode).toBe(201);
      const second = await registerAccount(again.event, store, signedAt);

      expect(second.statusCode).toBe(409);
      expect(bodyOf(second).error).toBe('that public key is registered already');
    });

    it('leaves the first account exactly as it was', async () => {
      const store = memoryStore();
      const body = registrationBody(pair);
      const first = signedRequest(pair, partsFor(body));
      const again = signedRequest(pair, partsFor(body, new Date(signedAt.getTime() + 1000)));

      await registerAccount(first.event, store, signedAt);
      await registerAccount(again.event, store, new Date(signedAt.getTime() + 1000));
      const held = await store.readAccount(accountIdFor(pair.publicKey));

      expect(held?.createdAt).toBe(signedAt.toISOString());
    });

    it('is refused as a replay when the same signature arrives again', async () => {
      const store = memoryStore();
      const { event } = signedRequest(pair, partsFor(registrationBody(pair)));

      await registerAccount(event, store, signedAt);
      const second = await registerAccount(event, store, signedAt);

      expect(second.statusCode).toBe(403);
      expect(bodyOf(second).error).toBe('the signature does not verify');
    });
  });

  describe('a registration nobody signed properly', () => {
    it('is refused when the signature is over another body', async () => {
      const store = memoryStore();
      const parts = partsFor(registrationBody(pair));
      const headers = headersFor(pair, { ...parts, body: registrationBody(stranger) });

      const response = await registerAccount(requestEvent(parts, headers), store, signedAt);

      expect(response.statusCode).toBe(403);
      expect(bodyOf(response).error).toBe('the body is not the body that was signed');
    });

    it('is refused when the digest header was changed after the signing', async () => {
      const store = memoryStore();
      const parts = partsFor(registrationBody(pair));
      const headers = {
        ...headersFor(pair, parts),
        'emi-body-sha256': bodyHashOf('something else'),
      };

      expect(
        (await registerAccount(requestEvent(parts, headers), store, signedAt)).statusCode,
      ).toBe(403);
    });

    it('is refused when another key signed the key inside the body', async () => {
      const store = memoryStore();
      const body = registrationBody(pair);
      const parts = partsFor(body);
      const headers = signedHeaders(stranger, {
        method: parts.method,
        path: parts.path,
        instant: signedAt.toISOString(),
        bodyHash: bodyHashOf(body),
      });

      const response = await registerAccount(requestEvent(parts, headers), store, signedAt);

      expect(response.statusCode).toBe(403);
      expect(bodyOf(response).error).toBe('the signature does not verify');
    });

    it('registers nothing at all when it is refused', async () => {
      const store = memoryStore();
      const body = registrationBody(pair);
      const parts = partsFor(body);
      const headers = signedHeaders(stranger, {
        method: parts.method,
        path: parts.path,
        instant: signedAt.toISOString(),
        bodyHash: bodyHashOf(body),
      });

      await registerAccount(requestEvent(parts, headers), store, signedAt);

      expect(store.keys()).toEqual([]);
    });

    it.each(['emi-account', 'emi-instant', 'emi-signature', 'emi-body-sha256'])(
      'is refused when %s is missing',
      async (missing) => {
        const store = memoryStore();
        const parts = partsFor(registrationBody(pair));
        const headers: Record<string, string> = { ...headersFor(pair, parts) };
        delete headers[missing];

        const response = await registerAccount(requestEvent(parts, headers), store, signedAt);

        expect(response.statusCode).toBe(403);
        expect(bodyOf(response).error).toBe('the request carries no signature');
      },
    );

    it('is refused when it was signed more than five minutes ago', async () => {
      const store = memoryStore();
      const { event } = signedRequest(pair, partsFor(registrationBody(pair)));

      const response = await registerAccount(
        event,
        store,
        new Date(signedAt.getTime() + 301 * 1000),
      );

      expect(response.statusCode).toBe(403);
      expect(bodyOf(response).error).toBe('the request was signed too long ago');
    });
  });

  describe('a body that is not a registration', () => {
    it.each([
      ['not json at all', 'hello'],
      ['json holding no key', '{}'],
      ['a key that is not base 64', '{"publicKey":"not base 64"}'],
      ['a key of the wrong length', `{"publicKey":"${base64Of(new Uint8Array(16))}"}`],
    ])('is refused when the body is %s', async (_name, body) => {
      const store = memoryStore();
      const { event } = signedRequest(pair, partsFor(body));

      expect((await registerAccount(event, store, signedAt)).statusCode).toBe(400);
    });

    it('is refused above four kilobytes, before the body is read at all', async () => {
      const store = memoryStore();
      const padding = 'a'.repeat(maximumBodyBytes);
      const body = JSON.stringify({ publicKey: base64Of(pair.publicKey), padding });
      const { event } = signedRequest(pair, partsFor(body));

      const response = await registerAccount(event, store, signedAt);

      expect(response.statusCode).toBe(413);
      expect(bodyOf(response).error).toBe('a registration body is at most 4096 bytes');
      expect(store.keys()).toEqual([]);
    });

    it('accepts a body that sits just under the limit', async () => {
      const store = memoryStore();
      const shell = registrationBodyWithRecovery(pair, { padding: '' });
      const body = registrationBodyWithRecovery(pair, {
        padding: 'a'.repeat(maximumBodyBytes - shell.length),
      });
      const { event } = signedRequest(pair, partsFor(body));

      expect(body.length).toBe(maximumBodyBytes);
      expect((await registerAccount(event, store, signedAt)).statusCode).toBe(201);
    });

    it('measures the limit in bytes and not in characters', async () => {
      expect(maximumBodyBytes).toBe(4096);
      expect(new TextEncoder().encode('é')).toHaveLength(2);
    });
  });
  describe('the wrapped vault key and the salt she sends with it', () => {
    const wrapped = aWrappedVaultKey(pair.publicKey[0] ?? 1);
    const salt = aRecoverySalt(pair.publicKey[1] ?? 2);

    async function registeredWith(held: Readonly<Record<string, unknown>>) {
      const store = memoryStore();
      const body = registrationBodyWithRecovery(pair, held);
      const { event } = signedRequest(pair, partsFor(body));
      const response = await registerAccount(event, store, signedAt);

      return { response, store };
    }

    it('are written down byte for byte, so a second phone can ask for them back', async () => {
      const { response, store } = await registeredWith({});
      const held = await store.readAccount(accountIdFor(pair.publicKey));

      expect(response.statusCode).toBe(201);
      expect(held && base64Of(held.wrappedVaultKey)).toBe(base64Of(wrapped));
      expect(held && base64Of(held.recoverySalt)).toBe(base64Of(salt));
    });

    it('are refused when the wrapped key is missing, which would lock her out', async () => {
      const { response, store } = await registeredWith({ wrappedVaultKey: undefined });

      expect(response.statusCode).toBe(400);
      expect(store.keys()).toEqual([]);
    });

    it('are refused when the salt is missing', async () => {
      const { response, store } = await registeredWith({ recoverySalt: undefined });

      expect(response.statusCode).toBe(400);
      expect(store.keys()).toEqual([]);
    });

    it('are refused when the wrapped key is not base 64', async () => {
      const { response } = await registeredWith({ wrappedVaultKey: 'not base 64' });

      expect(response.statusCode).toBe(400);
    });

    it('are refused when the wrapped key is one byte short of a wrapped key', async () => {
      const { response } = await registeredWith({
        wrappedVaultKey: base64Of(wrapped.slice(0, -1)),
      });

      expect(response.statusCode).toBe(400);
    });

    it('are refused when the wrapped key is longer, which is where a day would hide', async () => {
      const { response } = await registeredWith({
        wrappedVaultKey: base64Of(new Uint8Array(wrappedVaultKeyLength + 32).fill(1)),
      });

      expect(response.statusCode).toBe(400);
    });

    it('are refused when the wrapped key says a version this service does not know', async () => {
      const unknown = Uint8Array.from(wrapped);
      unknown[0] = 9;

      const { response } = await registeredWith({ wrappedVaultKey: base64Of(unknown) });

      expect(response.statusCode).toBe(400);
    });

    it('are refused when the salt is not 16 bytes', async () => {
      for (const length of [15, 17, 0]) {
        const { response } = await registeredWith({
          recoverySalt: base64Of(new Uint8Array(length).fill(4)),
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('are refused when the salt is all zeroes, which every phone would share', async () => {
      const { response } = await registeredWith({
        recoverySalt: base64Of(new Uint8Array(recoverySaltLength)),
      });

      expect(response.statusCode).toBe(400);
    });

    it('say what a registration needs without ever naming a recovery code', async () => {
      const { response } = await registeredWith({ recoverySalt: undefined });

      expect(bodyOf(response).error).toBe(
        `a registration body holds a public key of 32 bytes, a wrapped vault key of ${String(wrappedVaultKeyLength)} bytes and a recovery salt of ${String(recoverySaltLength)} bytes, each as base 64`,
      );
      expect(bodyOf(response).error).not.toMatch(/recovery code|argon|derive/i);
    });

    it('are the whole of what a registration carries, so nothing of her is asked for', () => {
      const carried = Object.keys(JSON.parse(registrationBodyWithRecovery(pair)) as object).sort();

      expect(carried).toEqual(['publicKey', 'recoverySalt', 'wrappedVaultKey']);
    });
  });
});
