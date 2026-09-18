import { accountIdFor, base64Of, bodyHashOf, sealRecord } from '@emi/crypto';

import { cursorFor, pageBytes, pullRecordsFor } from '../src/handlers/pullRecords';
import { maximumEnvelopeBytes, putRecordFor } from '../src/handlers/putRecord';
import { dynamoStore } from '../src/store/dynamo';
import { pageCostOf, type RecordStore, type StoredRecord } from '../src/store/records';
import { fakeTable, type FakeTable, tableName } from './fixtures/dynamoTable';
import { authorizedEvent, keyPairFromSeed, signedRequest } from './fixtures/requests';

/**
 * Contracts WIRE-2 and WIRE-3, through the handlers and the storage together. The store under
 * every case is the DynamoDB one, over a table that refuses what the real table refuses, so the
 * marshalling these tests drive is the marshalling that ships.
 */

const pair = keyPairFromSeed(3);
const accountId = accountIdFor(pair.publicKey);
const stranger = accountIdFor(keyPairFromSeed(101).publicKey);
const vaultKey = new Uint8Array(32).fill(7);

const firstRecord = '019826c2-4d00-7a1b-8c3d-0f1e2a3b4c5d';
const secondRecord = '019826c2-4d00-7b2c-9d4e-1f2a3b4c5d6e';

const writtenAt = new Date('2026-09-18T10:00:00.000Z');
const laterAt = new Date('2026-09-18T11:30:00.000Z');

function envelopeFor(day: string, note?: string): Uint8Array {
  return sealRecord(
    { day, recordedAt: '2026-03-04T21:14:00.000Z', ...(note === undefined ? {} : { note }) },
    vaultKey,
    { random: (count) => new Uint8Array(count).fill(9) },
  );
}

