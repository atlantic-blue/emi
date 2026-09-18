import { accountIdFor, base64Of, bodyHashOf, signedHeaders } from '@emi/crypto';

import { maximumBodyBytes, register, registerAccount } from '../src/handlers/register';
import { memoryStore } from './fixtures/memoryStore';
import {
  headersFor,
  keyPairFromSeed,
  registrationBody,
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
      const shell = JSON.stringify({ publicKey: base64Of(pair.publicKey), padding: '' });
      const body = JSON.stringify({
        publicKey: base64Of(pair.publicKey),
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
});
