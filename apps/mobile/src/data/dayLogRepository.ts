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
  | 'day-is-deleted'
  | 'revision-is-not-written'
  | 'revision-is-behind';

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

export interface DayLogAcknowledgement {
  readonly day: string;
  /** The revision the server holds. */
  readonly revision: number;
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
  if (held?.deletedAt != null) {
    return revive(db, { day, payload, instant });
  }
  if (held) {
    throw new DayLogError('day-already-written', `${day} is already written, edit it instead`);
  }

  db.run(
    `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at, deleted_at,
       synced_revision)
     VALUES (?, ?, ?, 1, ?, ?, NULL, NULL)`,
    [write.id ?? newIdentifier(db, write.now), day, payload, instant, instant],
  );

  return written(db, day);
}

/**
 * She deleted this day and logged it again. The row keeps its identifier and its creation time, so
 * the server reads it as the day it already holds rather than as a second one.
 */
function revive(
  db: Database,
  fresh: { day: string; payload: Uint8Array; instant: string },
): DayLogRow {
  db.run(
    `UPDATE day_log SET payload = ?, revision = revision + 1, updated_at = ?, deleted_at = NULL
     WHERE day = ? AND deleted_at IS NOT NULL`,
    [fresh.payload, fresh.instant, fresh.day],
  );

  return written(db, fresh.day);
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

/**
 * The server accepted a revision of this day. Her record did not change, so this is the one write
 * that leaves the revision where it is. A deleted day is marked the same way, because the server
 * has to be told about the delete too.
 */
export function markDayLogSynced(db: Database, seen: DayLogAcknowledgement): DayLogRow {
  const day = checkedDay(seen.day);
  const row = record(db, day);
  if (!row) {
    throw new DayLogError('day-is-not-written', `${day} is not written`);
  }
  if (!Number.isInteger(seen.revision) || seen.revision < 1 || seen.revision > row.revision) {
    throw new DayLogError(
      'revision-is-not-written',
      `${day} is at revision ${row.revision}, and revision ${seen.revision} was acknowledged`,
    );
  }
  if (row.syncedRevision !== null && seen.revision < row.syncedRevision) {
    throw new DayLogError(
      'revision-is-behind',
      `${day} was acknowledged at revision ${row.syncedRevision} already`,
    );
  }

  db.run('UPDATE day_log SET synced_revision = ? WHERE day = ?', [seen.revision, day]);

  return written(db, day);
}

/** Never acknowledged, or written again since it was. A deleted day is here until the server sees it. */
export function unsentDayLogs(db: Database): DayLogRow[] {
  return db.all<DayLogRow>(
    `SELECT ${columns} FROM day_log
     WHERE synced_revision IS NULL OR synced_revision < revision
     ORDER BY day`,
  );
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
