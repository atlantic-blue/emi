import { accountIdFor, base64Of, payerDigestFor, sealRecord } from '@emi/crypto';

import type { HttpResponse } from '../src/api';
import { accountIdContextKey, authorizeRequest } from '../src/auth/authorizer';
import { accountPath } from '../src/handlers/deleteAccount';
import { recordsPath } from '../src/handlers/pullRecords';
import { recordPathPrefix } from '../src/handlers/putRecord';
import {
  statusIsExpired,
  statusIsInBillingRetry,
  statusIsInGracePeriod,
} from '../src/payments/appStore';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import { storeSubscriptionPath } from '../src/payments/fileTransaction';
import type { StopsEveryRenewal } from '../src/payments/stopRenewals';
import { expired, gracePeriodExpired } from '../src/payments/storeEvents';
import { storeNotificationsFor, storeNotificationsPath } from '../src/payments/storeNotifications';
import {
  aSubscriptionIsNeeded,
  paymentIsRequired,
  type SaysWhetherSheMayWrite,
  saysWhetherSheMayWrite,
  theStoreStateThatCovers,
} from '../src/payments/writeGate';
import { router } from '../src/router';
import { dynamoStore, identitySortKeyPrefix, type Item, partitionFor } from '../src/store/dynamo';
import {
  aTransactionId,
  fakeAppStore,
  paidUntil,
  theCredential,
  type WhatTheStoreAnswers,
} from './fixtures/appStore';
import { aNotification, thePinnedRoots } from './fixtures/appleNotifications';
import { fakeTable, type FakeTable, tableName } from './fixtures/dynamoTable';
import { anAccount, keyPairFromSeed, signedRequest } from './fixtures/requests';

/**
 * The subscription half of contract WIRE-2, with contracts PAY-4 and WIRE-5 underneath it. A new
 * entry stops when nobody paid. A pull, an export and a delete never stop.
 *
 * Every case drives the whole api: the authorizer first, then the router, then the real store over
 * a table that refuses what the real table refuses. Apple is the one double, so the instant a
 * woman lapses from is the instant the filing route read out of Apple's own answer.
 */

const herPhone = keyPairFromSeed(31);
const herAccountId = accountIdFor(herPhone.publicKey);

const registeredAt = new Date('2026-11-24T10:00:00.000Z');
const theMinuteShePaid = new Date('2026-11-24T10:01:00.000Z');
const theMinuteAfter = new Date('2026-11-24T10:02:00.000Z');
const aYearOn = '2027-11-24T09:00:00.000Z';
/** Past the instant Apple paid her until, so the year she bought has ended. */
const afterTheLapse = new Date('2027-11-25T10:00:00.000Z');

/** The instant one minute after another, so each request of a run carries its own signature. */
const aMinuteAfter = (at: Date, minutes = 1): Date => new Date(at.getTime() + minutes * 60_000);

const firstRecord = '019826c2-4d00-7a1b-8c3d-0f1e2a3b4c5d';
const secondRecord = '019826c2-4d00-7b2c-9d4e-1f2a3b4c5d6e';
const thirdRecord = '019826c2-4d00-7c3d-ae5f-2a3b4c5d6e7f';

const herVaultKey = new Uint8Array(32).fill(11);

/** The pool a sign in on myemi.app is minted by, and the name it holds her under. */
const thePool = 'eu-central-1_o1E7nvCJ3';
const herPayerDigest = payerDigestFor(thePool, 'the-name-her-sign-in-made');

