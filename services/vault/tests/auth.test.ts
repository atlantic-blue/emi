import { accountIdFor, instantWindowSeconds } from '@emi/crypto';

import { accountIdContextKey, authorizeRequest, authorizer } from '../src/auth/authorizer';
import { refused } from '../src/api';
import { memoryStore } from './fixtures/memoryStore';
import {
  anAccount,
  authorizerEvent,
  headersFor,
  keyPairFromSeed,
  signedRequest,
} from './fixtures/requests';

const pair = keyPairFromSeed(3);
const stranger = keyPairFromSeed(101);
const signedAt = new Date('2026-09-18T10:00:00.000Z');
const parts = { method: 'GET', path: '/v1/records', instant: signedAt };

async function storeHolding(...pairs: { publicKey: Uint8Array }[]) {
  const store = memoryStore();

  for (const held of pairs) {
    await store.createAccount(anAccount(held, signedAt));
  }

  return store;
}

function median(times: number[]): number {
  const sorted = [...times].sort((first, second) => first - second);

  return sorted[Math.floor(sorted.length / 2)] as number;
}

describe('the request signature, which is contract AUTH-1', () => {
  describe('a request she signed', () => {
    it('is let through, and the account travels on to the function', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(pair, parts);

      const answer = await authorizeRequest(forAuthorizer, store, signedAt);

      expect(answer.isAuthorized).toBe(true);
      expect(answer.context?.[accountIdContextKey]).toBe(accountIdFor(pair.publicKey));
    });

    it('carries nothing but the account through to the function', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(pair, parts);

      const answer = await authorizeRequest(forAuthorizer, store, signedAt);

      expect(Object.keys(answer.context ?? {})).toEqual([accountIdContextKey]);
    });

    it('is let through when it carries a query string it signed', async () => {
      const store = await storeHolding(pair);
      const withCursor = { ...parts, path: '/v1/records?after=2026-09-01T00%3A00%3A00.000Z' };

      const answer = await authorizeRequest(
        signedRequest(pair, withCursor).forAuthorizer,
        store,
        signedAt,
      );

      expect(answer.isAuthorized).toBe(true);
    });

    it('reads the clock itself when it is bound to the api', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(pair, parts);

      const answer = await authorizer(store, () => signedAt)(forAuthorizer);

      expect(answer.isAuthorized).toBe(true);
    });
  });

  describe('a replayed request', () => {
    it('is refused the second time the same signature arrives', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(pair, parts);

      const first = await authorizeRequest(forAuthorizer, store, signedAt);
      const second = await authorizeRequest(forAuthorizer, store, signedAt);

      expect(first.isAuthorized).toBe(true);
      expect(second).toEqual(refused);
    });

    it('is refused however many times it arrives', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(pair, parts);

      await authorizeRequest(forAuthorizer, store, signedAt);
      const later = await Promise.all([
        authorizeRequest(forAuthorizer, store, signedAt),
        authorizeRequest(forAuthorizer, store, signedAt),
      ]);

      expect(later.map((answer) => answer.isAuthorized)).toEqual([false, false]);
    });

    it('leaves the signature written down, so the refusal survives a cold function', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer, headers } = signedRequest(pair, parts);

      await authorizeRequest(forAuthorizer, store, signedAt);

      expect(store.keys()).toContain(
        `ACC#${accountIdFor(pair.publicKey)}|SIG#${headers['emi-signature']}`,
      );
    });

    it('writes it down under her own account and under nobody else', async () => {
      const store = await storeHolding(pair, stranger);
      const { forAuthorizer } = signedRequest(pair, parts);

      await authorizeRequest(forAuthorizer, store, signedAt);

      expect(store.keys().filter((key) => key.includes('SIG#'))).toHaveLength(1);
    });

    it('does not let a fresh signature for the same request through twice', async () => {
      const store = await storeHolding(pair);
      const first = signedRequest(pair, parts);
      const again = signedRequest(pair, { ...parts, instant: new Date(signedAt.getTime() + 1000) });

      expect((await authorizeRequest(first.forAuthorizer, store, signedAt)).isAuthorized).toBe(
        true,
      );
      expect((await authorizeRequest(again.forAuthorizer, store, signedAt)).isAuthorized).toBe(
        true,
      );
      expect((await authorizeRequest(again.forAuthorizer, store, signedAt)).isAuthorized).toBe(
        false,
      );
    });

    it('remembers it for at least as long as the window it can be replayed in', async () => {
      const store = await storeHolding(pair);
      const remembered = await store.rememberSignature('X', 'a signature', 0);

      expect(remembered).toBe('remembered');
      expect(await store.rememberSignature('X', 'a signature', 0)).toBe('seen-before');
      expect(instantWindowSeconds).toBe(300);
    });
  });

  describe('a request she did not sign', () => {
    it('is refused when another key holder signed it', async () => {
      const store = await storeHolding(pair);
      const headers = {
        ...headersFor(stranger, parts),
        'emi-account': accountIdFor(pair.publicKey),
      };

      expect(await authorizeRequest(authorizerEvent(parts, headers), store, signedAt)).toEqual(
        refused,
      );
    });

    it('is refused when the signature is for another path', async () => {
      const store = await storeHolding(pair);
      const headers = headersFor(pair, { ...parts, path: '/v1/account' });

      expect(await authorizeRequest(authorizerEvent(parts, headers), store, signedAt)).toEqual(
        refused,
      );
    });

    it('is refused when the signature is for another method', async () => {
      const store = await storeHolding(pair);
      const headers = headersFor(pair, { ...parts, method: 'DELETE' });

      expect(await authorizeRequest(authorizerEvent(parts, headers), store, signedAt)).toEqual(
        refused,
      );
    });

    it('is refused when the query string was changed after it was signed', async () => {
      const store = await storeHolding(pair);
      const headers = headersFor(pair, { ...parts, path: '/v1/records?after=a' });
      const moved = { ...parts, path: '/v1/records?after=b' };

      expect(await authorizeRequest(authorizerEvent(moved, headers), store, signedAt)).toEqual(
        refused,
      );
    });

    it.each(['emi-account', 'emi-instant', 'emi-signature', 'emi-body-sha256'])(
      'is refused when %s is missing',
      async (missing) => {
        const store = await storeHolding(pair);
        const headers: Record<string, string> = { ...headersFor(pair, parts) };
        delete headers[missing];

        expect(await authorizeRequest(authorizerEvent(parts, headers), store, signedAt)).toEqual(
          refused,
        );
      },
    );

    it('writes nothing down when it is refused', async () => {
      const store = await storeHolding(pair);
      const headers = headersFor(stranger, parts);

      await authorizeRequest(authorizerEvent(parts, headers), store, signedAt);

      expect(store.keys().filter((key) => key.includes('SIG#'))).toEqual([]);
    });
  });

  describe('a request signed too long ago', () => {
    const window = instantWindowSeconds * 1000;

    it('is let through at the edge of the window', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(pair, parts);

      const answer = await authorizeRequest(
        forAuthorizer,
        store,
        new Date(signedAt.getTime() + window),
      );

      expect(answer.isAuthorized).toBe(true);
    });

    it('is refused one second past it', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(pair, parts);

      expect(
        await authorizeRequest(forAuthorizer, store, new Date(signedAt.getTime() + window + 1000)),
      ).toEqual(refused);
    });

    it('is refused when it is signed for a moment that has not come', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(pair, parts);

      expect(
        await authorizeRequest(forAuthorizer, store, new Date(signedAt.getTime() - window - 1000)),
      ).toEqual(refused);
    });

    it('is refused when the instant is not an instant', async () => {
      const store = await storeHolding(pair);
      const headers = { ...headersFor(pair, parts), 'emi-instant': 'yesterday' };

      expect(await authorizeRequest(authorizerEvent(parts, headers), store, signedAt)).toEqual(
        refused,
      );
    });
  });

  describe('an account that does not exist', () => {
    it('is refused', async () => {
      const store = await storeHolding(pair);
      const { forAuthorizer } = signedRequest(stranger, parts);

      expect(await authorizeRequest(forAuthorizer, store, signedAt)).toEqual(refused);
    });

    it('is told exactly what a bad signature is told, to the letter', async () => {
      const store = await storeHolding(pair);
      const unknown = await authorizeRequest(
        signedRequest(stranger, parts).forAuthorizer,
        store,
        signedAt,
      );
      const badSignature = await authorizeRequest(
        authorizerEvent(parts, {
          ...headersFor(stranger, parts),
          'emi-account': accountIdFor(pair.publicKey),
        }),
        store,
        signedAt,
      );

      expect(JSON.stringify(unknown)).toBe(JSON.stringify(badSignature));
    });

    it('takes a comparable time, so the answer is no index of who holds an account', async () => {
      const store = await storeHolding(pair);
      const unknownAccount = signedRequest(stranger, parts).forAuthorizer;
      const badSignature = authorizerEvent(parts, {
        ...headersFor(stranger, parts),
        'emi-account': accountIdFor(pair.publicKey),
      });

      const unknownTimes: number[] = [];
      const badTimes: number[] = [];

      for (let round = 0; round < 60; round += 1) {
        const beforeUnknown = performance.now();
        await authorizeRequest(unknownAccount, store, signedAt);
        unknownTimes.push(performance.now() - beforeUnknown);

        const beforeBad = performance.now();
        await authorizeRequest(badSignature, store, signedAt);
        badTimes.push(performance.now() - beforeBad);
      }

      const ratio = median(unknownTimes) / median(badTimes);

      // Verifying against the decoy key is what buys this. Without it the unknown account answers
      // before any Ed25519 arithmetic runs, and the two medians separate by a factor of a hundred.
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2);
    });
  });
});
