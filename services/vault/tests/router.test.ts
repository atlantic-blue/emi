import { accountIdFor, base64Of, sealRecord } from '@emi/crypto';

import { nothingAnswersThatPath, routeKeyOf, router } from '../src/router';
import { dynamoStore } from '../src/store/dynamo';
import { fakeTable, tableName } from './fixtures/dynamoTable';
import {
  anAccount,
  authorizedEvent,
  keyPairFromSeed,
  registrationBodyWithRecovery,
  signedRequest,
} from './fixtures/requests';

/**
 * One function answers four routes, so the dispatch is the thing that decides whether a request
 * reaches the handler that owes it an answer. Each case drives a whole request and reads the answer
 * the caller is left with, rather than reading which handler was picked.
 */

const pair = keyPairFromSeed(11);
const accountId = accountIdFor(pair.publicKey);
const vaultKey = new Uint8Array(32).fill(5);
const recordId = '019826c2-4d00-7a1b-8c3d-0f1e2a3b4c5d';
const now = new Date('2026-09-28T09:00:00.000Z');

function answeringStore(withAnAccount: boolean): ReturnType<typeof dynamoStore> {
  const store = dynamoStore(fakeTable(), tableName);

  if (withAnAccount) {
    void store.createAccount(anAccount(pair, now));
  }

  return store;
}

function answering(withAnAccount = true): ReturnType<typeof router> {
  return router(answeringStore(withAnAccount), () => now);
}

function aSealedRecord(): string {
  const payload = sealRecord(
    { day: '2026-09-28', flow: 'light', recordedAt: now.toISOString() },
    vaultKey,
    { random: (count) => new Uint8Array(count).fill(4) },
  );

  return JSON.stringify({ revision: 1, payload: base64Of(payload) });
}

function errorIn(body: string): string {
  return (JSON.parse(body) as { error?: string }).error ?? '';
}

describe('one function answers the four signed routes and refuses every other path', () => {
  describe('the route a request reaches', () => {
    it('registers an account on a post to the accounts path', async () => {
      const body = registrationBodyWithRecovery(pair);
      const { event } = signedRequest(pair, {
        method: 'POST',
        path: '/v1/accounts',
        body,
        instant: now,
      });

      const answer = await answering(false)(event);

      expect(answer.statusCode).toBe(201);
      expect(JSON.parse(answer.body)).toMatchObject({ accountId });
    });

    it('writes a record on a put to the path that carries its identifier', async () => {
      const body = aSealedRecord();
      const { event } = signedRequest(pair, {
        method: 'PUT',
        path: `/v1/records/${recordId}`,
        body,
        instant: now,
      });

      const answer = await answering()(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(200);
      expect(JSON.parse(answer.body)).toMatchObject({ revision: 1 });
    });

    it('answers a page of records on a get of the records path', async () => {
      const { event } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/records',
        instant: now,
      });

      const answer = await answering()(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(200);
      expect(JSON.parse(answer.body)).toMatchObject({ records: [] });
    });

    it('removes everything on a delete of the account path', async () => {
      const { event } = signedRequest(pair, {
        method: 'DELETE',
        path: '/v1/account',
        instant: now,
      });

      const answer = await answering()(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(200);
      expect(JSON.parse(answer.body)).toMatchObject({ deleted: true });
    });
  });

  describe('a path this service does not handle', () => {
    it('is answered 404, which is what the sign in route gets until it has a function', async () => {
      const { event } = signedRequest(pair, {
        method: 'POST',
        path: '/v1/sign-in/telegram',
        body: '{}',
        instant: now,
      });

      const answer = await answering()(event);

      expect(answer.statusCode).toBe(404);
      expect(errorIn(answer.body)).toBe(nothingAnswersThatPath);
    });

    it('is answered 404 when the method is one no route carries', async () => {
      const { event } = signedRequest(pair, {
        method: 'DELETE',
        path: '/v1/records',
        instant: now,
      });

      const answer = await answering()(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(404);
    });

    it('names no route and no method in the refusal, so a caller learns nothing from it', async () => {
      const { event } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/accounts',
        instant: now,
      });

      const answer = await answering()(event);

      expect(answer.body).not.toContain('/v1/');
      expect(answer.body).not.toContain('GET');
    });

    it('reaches no store at all, so an unknown path costs no read of the table', async () => {
      const table = fakeTable();
      const { event } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/nothing',
        instant: now,
      });

      await router(dynamoStore(table, tableName), () => now)(event);

      expect(table.calls()).toMatchObject({ getItem: 0, putItem: 0, query: 0 });
    });
  });

  describe('the key one request is looked up by', () => {
    it('keeps the identifier of a record out of the key, so every write finds one route', () => {
      const { event } = signedRequest(pair, {
        method: 'PUT',
        path: `/v1/records/${recordId}`,
        body: aSealedRecord(),
        instant: now,
      });

      expect(routeKeyOf(event)).toBe('PUT /v1/records/');
      expect(routeKeyOf(event)).not.toContain(recordId);
    });

    it('reads the method as the signing string writes it, which is uppercase', () => {
      const { event } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/records',
        instant: now,
      });

      expect(routeKeyOf({ ...event, requestContext: { http: { method: 'get' } } })).toBe(
        'GET /v1/records',
      );
    });
  });
});
