import { base64Of, type DayRecord, openRecord, sealRecord } from '@emi/crypto';

import type { AuthorizerEvent, HttpRequestEvent } from '../../../../services/vault/src/api';
import { authorizeRequest } from '../../../../services/vault/src/auth/authorizer';
import { registerAccount } from '../../../../services/vault/src/handlers/register';
import { pullRecordsFor } from '../../../../services/vault/src/handlers/pullRecords';
import { putRecordFor } from '../../../../services/vault/src/handlers/putRecord';
import { dynamoStore } from '../../../../services/vault/src/store/dynamo';
import {
  fakeTable,
  type FakeTable,
  tableName,
} from '../../../../services/vault/tests/fixtures/dynamoTable';
import { deviceKey, type DeviceKey } from '../../src/services/sync/deviceKey';
import { signRequestHeaders } from '../../src/services/sync/sign';
import { fixedRandom, memorySecureStore } from '../fixtures/secureStore';

/**
 * The whole way from her phone to the table and back: she seals a day, the phone signs the write,
 * the authorizer lets it through, the service files ciphertext, and a pull brings the same day
 * back. The word she typed is looked for in every attribute the table ends up holding.
 */

/** A word that appears nowhere else in this repository, so finding it means finding her note. */
const marker = 'zarquonberry';
const loggedDay = '2026-03-04';
const recordId = '019826c2-4d00-7a1b-8c3d-0f1e2a3b4c5d';

const firstLaunch = new Date('2026-09-18T10:00:00.000Z');
const later = new Date('2026-09-18T11:30:00.000Z');
const laterStill = new Date('2026-09-18T12:45:00.000Z');

const herDay = {
  day: loggedDay,
  flow: 'heavy',
  symptoms: ['cramps'],
  energy: 2,
  note: `${marker} again, worse than last month`,
  recordedAt: '2026-03-04T21:14:00.000Z',
} as const satisfies DayRecord;

function carriedToTheFunction(
  method: string,
  path: string,
  body: string,
  headers: Readonly<Record<string, string>>,
  accountId?: string,
): HttpRequestEvent {
  const [rawPath, rawQueryString] = path.split('?');

  return {
    rawPath: rawPath ?? path,
    rawQueryString: rawQueryString ?? '',
    headers,
    requestContext: {
      http: { method },
      ...(accountId === undefined ? {} : { authorizer: { lambda: { accountId } } }),
    },
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
    requestContext: { http: event.requestContext.http },
  };
}

async function phoneOpenedFor(seed: number): Promise<DeviceKey> {
  return deviceKey(memorySecureStore(), fixedRandom(seed));
}

/** The key that seals every day she writes, which never leaves the phone in this test either. */
const vaultKey = new Uint8Array(32).map((_, at) => (at * 11 + 3) % 256);

function sealed(day: DayRecord, revision: number): { body: string; payload: Uint8Array } {
  const payload = sealRecord(day, vaultKey, {
    random: (count) => new Uint8Array(count).map((_, at) => (at + revision * 13 + 1) % 251),
  });

  return { body: JSON.stringify({ revision, payload: base64Of(payload) }), payload };
}

interface Phone {
  readonly key: DeviceKey;
  readonly table: FakeTable;
  readonly store: ReturnType<typeof dynamoStore>;
}

async function herPhone(seed = 3): Promise<Phone> {
  const table = fakeTable();
  const store = dynamoStore(table, tableName);
  const key = await phoneOpenedFor(seed);
  const body = JSON.stringify({ publicKey: base64Of(key.publicKey) });
  const headers = signRequestHeaders(
    key,
    { method: 'POST', path: '/v1/accounts', body },
    firstLaunch,
  );

  const registered = await registerAccount(
    carriedToTheFunction('POST', '/v1/accounts', body, headers),
    store,
    firstLaunch,
  );

  expect(registered.statusCode).toBe(201);

  return { key, table, store };
}

/** One write, through the authorizer first, exactly as the api runs it. */
async function writes(
  phone: Phone,
  body: string,
  at: Date,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const path = `/v1/records/${recordId}`;
  const headers = signRequestHeaders(phone.key, { method: 'PUT', path, body }, at);
  const allowed = await authorizeRequest(
    carriedToTheAuthorizer('PUT', path, headers),
    phone.store,
    at,
  );

  expect(allowed.isAuthorized).toBe(true);

  const answered = await putRecordFor(
    carriedToTheFunction('PUT', path, body, headers, allowed.context?.accountId),
    phone.store,
    at,
  );

  return {
    status: answered.statusCode,
    body: JSON.parse(answered.body) as Record<string, unknown>,
  };
}

interface PulledRecord {
  readonly recordId: string;
  readonly revision: number;
  readonly payload: string;
  readonly updatedAt: string;
}

