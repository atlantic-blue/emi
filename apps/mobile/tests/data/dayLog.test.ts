import type { Database } from '../../src/data/database';
import {
  DayLogError,
  insertDayLog,
  listDayLogs,
  readDayLog,
  markDayLogSynced,
  softDeleteDayLog,
  unsentDayLogs,
  updateDayLog,
  type DayLogRefusal,
} from '../../src/data/dayLogRepository';
import { migrate, migrations, runMigrations, schemaVersion } from '../../src/data/schema';
import { uuidV7, uuidV7RandomByteCount } from '../../src/data/uuidV7';

import { openTestDatabase } from './nodeDatabase';

const firstDay = '2026-09-14';
const firstPayload = new Uint8Array([1, 2, 3, 4]);
const editedPayload = new Uint8Array([9, 9, 9]);
const wroteAt = new Date('2026-09-14T08:15:00.000Z');
const editedAt = new Date('2026-09-14T19:40:30.250Z');
const deletedAt = new Date('2026-09-15T06:00:00.000Z');

function migrated(): Database {
  const db = openTestDatabase();
  migrate(db);
  return db;
}

function refusalOf(act: () => unknown): DayLogRefusal {
  try {
    act();
  } catch (error) {
    if (error instanceof DayLogError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the call was accepted and a refusal was expected');
}

function messageOf(act: () => unknown): string {
  try {
    act();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('the call was accepted and a refusal was expected');
}

function shapeOf(db: Database): unknown {
  return {
    version: schemaVersion(db),
    objects: db.all('SELECT type, name, sql FROM sqlite_master ORDER BY type, name'),
  };
}

describe('the migration', () => {
  it('creates the eight columns of the design, with their types and their nullability', () => {
    const db = migrated();

    const columns = db.all<{ name: string; type: string; notnull: number; pk: number }>(
      'PRAGMA table_info(day_log)',
    );

    expect(columns.map((column) => [column.name, column.type, column.notnull, column.pk])).toEqual([
      ['id', 'TEXT', 1, 1],
      ['day', 'TEXT', 1, 0],
      ['payload', 'BLOB', 1, 0],
      ['revision', 'INTEGER', 1, 0],
      ['created_at', 'TEXT', 1, 0],
      ['updated_at', 'TEXT', 1, 0],
      ['deleted_at', 'TEXT', 0, 0],
      ['synced_revision', 'INTEGER', 0, 0],
    ]);
  });

  it('indexes the day uniquely and the unsent writes for the sync', () => {
    const db = migrated();

    const indexes = db.all<{ name: string; unique: number }>('PRAGMA index_list(day_log)');
    const dayColumns = db.all<{ name: string }>('PRAGMA index_info(day_log_day)');
    const unsyncedColumns = db.all<{ name: string }>('PRAGMA index_info(day_log_unsynced)');

    expect(indexes.map((index) => [index.name, index.unique]).sort()).toEqual([
      ['day_log_day', 1],
      ['day_log_unsynced', 0],
      ['sqlite_autoindex_day_log_1', 1],
    ]);
    expect(dayColumns.map((column) => column.name)).toEqual(['day']);
    expect(unsyncedColumns.map((column) => column.name)).toEqual(['synced_revision', 'revision']);
  });

  it('runs twice and the second run changes nothing', () => {
    const db = openTestDatabase();

    const first = migrate(db);
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });
    const afterTheFirstRun = shapeOf(db);
    const second = migrate(db);

    expect(first).toEqual({ from: 0, to: 1, applied: ['day log'] });
    expect(second).toEqual({ from: 1, to: 1, applied: [] });
    expect(shapeOf(db)).toEqual(afterTheFirstRun);
    expect(readDayLog(db, firstDay)?.revision).toBe(1);
  });

  it('numbers every migration with a whole version, and the list rises', () => {
    const versions = migrations.map((migration) => migration.version);

    expect(versions.every((version) => Number.isInteger(version) && version > 0)).toBe(true);
    expect(versions).toEqual([...versions].sort((left, right) => left - right));
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('leaves nothing behind when a statement in it fails', () => {
    const db = openTestDatabase();
    const broken = [
      { version: 1, name: 'broken', statements: ['CREATE TABLE a (b TEXT)', 'nonsense'] },
    ];

    expect(() => runMigrations(db, broken)).toThrow();
    expect(db.all('SELECT name FROM sqlite_master')).toEqual([]);
    expect(schemaVersion(db)).toBe(0);
  });
});

describe('a day is written, edited and soft deleted', () => {
  it('writes the day at revision 1', () => {
    const db = migrated();

    const written = insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    expect(written.day).toBe(firstDay);
    expect(written.payload).toEqual(firstPayload);
    expect(written.revision).toBe(1);
    expect(written.createdAt).toBe('2026-09-14T08:15:00.000Z');
    expect(written.updatedAt).toBe('2026-09-14T08:15:00.000Z');
    expect(written.deletedAt).toBeNull();
    expect(written.syncedRevision).toBeNull();
  });

  it('reads it back', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    expect(readDayLog(db, firstDay)).toEqual(
      insertedShape({ revision: 1, payload: firstPayload, updatedAt: wroteAt }),
    );
    expect(listDayLogs(db).map((row) => row.day)).toEqual([firstDay]);
  });

  it('raises the revision on the edit and keeps the identifier and the creation time', () => {
    const db = migrated();
    const first = insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    const edited = updateDayLog(db, { day: firstDay, payload: editedPayload, now: editedAt });

    expect(edited.revision).toBe(2);
    expect(edited.payload).toEqual(editedPayload);
    expect(edited.id).toBe(first.id);
    expect(edited.createdAt).toBe(first.createdAt);
    expect(edited.updatedAt).toBe('2026-09-14T19:40:30.250Z');
    expect(readDayLog(db, firstDay)?.revision).toBe(2);
  });

  it('does not return the day after it is deleted, and raises the revision again', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });
    updateDayLog(db, { day: firstDay, payload: editedPayload, now: editedAt });

    const removed = softDeleteDayLog(db, { day: firstDay, now: deletedAt });

    expect(removed.revision).toBe(3);
    expect(removed.deletedAt).toBe('2026-09-15T06:00:00.000Z');
    expect(readDayLog(db, firstDay)).toBeUndefined();
    expect(listDayLogs(db)).toEqual([]);
  });

  it('keeps the deleted row in the table, because the server has to be told', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });
    softDeleteDayLog(db, { day: firstDay, now: deletedAt });

    const rows = db.all<{ day: string; deleted_at: string | null; revision: number }>(
      'SELECT day, deleted_at, revision FROM day_log',
    );

    expect(rows).toEqual([{ day: firstDay, deleted_at: '2026-09-15T06:00:00.000Z', revision: 2 }]);
  });
});

