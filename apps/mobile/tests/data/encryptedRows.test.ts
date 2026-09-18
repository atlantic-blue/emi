import { envelopeVersion, recordBytes } from '@emi/crypto';

import type { Database } from '../../src/data/database';
import { listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import { encryptPlainPayloads } from '../../src/data/migrations/004-encrypt-payloads';
import { migrate } from '../../src/data/schema';
import { openTestDatabase } from './nodeDatabase';
import { aDayRecord } from '../fixtures/dayRecord';
import { herVault } from '../fixtures/herVault';

/**
 * The migration on its own, against the SQLite that ships with Node rather than through the
 * application, so the table's own constraints answer every write it makes.
 */

const migratedAt = new Date('2026-03-15T09:00:00.000Z');
const wroteAt = new Date('2026-03-14T21:05:00.000Z');

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);

  return database;
}

function plainRow(database: Database, day: string, note: string): void {
  database.run(
    `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at, deleted_at,
       synced_revision)
     VALUES (?, ?, ?, 1, ?, ?, NULL, NULL)`,
    [
      `01950000-0000-7000-8000-0000000${day.replaceAll('-', '').slice(4)}`,
      day,
      recordBytes(aDayRecord({ day, note, recordedAt: wroteAt.toISOString() })),
      wroteAt.toISOString(),
      wroteAt.toISOString(),
    ],
  );
}

function payloadOf(database: Database, day: string): Uint8Array {
  const rows = database.all<{ payload: Uint8Array }>('SELECT payload FROM day_log WHERE day = ?', [
    day,
  ]);
  const payload = rows[0]?.payload;

  if (!payload) {
    throw new Error(`${day} is not in the table`);
  }

  return payload;
}

describe('the days written before the envelope are sealed once', () => {
  it('seals a plain row and leaves its note unreadable', () => {
    const database = migrated();
    plainRow(database, '2026-03-14', 'quarrelsome-marmoset');

    expect(encryptPlainPayloads(database, herVault(), migratedAt)).toEqual({
      sealed: 1,
      alreadySealed: 0,
    });
    const payload = payloadOf(database, '2026-03-14');
    expect(payload[0]).toBe(envelopeVersion);
    expect(Buffer.from(payload).toString('utf8')).not.toContain('quarrelsome-marmoset');
  });

  it('keeps her day the same day, read back through the vault', () => {
    const database = migrated();
    plainRow(database, '2026-03-14', 'quarrelsome-marmoset');

    encryptPlainPayloads(database, herVault(), migratedAt);

    expect(herVault().open(payloadOf(database, '2026-03-14'))).toEqual(
      aDayRecord({
        day: '2026-03-14',
        note: 'quarrelsome-marmoset',
        recordedAt: wroteAt.toISOString(),
      }),
    );
  });

  it('converts every plain row in one pass', () => {
    const database = migrated();
    for (const day of ['2026-03-12', '2026-03-13', '2026-03-14']) {
      plainRow(database, day, `note for ${day}`);
    }

    expect(encryptPlainPayloads(database, herVault(), migratedAt)).toEqual({
      sealed: 3,
      alreadySealed: 0,
    });
    expect(listDayLogs(database).every((row) => row.payload[0] === envelopeVersion)).toBe(true);
  });

  it('changes nothing when it runs a second time', () => {
    const database = migrated();
    plainRow(database, '2026-03-14', 'quarrelsome-marmoset');
    encryptPlainPayloads(database, herVault(), migratedAt);
    const sealed = Buffer.from(payloadOf(database, '2026-03-14')).toString('hex');
    const rows = listDayLogs(database);

    expect(encryptPlainPayloads(database, herVault(), migratedAt)).toEqual({
      sealed: 0,
      alreadySealed: 1,
    });
    expect(Buffer.from(payloadOf(database, '2026-03-14')).toString('hex')).toBe(sealed);
    expect(listDayLogs(database)).toEqual(rows);
  });

  it('seals only the rows that need it when the table holds both kinds', () => {
    const database = migrated();
    plainRow(database, '2026-03-12', 'the plain one');
    plainRow(database, '2026-03-13', 'the other plain one');
    encryptPlainPayloads(database, herVault(), migratedAt);
    plainRow(database, '2026-03-14', 'the late arrival');

    expect(
      encryptPlainPayloads(database, herVault(), new Date('2026-03-16T09:00:00.000Z')),
    ).toEqual({ sealed: 1, alreadySealed: 2 });
    expect(readDayLog(database, '2026-03-12')?.revision).toBe(2);
    expect(readDayLog(database, '2026-03-14')?.revision).toBe(2);
  });

  it('raises the revision, because the server holds the bytes that changed', () => {
    const database = migrated();
    plainRow(database, '2026-03-14', 'quarrelsome-marmoset');

    encryptPlainPayloads(database, herVault(), migratedAt);

    const row = readDayLog(database, '2026-03-14');
    expect(row?.revision).toBe(2);
    expect(row?.updatedAt).toBe(migratedAt.toISOString());
    expect(row?.syncedRevision).toBeNull();
  });

  it('writes nothing at all when the table is empty', () => {
    const database = migrated();

    expect(encryptPlainPayloads(database, herVault(), migratedAt)).toEqual({
      sealed: 0,
      alreadySealed: 0,
    });
    expect(listDayLogs(database)).toEqual([]);
  });

  it('leaves every row as it was when one of them cannot be read', () => {
    const database = migrated();
    plainRow(database, '2026-03-13', 'the readable one');
    plainRow(database, '2026-03-14', 'the readable one too');
    database.run('UPDATE day_log SET payload = ?, revision = revision + 1 WHERE day = ?', [
      new Uint8Array([0x7b, 0x21]),
      '2026-03-14',
    ]);

    expect(() => encryptPlainPayloads(database, herVault(), migratedAt)).toThrow();
    expect(Buffer.from(payloadOf(database, '2026-03-13')).toString('utf8')).toContain(
      'the readable one',
    );
  });
});