interface Written {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

async function putting(
  store: RecordStore,
  recordId: string,
  body: string,
  at: Date = writtenAt,
  carrying: string = accountId,
): Promise<Written> {
  const path = `/v1/records/${recordId}`;
  const { event } = signedRequest(pair, { method: 'PUT', path, body, instant: at });
  const answered = await putRecordFor(authorizedEvent(event, carrying), store, at);

  return {
    status: answered.statusCode,
    body: JSON.parse(answered.body) as Record<string, unknown>,
  };
}

function recordBody(revision: number, payload: Uint8Array): string {
  return JSON.stringify({ revision, payload: base64Of(payload) });
}

interface Pulled {
  readonly status: number;
  readonly records: { recordId: string; revision: number; payload: string; updatedAt: string }[];
  readonly cursor: string | null;
  readonly moreToCome: boolean;
}

async function pulling(store: RecordStore, cursor?: string): Promise<Pulled> {
  const path = cursor === undefined ? '/v1/records' : `/v1/records?cursor=${cursor}`;
  const { event } = signedRequest(pair, { method: 'GET', path, instant: writtenAt });
  const answered = await pullRecordsFor(authorizedEvent(event, accountId), store);
  const body = JSON.parse(answered.body) as Omit<Pulled, 'status'>;

  return { status: answered.statusCode, ...body };
}

function storeOver(table: FakeTable) {
  return dynamoStore(table, tableName);
}

async function registered(table: FakeTable): Promise<void> {
  await storeOver(table).createAccount({
    accountId,
    publicKey: pair.publicKey,
    createdAt: writtenAt.toISOString(),
    recordCount: 0,
  });
}

async function accountAfterwards(table: FakeTable) {
  return storeOver(table).readAccount(accountId);
}

describe('a record she writes to the vault', () => {
  describe('the write itself', () => {
    it('answers with the revision it stored', async () => {
      const table = fakeTable();
      await registered(table);

      const answered = await putting(
        storeOver(table),
        firstRecord,
        recordBody(1, envelopeFor('2026-03-04')),
      );

      expect(answered).toEqual({ status: 200, body: { revision: 1 } });
    });

    it('reads back through a pull as the bytes she sent', async () => {
      const table = fakeTable();
      const store = storeOver(table);
      const envelope = envelopeFor('2026-03-04', 'a quiet day');
      await registered(table);

      await putting(store, firstRecord, recordBody(1, envelope));
      const pulled = await pulling(store);

      expect(pulled.records).toEqual([
        {
          recordId: firstRecord,
          revision: 1,
          payload: base64Of(envelope),
          updatedAt: writtenAt.toISOString(),
        },
      ]);
    });

    it('replaces the record when a later write raises the revision', async () => {
      const table = fakeTable();
      const store = storeOver(table);
      const second = envelopeFor('2026-03-04', 'she came back and changed it');
      await registered(table);

      await putting(store, firstRecord, recordBody(1, envelopeFor('2026-03-04')));
      const answered = await putting(store, firstRecord, recordBody(2, second), laterAt);
      const pulled = await pulling(store);

      expect(answered).toEqual({ status: 200, body: { revision: 2 } });
      expect(pulled.records).toEqual([
        {
          recordId: firstRecord,
          revision: 2,
          payload: base64Of(second),
          updatedAt: laterAt.toISOString(),
        },
      ]);
    });

    it('counts the record once, however many times she edits it', async () => {
      const table = fakeTable();
      const store = storeOver(table);
      await registered(table);

      await putting(store, firstRecord, recordBody(1, envelopeFor('2026-03-04')));
      await putting(store, firstRecord, recordBody(2, envelopeFor('2026-03-04')), laterAt);
      await putting(store, secondRecord, recordBody(1, envelopeFor('2026-03-05')), laterAt);

      expect((await accountAfterwards(table))?.recordCount).toBe(2);
    });
  });

  describe('a revision that does not rise', () => {
    it('is refused, and the answer says which revision is held', async () => {
      const table = fakeTable();
      const store = storeOver(table);
      await registered(table);

      await putting(store, firstRecord, recordBody(4, envelopeFor('2026-03-04')));
      const answered = await putting(store, firstRecord, recordBody(3, envelopeFor('2026-03-04')));

      expect(answered.status).toBe(409);
      expect(answered.body.revision).toBe(4);
    });

    it('is refused when it equals the one held', async () => {
      const table = fakeTable();
      const store = storeOver(table);
      await registered(table);

      await putting(store, firstRecord, recordBody(4, envelopeFor('2026-03-04')));
      const answered = await putting(store, firstRecord, recordBody(4, envelopeFor('2026-03-05')));

      expect(answered.status).toBe(409);
    });

    it('leaves the record it refused exactly as it was', async () => {
      const table = fakeTable();
      const store = storeOver(table);
      const first = envelopeFor('2026-03-04', 'the one she meant to keep');
      await registered(table);

      await putting(store, firstRecord, recordBody(4, first));
      await putting(store, firstRecord, recordBody(2, envelopeFor('2026-03-04', 'the older one')));
      const pulled = await pulling(store);

      expect(pulled.records).toEqual([
        {
          recordId: firstRecord,
          revision: 4,
          payload: base64Of(first),
          updatedAt: writtenAt.toISOString(),
        },
      ]);
    });
  });

  describe('a write the service will not take', () => {
    it('refuses an envelope one byte over 64 kilobytes', async () => {
      const table = fakeTable();
      await registered(table);
      // The size is written out here rather than taken from the handler, because a test that
      // measures against the number it is checking passes whatever that number becomes.
      const tooLong = new Uint8Array(64 * 1024 + 1);
      tooLong[0] = 1;

      const answered = await putting(storeOver(table), firstRecord, recordBody(1, tooLong));

      expect(answered.status).toBe(413);
      expect(table.items().some((item) => 'payload' in item)).toBe(false);
    });

    it('takes an envelope of exactly 64 kilobytes', async () => {
      const table = fakeTable();
      await registered(table);
      const atTheLimit = new Uint8Array(64 * 1024);
      atTheLimit[0] = 1;

      const answered = await putting(storeOver(table), firstRecord, recordBody(1, atTheLimit));

      expect(answered.status).toBe(200);
      expect(maximumEnvelopeBytes).toBe(64 * 1024);
    });

    it('refuses bytes that are not an envelope', async () => {
      const table = fakeTable();
      await registered(table);

      const answered = await putting(
        storeOver(table),
        firstRecord,
        recordBody(1, new Uint8Array(64).fill(2)),
      );

      expect(answered.status).toBe(400);
      expect(answered.body.error).toBe('those bytes are not an envelope');
    });

    it('refuses a truncated envelope', async () => {
      const table = fakeTable();
      await registered(table);

      const answered = await putting(
        storeOver(table),
        firstRecord,
        recordBody(1, envelopeFor('2026-03-04').slice(0, 20)),
      );

      expect(answered.status).toBe(400);
    });

    it('refuses an identifier that is not a version 7 identifier', async () => {
      const table = fakeTable();
      await registered(table);

      const answered = await putting(
        storeOver(table),
        '2026-03-04-heavy-flow',
        recordBody(1, envelopeFor('2026-03-04')),
      );

      expect(answered.status).toBe(400);
      expect(table.items().some((item) => 'payload' in item)).toBe(false);
    });

    it('refuses an identifier of another version', async () => {
      const table = fakeTable();
      await registered(table);

      const answered = await putting(
        storeOver(table),
        '019826c2-4d00-4a1b-8c3d-0f1e2a3b4c5d',
        recordBody(1, envelopeFor('2026-03-04')),
      );

      expect(answered.status).toBe(400);
    });

    it('refuses a revision that is not a whole number of one or more', async () => {
      const table = fakeTable();
      await registered(table);
      const envelope = base64Of(envelopeFor('2026-03-04'));

      for (const revision of [0, -1, 1.5, '1']) {
        const answered = await putting(
          storeOver(table),
          firstRecord,
          JSON.stringify({ revision, payload: envelope }),
        );

        expect(answered.status).toBe(400);
      }
    });

    it('refuses a body that is not the body that was signed', async () => {
      const table = fakeTable();
      await registered(table);
      const path = `/v1/records/${firstRecord}`;
      const signedFor = recordBody(1, envelopeFor('2026-03-04'));
      const { headers } = signedRequest(pair, {
        method: 'PUT',
        path,
        body: signedFor,
        instant: writtenAt,
      });

      const answered = await putRecordFor(
        authorizedEvent(
          {
            rawPath: path,
            rawQueryString: '',
            headers,
            requestContext: { http: { method: 'PUT' } },
            body: recordBody(2, envelopeFor('2026-03-05')),
            isBase64Encoded: false,
          },
          accountId,
        ),
        storeOver(table),
        writtenAt,
      );

      expect(answered.statusCode).toBe(403);
      expect(bodyHashOf(signedFor)).not.toBe(bodyHashOf(recordBody(2, envelopeFor('2026-03-05'))));
    });

    it('refuses a request the authorizer carried no account for', async () => {
      const table = fakeTable();
      await registered(table);
      const path = `/v1/records/${firstRecord}`;
      const body = recordBody(1, envelopeFor('2026-03-04'));
      const { event } = signedRequest(pair, { method: 'PUT', path, body, instant: writtenAt });

      const answered = await putRecordFor(event, storeOver(table), writtenAt);

      expect(answered.statusCode).toBe(403);
      expect(table.items().some((item) => 'payload' in item)).toBe(false);
    });

    it('refuses a request carrying an account the signature is not for', async () => {
      const table = fakeTable();
      await registered(table);

      const answered = await putting(
        storeOver(table),
        firstRecord,
        recordBody(1, envelopeFor('2026-03-04')),
        writtenAt,
        stranger,
      );

      expect(answered.status).toBe(403);
    });
  });
});

describe('the records she pulls back', () => {
  async function seeded(table: FakeTable, count: number, at: (index: number) => Date) {
    const store = storeOver(table);
    await registered(table);

    for (let index = 0; index < count; index += 1) {
      await store.writeRecord(accountId, {
        recordId: `019826c2-4d00-7${String(index).padStart(3, '0')}-8c3d-0f1e2a3b4c5d`,
        revision: 1,
        payload: new Uint8Array(maximumEnvelopeBytes).fill(index + 1),
        updatedAt: at(index).toISOString(),
      });
    }

    return store;
  }

  it('answers with everything written, in the order it was written', async () => {
    const table = fakeTable();
    const store = storeOver(table);
    await registered(table);

    await putting(store, secondRecord, recordBody(1, envelopeFor('2026-03-05')), writtenAt);
    await putting(store, firstRecord, recordBody(1, envelopeFor('2026-03-04')), laterAt);
    const pulled = await pulling(store);

    expect(pulled.records.map((record) => record.recordId)).toEqual([secondRecord, firstRecord]);
    expect(pulled.moreToCome).toBe(false);
  });

  it('answers with nothing, and no cursor, for an account that has written nothing', async () => {
    const table = fakeTable();
    await registered(table);

    const pulled = await pulling(storeOver(table));

    expect(pulled).toEqual({ status: 200, records: [], cursor: null, moreToCome: false });
  });

  it('answers with only what came after the cursor', async () => {
    const table = fakeTable();
    const store = storeOver(table);
    await registered(table);

    await putting(store, secondRecord, recordBody(1, envelopeFor('2026-03-05')), writtenAt);
    const first = await pulling(store);
    await putting(store, firstRecord, recordBody(1, envelopeFor('2026-03-04')), laterAt);

    const second = await pulling(store, first.cursor ?? undefined);

    expect(second.records.map((record) => record.recordId)).toEqual([firstRecord]);
  });

  it('answers with a cursor standing at the instant it reached', async () => {
    const table = fakeTable();
    const store = storeOver(table);
    await registered(table);

    await putting(store, firstRecord, recordBody(1, envelopeFor('2026-03-04')), laterAt);
    const pulled = await pulling(store);

    expect(pulled.cursor).toBe(cursorFor(accountId, laterAt.toISOString()));
  });

  it('keeps the cursor where it was when nothing new was written', async () => {
    const table = fakeTable();
    const store = storeOver(table);
    await registered(table);

    await putting(store, firstRecord, recordBody(1, envelopeFor('2026-03-04')), writtenAt);
    const first = await pulling(store);
    const second = await pulling(store, first.cursor ?? undefined);

    expect(second.records).toEqual([]);
    expect(second.cursor).toBe(first.cursor);
  });

  it('never carries the account item or a remembered signature', async () => {
    const table = fakeTable();
    const store = storeOver(table);
    await registered(table);
    await store.rememberSignature(accountId, 'a-signature-seen-once', 1789000000);

    await putting(store, firstRecord, recordBody(1, envelopeFor('2026-03-04')));
    const pulled = await pulling(store);

    expect(pulled.records.map((record) => record.recordId)).toEqual([firstRecord]);
  });

  it('reads past the page the table answered with, so a short page is not a short answer', async () => {
    const table = fakeTable({ itemsPerPage: 2 });
    const store = await seeded(table, 5, () => writtenAt);

    const page = await store.readRecordsAfter(accountId, null, pageBytes * 100);

    expect(page.records).toHaveLength(5);
    expect(table.calls().query).toBeGreaterThan(1);
  });

  describe('a page that would run over a megabyte', () => {
    const minutesApart = (index: number) => new Date(writtenAt.getTime() + index * 60 * 1000);

    it('answers with a cursor rather than truncating in silence', async () => {
      const table = fakeTable();
      const store = await seeded(table, 24, minutesApart);

      const pulled = await pulling(store);
      const spent = pulled.records.reduce(
        (total, record) =>
          total + pageCostOf({ ...record, payload: new Uint8Array(maximumEnvelopeBytes) }),
        0,
      );

      expect(pulled.moreToCome).toBe(true);
      expect(pulled.records.length).toBeLessThan(24);
      expect(spent).toBeLessThanOrEqual(pageBytes);
    });

    it('carries every record across its pages, each one once', async () => {
      const table = fakeTable();
      const store = await seeded(table, 24, minutesApart);

      const seen: string[] = [];
      let cursor: string | undefined = undefined;
      let more = true;
      let pages = 0;

      while (more && pages < 10) {
        pages += 1;
        const pulled: Pulled = await pulling(store, cursor);

        seen.push(...pulled.records.map((record) => record.recordId));
        cursor = pulled.cursor ?? undefined;
        more = pulled.moreToCome;
      }

      expect(new Set(seen).size).toBe(24);
      expect(seen).toHaveLength(24);
    });

    it('never splits two records written in the same instant across two pages', async () => {
      const table = fakeTable();
      // Every record shares one instant, so a page that cut inside the group would answer with a
      // cursor that steps straight over whatever fell on the far side of the cut.
      const store = await seeded(table, 24, () => writtenAt);

      const pulled = await pulling(store);

      expect(pulled.records).toHaveLength(24);
      expect(pulled.moreToCome).toBe(false);
    });
  });

  describe('a cursor the caller should not be holding', () => {
    it('refuses one written for another account', async () => {
      const table = fakeTable();
      await registered(table);

      const pulled = await pulling(storeOver(table), cursorFor(stranger, writtenAt.toISOString()));

      expect(pulled.status).toBe(403);
    });

    it('refuses text that is not a cursor', async () => {
      const table = fakeTable();
      await registered(table);

      const pulled = await pulling(storeOver(table), 'not-a-cursor');

      expect(pulled.status).toBe(400);
    });

    it('refuses a cursor whose instant is not an instant', async () => {
      const table = fakeTable();
      await registered(table);

      const pulled = await pulling(storeOver(table), cursorFor(accountId, 'the fourth of March'));

      expect(pulled.status).toBe(400);
    });
  });
});

describe('what the storage asks of the table', () => {
  it('writes a record as one item and nothing else', async () => {
    const table = fakeTable();
    const store = storeOver(table);
    const record: StoredRecord = {
      recordId: firstRecord,
      revision: 1,
      payload: envelopeFor('2026-03-04'),
      updatedAt: writtenAt.toISOString(),
    };

    await store.writeRecord(accountId, record);

    expect(table.items()).toHaveLength(1);
    expect(table.calls().query).toBe(0);
  });
});
