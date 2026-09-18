import { accountIdFor, base64Of } from '@emi/crypto';

import type { AuthorizerEvent, HttpRequestEvent } from '../../../../services/vault/src/api';
import { authorizeRequest } from '../../../../services/vault/src/auth/authorizer';
import { registerAccount } from '../../../../services/vault/src/handlers/register';
import type { AccountStore } from '../../../../services/vault/src/store/accounts';
import { memoryStore } from '../../../../services/vault/tests/fixtures/memoryStore';
import { deviceKey, type DeviceKey } from '../../src/services/sync/deviceKey';
import { signRequestHeaders } from '../../src/services/sync/sign';
import { fixedRandom, memorySecureStore } from '../fixtures/secureStore';

/**
 * The phone signs, the api carries, the service answers. The api is what sits between them here,
 * and the two shapes below are the two it sends: the function receives the body and the authorizer
 * does not.
 */
function carriedToTheFunction(
  method: string,
  path: string,
  body: string,
  headers: Readonly<Record<string, string>>,
): HttpRequestEvent {
  const [rawPath, rawQueryString] = path.split('?');

  return {
    rawPath: rawPath ?? path,
    rawQueryString: rawQueryString ?? '',
    headers,
    requestContext: { http: { method } },
    body,
    isBase64Encoded: false,
  };
}

function carriedToTheAuthorizer(
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
): AuthorizerEvent {
  const event = carriedToTheFunction(method, path, '', headers);

  return {
    rawPath: event.rawPath,
    rawQueryString: event.rawQueryString,
    headers: event.headers,
    requestContext: event.requestContext,
  };
}

const firstLaunch = new Date('2026-09-18T10:00:00.000Z');

async function phoneOpenedFor(seed: number): Promise<DeviceKey> {
  return deviceKey(memorySecureStore(), fixedRandom(seed));
}

async function registered(store: AccountStore, key: DeviceKey, at: Date) {
  const body = JSON.stringify({ publicKey: base64Of(key.publicKey) });
  const headers = signRequestHeaders(key, { method: 'POST', path: '/v1/accounts', body }, at);

  return registerAccount(carriedToTheFunction('POST', '/v1/accounts', body, headers), store, at);
}

function pullHeaders(key: DeviceKey, at: Date) {
  return signRequestHeaders(key, { method: 'GET', path: '/v1/records' }, at);
}

function median(times: number[]): number {
  const sorted = [...times].sort((first, second) => first - second);

  return sorted[Math.floor(sorted.length / 2)] as number;
}