describe('the table refuses', () => {
  it('a second write of the same day', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    const refusal = refusalOf(() =>
      insertDayLog(db, { day: firstDay, payload: editedPayload, now: editedAt }),
    );

    expect(refusal).toBe('day-already-written');
    expect(db.all('SELECT day FROM day_log')).toEqual([{ day: firstDay }]);
    expect(readDayLog(db, firstDay)?.payload).toEqual(firstPayload);
  });

  it('a second row with the same day, written around the repository', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    expect(() => rawInsert(db, { id: 'second', day: firstDay })).toThrow(/UNIQUE/i);
  });

  it('a day that is not a calendar day', () => {
    const db = migrated();

    expect(refusalOf(() => insertDayLog(db, write({ day: '14-09-2026' })))).toBe(
      'day-is-not-a-date',
    );
    expect(refusalOf(() => insertDayLog(db, write({ day: '2026-9-14' })))).toBe(
      'day-is-not-a-date',
    );
    expect(refusalOf(() => insertDayLog(db, write({ day: '2026-02-31' })))).toBe(
      'day-is-not-a-date',
    );
    expect(refusalOf(() => insertDayLog(db, write({ day: '2026-13-01' })))).toBe(
      'day-is-not-a-date',
    );
    expect(db.all('SELECT day FROM day_log')).toEqual([]);
  });

  it('a day that is not written as YYYY-MM-DD, written around the repository', () => {
    const db = migrated();

    expect(() => rawInsert(db, { id: 'a', day: '14-09-2026' })).toThrow(/CHECK/i);
  });

  it('a note where the design asks for a number, because the table is strict', () => {
    const db = migrated();

    expect(() =>
      db.run(
        `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'a',
          firstDay,
          firstPayload,
          'one',
          '2026-09-14T08:15:00.000Z',
          '2026-09-14T08:15:00.000Z',
        ],
      ),
    ).toThrow(/cannot store TEXT value in INTEGER column/i);
  });

  it('an instant that is not written the way the phone writes one', () => {
    const db = migrated();

    expect(() => rawInsert(db, { id: 'a', day: firstDay, createdAt: '14 September 2026' })).toThrow(
      /CHECK/i,
    );
  });

  it('a write that does not raise the revision', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    expect(() =>
      db.run('UPDATE day_log SET payload = ?, revision = revision WHERE day = ?', [
        editedPayload,
        firstDay,
      ]),
    ).toThrow(/revision must rise/);
    expect(() =>
      db.run('UPDATE day_log SET deleted_at = ?, revision = revision WHERE day = ?', [
        deletedAt.toISOString(),
        firstDay,
      ]),
    ).toThrow(/revision must rise/);
  });

  it('a write that leaves the update time behind the creation time', () => {
    const db = migrated();

    expect(() =>
      rawInsert(db, {
        id: 'a',
        day: firstDay,
        createdAt: '2026-09-14T08:15:00.000Z',
        updatedAt: '2026-09-13T08:15:00.000Z',
      }),
    ).toThrow(/CHECK/i);
  });

  it('a payload with no bytes in it', () => {
    const db = migrated();

    expect(refusalOf(() => insertDayLog(db, write({ payload: new Uint8Array() })))).toBe(
      'payload-is-empty',
    );
    expect(() => rawInsert(db, { id: 'a', day: firstDay, payload: new Uint8Array() })).toThrow(
      /CHECK/i,
    );
  });

  it('a write time that is not a date', () => {
    const db = migrated();

    expect(refusalOf(() => insertDayLog(db, write({ now: new Date('never') })))).toBe(
      'instant-is-not-a-date',
    );
  });

  it('an edit of a day that was never written', () => {
    const db = migrated();

    expect(refusalOf(() => updateDayLog(db, write({ day: '2026-01-01' })))).toBe(
      'day-is-not-written',
    );
  });

  it('an edit or a delete of a day that is deleted', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });
    softDeleteDayLog(db, { day: firstDay, now: deletedAt });

    expect(refusalOf(() => updateDayLog(db, write({})))).toBe('day-is-deleted');
    expect(refusalOf(() => softDeleteDayLog(db, { day: firstDay, now: deletedAt }))).toBe(
      'day-is-deleted',
    );
    expect(messageOf(() => insertDayLog(db, write({})))).toContain('deleted');
  });
});

describe('the sync marker', () => {
  it('records the revision the server accepted, and leaves the revision alone', () => {
    const db = migrated();
    const written = insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    const marked = markDayLogSynced(db, { day: firstDay, revision: written.revision });

    expect(marked.revision).toBe(1);
    expect(marked.syncedRevision).toBe(1);
    expect(marked.updatedAt).toBe(written.updatedAt);
    expect(marked.payload).toEqual(firstPayload);
  });

  it('takes the day out of the unsent list, and the next edit puts it back', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    expect(unsentDayLogs(db).map((row) => row.day)).toEqual([firstDay]);

    markDayLogSynced(db, { day: firstDay, revision: 1 });
    expect(unsentDayLogs(db)).toEqual([]);

    updateDayLog(db, { day: firstDay, payload: editedPayload, now: editedAt });
    expect(unsentDayLogs(db).map((row) => [row.day, row.revision, row.syncedRevision])).toEqual([
      [firstDay, 2, 1],
    ]);
  });

  it('sends a deleted day until the server has seen the delete', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });
    markDayLogSynced(db, { day: firstDay, revision: 1 });
    softDeleteDayLog(db, { day: firstDay, now: deletedAt });

    expect(unsentDayLogs(db).map((row) => row.day)).toEqual([firstDay]);

    const marked = markDayLogSynced(db, { day: firstDay, revision: 2 });

    expect(marked.deletedAt).toBe('2026-09-15T06:00:00.000Z');
    expect(unsentDayLogs(db)).toEqual([]);
  });

  it('refuses a revision the phone never wrote, and one behind the last acknowledged', () => {
    const db = migrated();
    insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });
    updateDayLog(db, { day: firstDay, payload: editedPayload, now: editedAt });
    markDayLogSynced(db, { day: firstDay, revision: 2 });

    expect(refusalOf(() => markDayLogSynced(db, { day: firstDay, revision: 3 }))).toBe(
      'revision-is-not-written',
    );
    expect(refusalOf(() => markDayLogSynced(db, { day: firstDay, revision: 1 }))).toBe(
      'revision-is-behind',
    );
    expect(refusalOf(() => markDayLogSynced(db, { day: '2026-01-01', revision: 1 }))).toBe(
      'day-is-not-written',
    );
    expect(readDayLog(db, firstDay)?.syncedRevision).toBe(2);
  });
});

describe('the identifier of a row', () => {
  it('is a version 7 identifier carrying the time she wrote the day', () => {
    const db = migrated();

    const written = insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });

    expect(written.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(parseInt(written.id.slice(0, 8) + written.id.slice(9, 13), 16)).toBe(wroteAt.getTime());
  });

  it('differs between two days', () => {
    const db = migrated();

    const one = insertDayLog(db, { day: firstDay, payload: firstPayload, now: wroteAt });
    const two = insertDayLog(db, { day: '2026-09-15', payload: firstPayload, now: wroteAt });

    expect(one.id).not.toBe(two.id);
  });

  it('is kept when a restore brings its own', () => {
    const db = migrated();

    const written = insertDayLog(db, {
      day: firstDay,
      payload: firstPayload,
      now: wroteAt,
      id: '0199a0f0-1234-7abc-8def-0123456789ab',
    });

    expect(written.id).toBe('0199a0f0-1234-7abc-8def-0123456789ab');
  });
});

describe('the version 7 identifier', () => {
  const random = new Uint8Array([0xff, 0x3c, 0xff, 1, 2, 3, 4, 5, 6, 7]);

  it('writes the millisecond count into the first six bytes', () => {
    expect(uuidV7(0x0199a0f01234, random)).toBe('0199a0f0-1234-7f3c-bf01-020304050607');
  });

  it('marks the version and the variant whatever the random bytes say', () => {
    const zeroes = uuidV7(1, new Uint8Array(uuidV7RandomByteCount));
    const ones = uuidV7(1, new Uint8Array(uuidV7RandomByteCount).fill(0xff));

    expect(zeroes).toBe('00000000-0001-7000-8000-000000000000');
    expect(ones).toBe('00000000-0001-7fff-bfff-ffffffffffff');
  });

  it('refuses a time or a random block it cannot use', () => {
    expect(() => uuidV7(-1, random)).toThrow(/whole millisecond count/);
    expect(() => uuidV7(1.5, random)).toThrow(/whole millisecond count/);
    expect(() => uuidV7(2 ** 48, random)).toThrow(/whole millisecond count/);
    expect(() => uuidV7(1, new Uint8Array(9))).toThrow(/10 random bytes/);
  });
});

function write(over: { day?: string; payload?: Uint8Array; now?: Date }): {
  day: string;
  payload: Uint8Array;
  now: Date;
} {
  return {
    day: over.day ?? firstDay,
    payload: over.payload ?? firstPayload,
    now: over.now ?? wroteAt,
  };
}

function insertedShape(over: { revision: number; payload: Uint8Array; updatedAt: Date }): unknown {
  return {
    id: expect.any(String),
    day: firstDay,
    payload: over.payload,
    revision: over.revision,
    createdAt: wroteAt.toISOString(),
    updatedAt: over.updatedAt.toISOString(),
    deletedAt: null,
    syncedRevision: null,
  };
}

function rawInsert(
  db: Database,
  row: {
    id: string;
    day: string;
    payload?: Uint8Array;
    createdAt?: string;
    updatedAt?: string;
  },
): void {
  db.run(
    `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [
      row.id,
      row.day,
      row.payload ?? firstPayload,
      row.createdAt ?? '2026-09-14T08:15:00.000Z',
      row.updatedAt ?? '2026-09-14T08:15:00.000Z',
    ],
  );
}
