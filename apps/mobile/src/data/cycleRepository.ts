import type { Database } from './database';
import { uuidV7, uuidV7RandomByteCount } from './uuidV7';

/**
 * The cycle table is a cache. This module is the only thing that writes it, and it writes it whole:
 * every row is deleted and the rows the arithmetic produced take their place. Nothing here decides
 * what a cycle is, because that is `packages/cycle`, and a cache that held an opinion of its own
 * would be a second source of truth.
 */

export interface CycleRow {
  readonly id: string;
  readonly startedOn: string;
  readonly endedOn: string | null;
  readonly lengthDays: number | null;
  readonly periodLengthDays: number | null;
  readonly isPredicted: boolean;
}

/** One cycle as the arithmetic produced it, before it has an identifier. */
export interface CycleEntry {
  readonly startedOn: string;
  readonly endedOn: string | null;
  readonly lengthDays: number | null;
  readonly periodLengthDays: number | null;
  readonly isPredicted: boolean;
}

export interface CycleCacheWrite {
  readonly cycles: readonly CycleEntry[];
  readonly now: Date;
}

export type CycleCacheRefusal =
  | 'day-is-not-a-date'
  | 'cycle-starts-twice'
  | 'cycle-ends-before-it-starts'
  | 'length-is-not-a-count'
  | 'length-does-not-match-the-span'
  | 'end-and-length-disagree'
  | 'cycles-are-not-in-order'
  | 'cycle-follows-an-open-cycle'
  | 'cycles-overlap';

export class CycleCacheError extends Error {
  readonly refusal: CycleCacheRefusal;

  constructor(refusal: CycleCacheRefusal, message: string) {
    super(message);
    this.name = 'CycleCacheError';
    this.refusal = refusal;
  }
}

const columns = `id, started_on AS startedOn, ended_on AS endedOn, length_days AS lengthDays,
  period_length_days AS periodLengthDays, is_predicted AS isPredicted`;

interface StoredCycle extends Omit<CycleRow, 'isPredicted'> {
  readonly isPredicted: number;
}

export function listCycles(db: Database): CycleRow[] {
  return db
    .all<StoredCycle>(`SELECT ${columns} FROM cycle ORDER BY started_on`)
    .map((row) => ({ ...row, isPredicted: row.isPredicted === 1 }));
}

export function readCycle(db: Database, startedOn: string): CycleRow | undefined {
  const rows = db.all<StoredCycle>(`SELECT ${columns} FROM cycle WHERE started_on = ?`, [
    startedOn,
  ]);
  const row = rows[0];
  return row ? { ...row, isPredicted: row.isPredicted === 1 } : undefined;
}

