import type { Database } from './database';
import { uuidV7, uuidV7RandomByteCount } from './uuidV7';

export interface DayLogRow {
  readonly id: string;
  readonly day: string;
  readonly payload: Uint8Array;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly syncedRevision: number | null;
}

export type DayLogRefusal =
  | 'day-is-not-a-date'
  | 'instant-is-not-a-date'
  | 'payload-is-empty'
  | 'day-already-written'
  | 'day-is-not-written'
  | 'day-is-deleted';

export class DayLogError extends Error {
  readonly refusal: DayLogRefusal;

  constructor(refusal: DayLogRefusal, message: string) {
    super(message);
    this.name = 'DayLogError';
    this.refusal = refusal;
  }
}

export interface DayLogWrite {
  readonly day: string;
  readonly payload: Uint8Array;
  readonly now: Date;
  /** A restore carries the identifier the record already has. A first write leaves it out. */
  readonly id?: string;
}

export interface DayLogDelete {
  readonly day: string;
  readonly now: Date;
}

const columns = `id, day, payload, revision, created_at AS createdAt, updated_at AS updatedAt,
  deleted_at AS deletedAt, synced_revision AS syncedRevision`;

export function insertDayLog(db: Database, write: DayLogWrite): DayLogRow {
  const day = checkedDay(write.day);
  const payload = checkedPayload(write.payload);
  const instant = checkedInstant(write.now);

  const held = record(db, day);
  if (held) {
    throw new DayLogError(
      'day-already-written',
      held.deletedAt === null
        ? `${day} is already written, edit it instead`
        : `${day} is already written and deleted`,
    );
  }

  db.run(
    `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at, deleted_at,
       synced_revision)
     VALUES (?, ?, ?, 1, ?, ?, NULL, NULL)`,
    [write.id ?? newIdentifier(db, write.now), day, payload, instant, instant],
  );

  return written(db, day);
}

export function updateDayLog(db: Database, write: DayLogWrite): DayLogRow {
  const day = checkedDay(write.day);
  const payload = checkedPayload(write.payload);
  const instant = checkedInstant(write.now);
  requireLive(db, day);

  db.run(
    `UPDATE day_log SET payload = ?, revision = revision + 1, updated_at = ?
     WHERE day = ? AND deleted_at IS NULL`,
    [payload, instant, day],
  );

  return written(db, day);
}

/** The row stays, because the server has to be told the day was deleted. */
export function softDeleteDayLog(db: Database, remove: DayLogDelete): DayLogRow {
  const day = checkedDay(remove.day);
  const instant = checkedInstant(remove.now);
  requireLive(db, day);

  db.run(
    `UPDATE day_log SET revision = revision + 1, updated_at = ?, deleted_at = ?
     WHERE day = ? AND deleted_at IS NULL`,
    [instant, instant, day],
  );

  return written(db, day);
}

export function readDayLog(db: Database, day: string): DayLogRow | undefined {
  const rows = db.all<DayLogRow>(
    `SELECT ${columns} FROM day_log WHERE day = ? AND deleted_at IS NULL`,
    [checkedDay(day)],
  );
  return rows[0];
}

export function listDayLogs(db: Database): DayLogRow[] {
  return db.all<DayLogRow>(`SELECT ${columns} FROM day_log WHERE deleted_at IS NULL ORDER BY day`);
}

function record(db: Database, day: string): DayLogRow | undefined {
  return db.all<DayLogRow>(`SELECT ${columns} FROM day_log WHERE day = ?`, [day])[0];
}

function written(db: Database, day: string): DayLogRow {
  const row = record(db, day);
  if (!row) {
    throw new DayLogError('day-is-not-written', `${day} was written and could not be read back`);
  }
  return row;
}

function requireLive(db: Database, day: string): DayLogRow {
  const row = record(db, day);
  if (!row) {
    throw new DayLogError('day-is-not-written', `${day} is not written, write it first`);
  }
  if (row.deletedAt !== null) {
    throw new DayLogError('day-is-deleted', `${day} is deleted`);
  }
  return row;
}

function newIdentifier(db: Database, now: Date): string {
  const rows = db.all<{ bytes: Uint8Array }>('SELECT randomblob(?) AS bytes', [
    uuidV7RandomByteCount,
  ]);
  const bytes = rows[0]?.bytes;
  if (!bytes) {
    throw new Error('SQLite returned no random bytes');
  }
  return uuidV7(now.getTime(), bytes);
}

const dayShape = /^\d{4}-\d{2}-\d{2}$/;

function checkedDay(day: string): string {
  if (!dayShape.test(day)) {
    throw new DayLogError(
      'day-is-not-a-date',
      `a day is written as YYYY-MM-DD, this one is ${JSON.stringify(day)}`,
    );
  }
  const asDate = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(asDate.getTime()) || asDate.toISOString().slice(0, 10) !== day) {
    throw new DayLogError('day-is-not-a-date', `${day} is not a day in the calendar`);
  }
  return day;
}

function checkedInstant(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new DayLogError('instant-is-not-a-date', 'the write time is not a date');
  }
  return now.toISOString();
}

function checkedPayload(payload: Uint8Array): Uint8Array {
  if (payload.byteLength === 0) {
    throw new DayLogError('payload-is-empty', 'a day carries at least one byte');
  }
  return payload;
}