/** One pull, through the authorizer first, from the cursor the phone is holding. */
async function pulls(phone: Phone, at: Date, cursor?: string) {
  const path = cursor === undefined ? '/v1/records' : `/v1/records?cursor=${cursor}`;
  const headers = signRequestHeaders(phone.key, { method: 'GET', path }, at);
  const allowed = await authorizeRequest(
    carriedToTheAuthorizer('GET', path, headers),
    phone.store,
    at,
  );

  expect(allowed.isAuthorized).toBe(true);

  const answered = await pullRecordsFor(
    carriedToTheFunction('GET', path, '', headers, allowed.context?.accountId),
    phone.store,
  );

  return JSON.parse(answered.body) as {
    records: PulledRecord[];
    cursor: string | null;
    moreToCome: boolean;
  };
}

function everyAttributeAsText(table: FakeTable): string {
  return table
    .items()
    .flatMap((item) =>
      Object.entries(item).flatMap(([name, value]) => [
        name,
        'S' in value ? value.S : '',
        'N' in value ? value.N : '',
        'B' in value ? String.fromCharCode(...value.B) : '',
      ]),
    )
    .join('\n');
}

describe('a marker word in a record never appears in the stored item', () => {
  describe('she logs a day and the phone sends it up', () => {
    it('is stored, and the answer carries the revision back', async () => {
      const phone = await herPhone();

      const written = await writes(phone, sealed(herDay, 1).body, later);

      expect(written).toEqual({ status: 200, body: { revision: 1 } });
    });

    it('leaves the table holding no word of what she wrote', async () => {
      const phone = await herPhone();

      await writes(phone, sealed(herDay, 1).body, later);
      const held = everyAttributeAsText(phone.table);

      expect(held).not.toContain(marker);
      expect(held).not.toContain(loggedDay);
      expect(held).not.toContain('heavy');
      expect(held).not.toContain('cramps');
    });

    it('leaves the account holding one record and the identifier she chose', async () => {
      const phone = await herPhone();

      await writes(phone, sealed(herDay, 1).body, later);
      const account = await phone.store.readAccount(phone.key.accountId);
      const record = phone.table.items().find((item) => 'payload' in item);
      const sortKey = record?.sk;

      expect(account?.recordCount).toBe(1);
      expect(sortKey !== undefined && 'S' in sortKey ? sortKey.S : '').toBe(`REC#${recordId}`);
    });
  });

  describe('she pulls it back down', () => {
    it('reads the same day out of the bytes the vault gave back', async () => {
      const phone = await herPhone();
      await writes(phone, sealed(herDay, 1).body, later);

      const pulled = await pulls(phone, laterStill);
      const first = pulled.records[0];
      const back = openRecord(
        Uint8Array.from(atob(first?.payload ?? ''), (character) => character.charCodeAt(0)),
        vaultKey,
      );

      expect(pulled.records).toHaveLength(1);
      expect(back).toEqual(herDay);
      expect(back.note).toContain(marker);
    });

    it('reads nothing out of them without her key', async () => {
      const phone = await herPhone();
      await writes(phone, sealed(herDay, 1).body, later);
      const pulled = await pulls(phone, laterStill);
      const bytes = Uint8Array.from(atob(pulled.records[0]?.payload ?? ''), (character) =>
        character.charCodeAt(0),
      );

      expect(() => openRecord(bytes, new Uint8Array(32).fill(1))).toThrow(
        /changed after they were sealed, or they were sealed under another key/,
      );
    });

    it('hands back a cursor that asks only for what came after it', async () => {
      const phone = await herPhone();
      await writes(phone, sealed(herDay, 1).body, later);

      const first = await pulls(phone, laterStill);
      const again = await pulls(phone, laterStill, first.cursor ?? undefined);

      expect(first.records).toHaveLength(1);
      expect(again.records).toEqual([]);
      expect(again.cursor).toBe(first.cursor);
    });
  });

  describe('she edits the day, and an older phone tries to write over it', () => {
    it('keeps the edit and refuses the older revision, saying which one is held', async () => {
      const phone = await herPhone();
      const edited = { ...herDay, note: `${marker} again, and it passed by the evening` };
      await writes(phone, sealed(herDay, 1).body, later);
      await writes(phone, sealed(edited, 2).body, laterStill);

      const refused = await writes(phone, sealed(herDay, 1).body, laterStill);
      const pulled = await pulls(phone, laterStill);
      const back = openRecord(
        Uint8Array.from(atob(pulled.records[0]?.payload ?? ''), (character) =>
          character.charCodeAt(0),
        ),
        vaultKey,
      );

      expect(refused.status).toBe(409);
      expect(refused.body.revision).toBe(2);
      expect(back).toEqual(edited);
    });
  });
});