/** Empties the table and writes the cycles given, in one transaction, so a reader never sees half a rebuild. */
export function replaceCycles(db: Database, write: CycleCacheWrite): CycleRow[] {
  const checked = write.cycles.map(checkedCycle);
  for (let index = 1; index < checked.length; index += 1) {
    const before = checked[index - 1];
    const cycle = checked[index];
    if (!before || !cycle) {
      continue;
    }
    if (cycle.startedOn === before.startedOn) {
      throw new CycleCacheError(
        'cycle-starts-twice',
        `two cycles start on ${cycle.startedOn}, and a day starts one cycle`,
      );
    }
    if (cycle.startedOn < before.startedOn) {
      throw new CycleCacheError(
        'cycles-are-not-in-order',
        `${cycle.startedOn} is written after ${before.startedOn} and comes before it in the calendar`,
      );
    }
    if (before.endedOn === null) {
      throw new CycleCacheError(
        'cycle-follows-an-open-cycle',
        `the cycle starting ${before.startedOn} has not ended, and ${cycle.startedOn} starts another`,
      );
    }
    if (cycle.startedOn <= before.endedOn) {
      throw new CycleCacheError(
        'cycles-overlap',
        `the cycle starting ${before.startedOn} runs to ${before.endedOn}, and ${cycle.startedOn} starts inside it`,
      );
    }
  }

  db.execute('BEGIN');
  try {
    db.execute('DELETE FROM cycle');
    for (const cycle of checked) {
      db.run(
        `INSERT INTO cycle (id, started_on, ended_on, length_days, period_length_days, is_predicted)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newIdentifier(db, write.now),
          cycle.startedOn,
          cycle.endedOn,
          cycle.lengthDays,
          cycle.periodLengthDays,
          cycle.isPredicted ? 1 : 0,
        ],
      );
    }
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }

  return listCycles(db);
}

/**
 * The two columns the server orders a write by. A table that carries neither has nothing to send
 * and nothing to acknowledge, which is how the cache is kept out of the sync.
 */
export const syncMarkerColumns: readonly string[] = ['revision', 'synced_revision'];

export function syncMarkersOn(db: Database, table: string): string[] {
  const rows = db.all<{ name: string }>(`PRAGMA table_info(${quotedName(table)})`);
  return rows.map((row) => row.name).filter((name) => syncMarkerColumns.includes(name));
}

/** Every table the sync may send, read from the schema rather than from a list somebody maintains. */
export function tablesThatSync(db: Database): string[] {
  const tables = db.all<{ name: string }>(
    `SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  return tables.map((row) => row.name).filter((name) => syncMarkersOn(db, name).length > 0);
}

function quotedName(table: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) {
    throw new Error(`a table name is lowercase words joined by underscores, this one is ${table}`);
  }
  return table;
}

const dayShape = /^\d{4}-\d{2}-\d{2}$/;
const millisecondsInADay = 86_400_000;

function checkedCycle(cycle: CycleEntry): CycleEntry {
  const startedOn = checkedDay(cycle.startedOn);
  const endedOn = cycle.endedOn === null ? null : checkedDay(cycle.endedOn);

  if ((endedOn === null) !== (cycle.lengthDays === null)) {
    throw new CycleCacheError(
      'end-and-length-disagree',
      `the cycle starting ${startedOn} ends ${String(endedOn)} and is ${String(cycle.lengthDays)} days long`,
    );
  }
  checkedCount(cycle.periodLengthDays, `the period of the cycle starting ${startedOn}`);

  if (endedOn !== null && cycle.lengthDays !== null) {
    if (endedOn < startedOn) {
      throw new CycleCacheError(
        'cycle-ends-before-it-starts',
        `the cycle starting ${startedOn} ends on ${endedOn}`,
      );
    }
    checkedCount(cycle.lengthDays, `the cycle starting ${startedOn}`);
    const span = spanInDays(startedOn, endedOn);
    if (cycle.lengthDays !== span) {
      throw new CycleCacheError(
        'length-does-not-match-the-span',
        `the cycle starting ${startedOn} and ending ${endedOn} runs ${span} days and is written as ${cycle.lengthDays}`,
      );
    }
  }

  return { ...cycle, startedOn, endedOn };
}

function checkedCount(value: number | null, subject: string): void {
  if (value === null) {
    return;
  }
  if (!Number.isInteger(value) || value < 1) {
    throw new CycleCacheError(
      'length-is-not-a-count',
      `${subject} is written as ${value} days, and a length is a whole number of days from one`,
    );
  }
}

function checkedDay(day: string): string {
  if (!dayShape.test(day)) {
    throw new CycleCacheError(
      'day-is-not-a-date',
      `a day is written as YYYY-MM-DD, this one is ${JSON.stringify(day)}`,
    );
  }
  const asDate = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(asDate.getTime()) || asDate.toISOString().slice(0, 10) !== day) {
    throw new CycleCacheError('day-is-not-a-date', `${day} is not a day in the calendar`);
  }
  return day;
}

/** The first day counts, so a cycle from the fifth to the sixth runs two days. */
function spanInDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return (end - start) / millisecondsInADay + 1;
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