interface Answered {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

/** A page of records, as a pull and an export both read it. */
interface Pulled extends Answered {
  readonly records: readonly { readonly recordId: string; readonly revision: number }[];
  readonly cursor: string | null;
  readonly moreToCome: boolean;
}

/**
 * The api, as a signed request meets it: the authorizer, then the router, then the handler. The
 * instant is one argument for both halves, because the authorizer refuses a signature it has
 * already read, so a second request is a second instant as well.
 */
function theServer(
  table: FakeTable,
  answers: WhatTheStoreAnswers = {},
  gate?: SaysWhetherSheMayWrite,
) {
  const store = dynamoStore(table, tableName);
  const entitlements = dynamoEntitlementStore(table, tableName);
  const stopsNothing: StopsEveryRenewal = () => Promise.resolve(0);
  const answer = (at: Date) =>
    router(
      store,
      stopsNothing,
      { reaches: fakeAppStore(answers).reaches, apiKey: () => Promise.resolve(theCredential) },
      gate ?? saysWhetherSheMayWrite({ accounts: store, entitlements }),
      () => at,
    );

  return {
    store,
    entitlements,
    carry: async (method: string, path: string, body: string, at: Date): Promise<Answered> => {
      const { event, forAuthorizer } = signedRequest(herPhone, { method, path, body, instant: at });
      const allowed = await authorizeRequest(forAuthorizer, store, at);

      expect(allowed.isAuthorized).toBe(true);

      const answered: HttpResponse = await answer(at)({
        ...event,
        requestContext: {
          ...event.requestContext,
          authorizer: { lambda: { [accountIdContextKey]: allowed.context?.accountId ?? '' } },
        },
      });

      return {
        status: answered.statusCode,
        body: JSON.parse(answered.body) as Record<string, unknown>,
      };
    },
  };
}

type TheApi = ReturnType<typeof theServer>;

/** One day of hers, sealed under her own key, at the revision given. */
function aSealedDay(revision = 1): string {
  const payload = sealRecord(
    { day: '2026-11-24', flow: 'light', recordedAt: '2026-11-24T21:14:00.000Z' },
    herVaultKey,
    { random: (count) => new Uint8Array(count).fill(4) },
  );

  return JSON.stringify({ revision, payload: base64Of(payload) });
}

const writes = (api: TheApi, recordId: string, at: Date, revision = 1): Promise<Answered> =>
  api.carry('PUT', `${recordPathPrefix}${recordId}`, aSealedDay(revision), at);

const files = (api: TheApi, at: Date): Promise<Answered> =>
  api.carry('POST', storeSubscriptionPath, JSON.stringify({ transactionId: aTransactionId }), at);

async function pulls(api: TheApi, at: Date): Promise<Pulled> {
  const answered = await api.carry('GET', recordsPath, '', at);
  const read = answered.body as unknown as Omit<Pulled, keyof Answered>;

  return {
    ...answered,
    records: read.records ?? [],
    cursor: read.cursor ?? null,
    moreToCome: read.moreToCome,
  };
}

/**
 * The server half of an export, which is a pull with no cursor at all. The two files themselves
 * are written on her phone from her own database, so what the server owes an export is every
 * record it holds for her, in one answer.
 */
const exportsEverything = (api: TheApi, at: Date): Promise<Pulled> => pulls(api, at);

const deletes = (api: TheApi, at: Date): Promise<Answered> =>
  api.carry('DELETE', accountPath, '', at);

const textOf = (value: Item[string] | undefined): string =>
  value !== undefined && 'S' in value ? value.S : '';

const numberOf = (value: Item[string] | undefined): number =>
  value !== undefined && 'N' in value ? Number(value.N) : Number.NaN;

const herItems = (table: FakeTable): Item[] =>
  table.items().filter((item) => textOf(item.pk) === partitionFor(herAccountId));

const recordItems = (table: FakeTable): Item[] =>
  herItems(table).filter((item) => textOf(item.sk).startsWith('REC#'));

const accountItem = (table: FakeTable): Item =>
  herItems(table).find((item) => 'publicKey' in item) ?? {};

/**
 * The identity item a sign in on myemi.app leaves behind, which names the payment and never the
 * person. No route of this service writes one yet, so the item is written at the table itself, in
 * the shape the store reads back.
 */
function herSignInIsLinked(table: FakeTable): Promise<void> {
  return table.putItem({
    TableName: tableName,
    Item: {
      pk: { S: partitionFor(herAccountId) },
      sk: { S: `${identitySortKeyPrefix}${herPayerDigest}` },
      payerDigest: { S: herPayerDigest },
    },
  });
}

/** A card payment on myemi.app, written through the store the Stripe webhook writes through. */
async function herCardPaidUntil(api: TheApi, instant: string, at: Date): Promise<void> {
  const outcome = await api.entitlements.writeEntitlement({
    payerDigest: herPayerDigest,
    eventAt: Math.floor(at.getTime() / 1000),
    writtenAt: at.toISOString(),
    paidUntil: instant,
    route: 'card',
    state: 'active',
  });

  expect(outcome).toBe('written');
}

interface HerVault {
  readonly table: FakeTable;
  readonly api: TheApi;
}

/** Her account on the server, registered, with no payment of any kind against it. */
async function herAccount(answers: WhatTheStoreAnswers = {}): Promise<HerVault> {
  const table = fakeTable();
  const api = theServer(table, answers);

  await api.store.createAccount(anAccount(herPhone, registeredAt));

  return { table, api };
}

/**
 * The instant Apple signed the notification that ended her year, which is after the expiry and
 * before the write that meets the refusal.
 */
const whenAppleSaidItEnded = '2027-11-24T09:30:00.000Z';

/** Her account, the year bought in the App Store, and two days written while it ran. */
async function herYearAndTwoDays(): Promise<HerVault> {
  const { table, api } = await herAccount();

  expect((await files(api, theMinuteShePaid)).status).toBe(200);
  expect((await writes(api, firstRecord, theMinuteAfter)).status).toBe(200);
  expect((await writes(api, secondRecord, aMinuteAfter(theMinuteAfter))).status).toBe(200);
  expect(textOf(accountItem(table).subscribedUntil)).toBe(aYearOn);

  return { table, api };
}

/**
 * The year she bought, ended the way the server learns it: Apple signs a notification and the
 * route writes the state. A date alone does not end it, because the App Store carries a woman
 * whose card is being retried past the instant it first gave.
 */
async function herYearThenItExpired(type: string = expired): Promise<HerVault> {
  const { table, api } = await herYearAndTwoDays();

  const answered = await storeNotificationsFor(
    {
      rawPath: storeNotificationsPath,
      headers: { 'content-type': 'application/json' },
      requestContext: { http: { method: 'POST' } },
      body: aNotification({ type, notifiedAt: whenAppleSaidItEnded }),
    },
    {
      store: api.store,
      roots: thePinnedRoots,
      clock: () => new Date(whenAppleSaidItEnded),
    },
  );

  expect(answered.statusCode).toBe(200);
  expect(textOf(accountItem(table).subscriptionState)).toBe('lapsed');

  return { table, api };
}

describe('a new entry needs a subscription, and everything she already wrote stays hers', () => {
  describe('a woman who is paid up writes', () => {
    it('writes a day the minute the App Store purchase is filed', async () => {
      const { table, api } = await herAccount();

      expect((await files(api, theMinuteShePaid)).status).toBe(200);
      const written = await writes(api, firstRecord, theMinuteAfter);

      expect(written).toEqual({ status: 200, body: { revision: 1 } });
      expect(recordItems(table)).toHaveLength(1);
      expect(numberOf(accountItem(table).recordCount)).toBe(1);
    });

    it('writes when the card on myemi.app paid and no store purchase ever did', async () => {
      const { table, api } = await herAccount();
      await herSignInIsLinked(table);
      await herCardPaidUntil(api, aYearOn, registeredAt);

      const written = await writes(api, firstRecord, theMinuteShePaid);

      expect(written.status).toBe(200);
      expect(accountItem(table).subscribedUntil).toBeUndefined();
      expect(recordItems(table)).toHaveLength(1);
    });

    it('writes when the store purchase ran out and the card on myemi.app still runs', async () => {
      const { table, api } = await herYearThenItExpired();
      await herSignInIsLinked(table);
      await herCardPaidUntil(api, '2028-11-24T09:00:00.000Z', theMinuteAfter);

      const written = await writes(api, thirdRecord, afterTheLapse);

      expect(textOf(accountItem(table).subscribedUntil)).toBe(aYearOn);
      expect(written.status).toBe(200);
      expect(recordItems(table)).toHaveLength(3);
    });

    it('edits a day she already wrote, which is a write like any other', async () => {
      const { table, api } = await herYearAndTwoDays();

      const edited = await writes(api, firstRecord, aMinuteAfter(theMinuteAfter, 2), 2);

      expect(edited).toEqual({ status: 200, body: { revision: 2 } });
      expect(numberOf(recordItems(table)[0]?.revision)).toBe(2);
    });
  });

  describe('a woman whose subscription ran out writes nothing new', () => {
    it('is refused 402, which the application reads as pay and not as a fault', async () => {
      const { api } = await herYearThenItExpired();

      const written = await writes(api, thirdRecord, afterTheLapse);

      // The number is written out as well as named, because the number itself is the contract:
      // 403 is the signature that did not verify, and 502 is a service that could not answer.
      expect(written.status).toBe(402);
      expect(paymentIsRequired).toBe(402);
      expect(written.body).toEqual({ error: aSubscriptionIsNeeded });
    });

    it('leaves the table as it was: no new record, and a count that did not move', async () => {
      const { table, api } = await herYearThenItExpired();
      const held = herItems(table).length;

      expect((await writes(api, thirdRecord, afterTheLapse)).status).toBe(paymentIsRequired);

      expect(recordItems(table).map((item) => textOf(item.sk))).toEqual([
        `REC#${firstRecord}`,
        `REC#${secondRecord}`,
      ]);
      expect(numberOf(accountItem(table).recordCount)).toBe(2);
      // The signature the authorizer remembered is the one item the refused request left behind.
      expect(herItems(table)).toHaveLength(held + 1);
    });

    it('is refused an edit of a day she wrote while she was paid up', async () => {
      const { table, api } = await herYearThenItExpired();

      const edited = await writes(api, firstRecord, afterTheLapse, 2);

      expect(edited.status).toBe(paymentIsRequired);
      expect(numberOf(recordItems(table)[0]?.revision)).toBe(1);
    });

    it('is told to subscribe and nothing else: no date, no plan and no route', async () => {
      const { api } = await herYearThenItExpired();

      const written = await writes(api, thirdRecord, afterTheLapse);
      const told = JSON.stringify(written.body);

      expect(told).not.toContain('2027');
      expect(told).not.toContain('apple');
      expect(told).not.toContain('card');
      expect(told).not.toContain(herPayerDigest);
    });

    it('is refused when the card on myemi.app ran out as well', async () => {
      const { table, api } = await herYearThenItExpired();
      await herSignInIsLinked(table);
      await herCardPaidUntil(api, '2027-06-01T00:00:00.000Z', theMinuteAfter);

      const written = await writes(api, thirdRecord, afterTheLapse);

      expect(written.status).toBe(paymentIsRequired);
      expect(recordItems(table)).toHaveLength(2);
    });

    it('is refused when Apple answers that the date passed before she even filed', async () => {
      const { table, api } = await herAccount({
        transactions: [
          paidUntil('2026-11-01T09:00:00.000Z', {
            status: statusIsExpired,
            signedDate: Date.parse('2026-11-24T09:30:00.000Z'),
          }),
        ],
      });

      expect((await files(api, theMinuteShePaid)).status).toBe(200);
      const written = await writes(api, firstRecord, theMinuteAfter);

      expect(textOf(accountItem(table).subscribedUntil)).toBe('2026-11-01T09:00:00.000Z');
      expect(textOf(accountItem(table).subscriptionState)).toBe('lapsed');
      expect(written.status).toBe(paymentIsRequired);
      expect(recordItems(table)).toHaveLength(0);
    });

    it('is refused when nobody ever paid for this account at all', async () => {
      const { table, api } = await herAccount();

      const written = await writes(api, firstRecord, theMinuteShePaid);

      expect(written.status).toBe(paymentIsRequired);
      expect(recordItems(table)).toHaveLength(0);
    });
  });

  describe('the card the App Store is still trying', () => {
    it('lets her write while the store retries it, after the instant the store first gave', async () => {
      const { table, api } = await herAccount({
        transactions: [
          paidUntil('2026-11-20T09:00:00.000Z', {
            status: statusIsInBillingRetry,
            signedDate: Date.parse('2026-11-24T09:30:00.000Z'),
          }),
        ],
      });

      expect((await files(api, theMinuteShePaid)).status).toBe(200);
      const written = await writes(api, firstRecord, theMinuteAfter);

      expect(textOf(accountItem(table).subscribedUntil)).toBe('2026-11-20T09:00:00.000Z');
      expect(textOf(accountItem(table).subscriptionState)).toBe(theStoreStateThatCovers);
      expect(written.status).toBe(200);
      expect(recordItems(table)).toHaveLength(1);
    });

    it('lets her write while the grace period after a failed renewal runs', async () => {
      const { table, api } = await herAccount({
        transactions: [
          paidUntil('2026-11-20T09:00:00.000Z', {
            status: statusIsInGracePeriod,
            signedDate: Date.parse('2026-11-24T09:30:00.000Z'),
          }),
        ],
      });

      expect((await files(api, theMinuteShePaid)).status).toBe(200);
      const written = await writes(api, firstRecord, theMinuteAfter);

      expect(written.status).toBe(200);
      expect(recordItems(table)).toHaveLength(1);
    });

    it('refuses her once the grace period runs out', async () => {
      const { table, api } = await herYearThenItExpired(gracePeriodExpired);

      const written = await writes(api, thirdRecord, afterTheLapse);

      expect(written.status).toBe(paymentIsRequired);
      expect(recordItems(table)).toHaveLength(2);
    });
  });

  describe('everything she wrote before the lapse stays hers', () => {
    it('pulls every day she wrote, after the date has passed', async () => {
      const { api } = await herYearThenItExpired();

      const pulled = await pulls(api, afterTheLapse);

      expect(pulled.status).toBe(200);
      expect([...pulled.records].map((record) => record.recordId).sort()).toEqual(
        [firstRecord, secondRecord].sort(),
      );
    });

    it('exports every day she wrote, in one answer, after the date has passed', async () => {
      const { api } = await herYearThenItExpired();

      const exported = await exportsEverything(api, afterTheLapse);

      expect(exported.status).toBe(200);
      expect(exported.records).toHaveLength(2);
      expect(exported.moreToCome).toBe(false);
    });

    it('deletes everything, after the date has passed', async () => {
      const { table, api } = await herYearThenItExpired();

      const deleted = await deletes(api, afterTheLapse);

      expect(deleted.status).toBe(200);
      expect(deleted.body).toMatchObject({ deleted: true });
      expect(herItems(table)).toEqual([]);
    });

    it('pulls, exports and deletes in one run, with the write refused between them', async () => {
      const { table, api } = await herYearThenItExpired();

      const pulled = await pulls(api, afterTheLapse);
      const refused = await writes(api, thirdRecord, aMinuteAfter(afterTheLapse));
      const exported = await exportsEverything(api, aMinuteAfter(afterTheLapse, 2));
      const deleted = await deletes(api, aMinuteAfter(afterTheLapse, 3));

      expect([pulled.status, refused.status, exported.status, deleted.status]).toEqual([
        200,
        paymentIsRequired,
        200,
        200,
      ]);
      expect(pulled.records).toHaveLength(2);
      expect(exported.records).toHaveLength(2);
      expect(herItems(table)).toEqual([]);
    });
  });

  describe('which requests the gate stands in front of', () => {
    it('is never asked at all by a pull, an export or a delete', async () => {
      const { table } = await herYearThenItExpired();
      const asked: string[] = [];
      const raises: SaysWhetherSheMayWrite = (accountId) => {
        asked.push(accountId);

        return Promise.reject(new Error('a read asked the gate, and no read may ask it'));
      };
      const api = theServer(table, {}, raises);

      const pulled = await pulls(api, afterTheLapse);
      const exported = await exportsEverything(api, aMinuteAfter(afterTheLapse));
      const deleted = await deletes(api, aMinuteAfter(afterTheLapse, 2));

      expect([pulled.status, exported.status, deleted.status]).toEqual([200, 200, 200]);
      expect(asked).toEqual([]);
    });

    it('reaches the ways in only when the account item says no store purchase runs', async () => {
      const { table, api } = await herYearThenItExpired();
      await herSignInIsLinked(table);

      const whilePaid = table.calls();
      expect((await writes(api, thirdRecord, aMinuteAfter(theMinuteAfter, 2))).status).toBe(200);
      const queriesWhilePaid = table.calls().query - whilePaid.query;

      const whenLapsed = table.calls();
      expect((await writes(api, thirdRecord, afterTheLapse, 2)).status).toBe(paymentIsRequired);
      const queriesWhenLapsed = table.calls().query - whenLapsed.query;

      expect(queriesWhilePaid).toBe(0);
      expect(queriesWhenLapsed).toBe(1);
    });
  });
});