describe('a replayed request is refused', () => {
  describe('she opens Emi and the phone makes her an account', () => {
    it('registers the key the phone made, and the server gives back the identifier it derived', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);

      const response = await registered(store, key, firstLaunch);

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({ accountId: key.accountId });
      expect(key.accountId).toBe(accountIdFor(key.publicKey));
    });

    it('leaves the server holding her public key and nothing else about her', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);

      await registered(store, key, firstLaunch);
      const held = await store.readAccount(key.accountId);

      expect(held && base64Of(held.publicKey)).toBe(base64Of(key.publicKey));
      expect(JSON.stringify(held)).not.toContain('@');
    });

    it('asks her for no email address and no password to get there', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);
      const body = JSON.stringify({ publicKey: base64Of(key.publicKey) });

      await registered(store, key, firstLaunch);

      expect(Object.keys(JSON.parse(body) as Record<string, string>)).toEqual(['publicKey']);
    });
  });

  describe('the request she signs next', () => {
    it('is let through, and the account reaches the function with it', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);
      await registered(store, key, firstLaunch);

      const answer = await authorizeRequest(
        carriedToTheAuthorizer('GET', '/v1/records', pullHeaders(key, firstLaunch)),
        store,
        firstLaunch,
      );

      expect(answer).toEqual({ isAuthorized: true, context: { accountId: key.accountId } });
    });
  });

  describe('the same request captured and sent again', () => {
    it('is refused the second time it arrives', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);
      await registered(store, key, firstLaunch);
      const captured = carriedToTheAuthorizer('GET', '/v1/records', pullHeaders(key, firstLaunch));

      const first = await authorizeRequest(captured, store, firstLaunch);
      const replayed = await authorizeRequest(captured, store, firstLaunch);

      expect(first.isAuthorized).toBe(true);
      expect(replayed).toEqual({ isAuthorized: false });
    });

    it('is refused inside the window, where the instant alone would still let it through', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);
      await registered(store, key, firstLaunch);
      const captured = carriedToTheAuthorizer('GET', '/v1/records', pullHeaders(key, firstLaunch));
      const aMinuteLater = new Date(firstLaunch.getTime() + 60 * 1000);

      await authorizeRequest(captured, store, firstLaunch);

      expect(await authorizeRequest(captured, store, aMinuteLater)).toEqual({
        isAuthorized: false,
      });
    });

    it('leaves her own next request working, so a refusal is no lock out', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);
      await registered(store, key, firstLaunch);
      const captured = carriedToTheAuthorizer('GET', '/v1/records', pullHeaders(key, firstLaunch));
      const aMinuteLater = new Date(firstLaunch.getTime() + 60 * 1000);

      await authorizeRequest(captured, store, firstLaunch);
      await authorizeRequest(captured, store, aMinuteLater);
      const fresh = carriedToTheAuthorizer('GET', '/v1/records', pullHeaders(key, aMinuteLater));

      expect((await authorizeRequest(fresh, store, aMinuteLater)).isAuthorized).toBe(true);
    });

    it('refuses a replayed registration too, which has no authorizer in front of it', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);

      const first = await registered(store, key, firstLaunch);
      const body = JSON.stringify({ publicKey: base64Of(key.publicKey) });
      const captured = carriedToTheFunction(
        'POST',
        '/v1/accounts',
        body,
        signRequestHeaders(key, { method: 'POST', path: '/v1/accounts', body }, firstLaunch),
      );
      const replayed = await registerAccount(captured, store, firstLaunch);

      expect(first.statusCode).toBe(201);
      expect(replayed.statusCode).toBe(403);
      expect(JSON.parse(replayed.body)).toEqual({ error: 'the signature does not verify' });
    });
  });

  describe('a request she did not sign', () => {
    it('is refused when another phone signed it', async () => {
      const store = memoryStore();
      const hers = await phoneOpenedFor(3);
      const another = await phoneOpenedFor(101);
      await registered(store, hers, firstLaunch);

      const headers = { ...pullHeaders(another, firstLaunch), 'emi-account': hers.accountId };

      expect(
        await authorizeRequest(
          carriedToTheAuthorizer('GET', '/v1/records', headers),
          store,
          firstLaunch,
        ),
      ).toEqual({ isAuthorized: false });
    });

    it('is refused when it was signed more than five minutes ago', async () => {
      const store = memoryStore();
      const key = await phoneOpenedFor(3);
      await registered(store, key, firstLaunch);
      const stale = carriedToTheAuthorizer('GET', '/v1/records', pullHeaders(key, firstLaunch));

      expect(
        await authorizeRequest(stale, store, new Date(firstLaunch.getTime() + 301 * 1000)),
      ).toEqual({ isAuthorized: false });
    });

    it('is refused for an account nobody registered, in words nobody can tell apart', async () => {
      const store = memoryStore();
      const hers = await phoneOpenedFor(3);
      const never = await phoneOpenedFor(202);
      await registered(store, hers, firstLaunch);

      const unknown = await authorizeRequest(
        carriedToTheAuthorizer('GET', '/v1/records', pullHeaders(never, firstLaunch)),
        store,
        firstLaunch,
      );
      const badSignature = await authorizeRequest(
        carriedToTheAuthorizer('GET', '/v1/records', {
          ...pullHeaders(never, firstLaunch),
          'emi-account': hers.accountId,
        }),
        store,
        firstLaunch,
      );

      expect(JSON.stringify(unknown)).toBe(JSON.stringify(badSignature));
    });

    it('takes a comparable time either way, so nobody can ask which accounts exist', async () => {
      const store = memoryStore();
      const hers = await phoneOpenedFor(3);
      const never = await phoneOpenedFor(202);
      await registered(store, hers, firstLaunch);

      const unknownAccount = carriedToTheAuthorizer(
        'GET',
        '/v1/records',
        pullHeaders(never, firstLaunch),
      );
      const badSignature = carriedToTheAuthorizer('GET', '/v1/records', {
        ...pullHeaders(never, firstLaunch),
        'emi-account': hers.accountId,
      });

      const unknownTimes: number[] = [];
      const badTimes: number[] = [];

      for (let round = 0; round < 60; round += 1) {
        const beforeUnknown = performance.now();
        await authorizeRequest(unknownAccount, store, firstLaunch);
        unknownTimes.push(performance.now() - beforeUnknown);

        const beforeBad = performance.now();
        await authorizeRequest(badSignature, store, firstLaunch);
        badTimes.push(performance.now() - beforeBad);
      }

      const ratio = median(unknownTimes) / median(badTimes);

      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2);
    });
  });
});
