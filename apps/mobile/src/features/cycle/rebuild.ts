import { EnvelopeError } from '@emi/crypto';
import type { Cycle, DayRecord } from '@emi/cycle';
import { cyclesFrom } from '@emi/cycle';

import type { CycleEntry, CycleRow } from '../../data/cycleRepository';
import { replaceCycles, replaceCyclesWithin } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import type { DayLogDelete, DayLogRow, DayLogWrite } from '../../data/dayLogRepository';
import {
  insertDayLog,
  listDayLogs,
  readDayLog,
  softDeleteDayLog,
  updateDayLog,
} from '../../data/dayLogRepository';
import { sheMayWrite } from '../../services/store/theWriteGate';

/**
 * Every write to the day log comes through this module, and every write rebuilds the cache from the
 * whole day log. A day she edits can move the start of the cycle it falls in, which moves the length
 * of the cycle before it and of every cycle after it, so there is no smaller correct rebuild.
 *
 * Every write here asks the gate of `theWriteGate.ts` first, and answers nothing where the gate
 * refuses her. The linter holds the day log's own write statements to this module, so a write path
 * built later asks the gate by having nowhere else to write.
 *
 * A delete asks nothing. Her own records stay hers to remove in every state.
 */

/**
 * Reading a day means decrypting it from feature 5 onwards, so the reader is handed in rather than
 * imported. Nothing in this module knows how a payload is written.
 */
export type ReadDay = (payload: Uint8Array) => DayRecord;

export interface DayAndCycles {
  readonly day: DayLogRow;
  readonly cycles: readonly CycleRow[];
}

/** The same, for a save that wrote more than one day, in the order it wrote them. */
export interface DaysAndCycles {
  readonly days: readonly DayLogRow[];
  readonly cycles: readonly CycleRow[];
}

/**
 * Every day she recorded, as the reader answers them. The reader's own type travels through, so a
 * caller holding a reader that opens the whole day reads the whole day back and never has to go to
 * the table a second time for the part this package does not care about.
 *
 * A day whose envelope does not open is left out, and its row stays in the table. One changed
 * byte would otherwise take every screen that reads her days down with it. The application writes
 * nothing to a log (contract VAULT-1), so the row is skipped without a word.
 */
export function recordedDays<Opened extends DayRecord>(
  db: Database,
  readDay: (payload: Uint8Array) => Opened,
): Opened[] {
  return listDayLogs(db).flatMap((row) => openedOrNothing(row.payload, readDay));
}

function openedOrNothing<Opened extends DayRecord>(
  payload: Uint8Array,
  readDay: (payload: Uint8Array) => Opened,
): Opened[] {
  try {
    return [readDay(payload)];
  } catch (error) {
    if (error instanceof EnvelopeError) {
      return [];
    }
    throw error;
  }
}

export function rebuildCycles(db: Database, readDay: ReadDay, now: Date): CycleRow[] {
  return replaceCycles(db, { cycles: cyclesRecorded(db, readDay), now });
}

/**
 * The same rebuild, for a caller that has already opened a transaction. The first run writes her
 * days and this cache under one, so the home screen she lands on either knows about every day she
 * gave or the hold wrote nothing at all.
 */
export function rebuildCyclesWithin(db: Database, readDay: ReadDay, now: Date): CycleRow[] {
  return replaceCyclesWithin(db, { cycles: cyclesRecorded(db, readDay), now });
}

/** Every cycle her days make, as the cache holds them. */
function cyclesRecorded(db: Database, readDay: ReadDay): CycleEntry[] {
  return cyclesFrom(recordedDays(db, readDay)).map(asEntry);
}

/**
 * A day she logs, or nothing at all where the gate refuses her. Nothing is read, nothing is
 * sealed again and the cache is left alone, so she is left exactly where she was.
 */
export function logDay(
  db: Database,
  write: DayLogWrite,
  readDay: ReadDay,
): DayAndCycles | undefined {
  if (!sheMayWrite(db)) {
    return undefined;
  }

  const day = insertDayLog(db, write);
  return { day, cycles: rebuildCycles(db, readDay, write.now) };
}

/** A day she corrects, on the same terms: the gate first, and nothing written where it refuses. */
export function editDay(
  db: Database,
  write: DayLogWrite,
  readDay: ReadDay,
): DayAndCycles | undefined {
  if (!sheMayWrite(db)) {
    return undefined;
  }

  const day = updateDayLog(db, write);
  return { day, cycles: rebuildCycles(db, readDay, write.now) };
}

/** A day she takes off. It asks no gate: removing her own record stays open in every state. */
export function deleteDay(db: Database, remove: DayLogDelete, readDay: ReadDay): DayAndCycles {
  const day = softDeleteDayLog(db, remove);
  return { day, cycles: rebuildCycles(db, readDay, remove.now) };
}

/**
 * Every day of one save, under one transaction, with the cache rebuilt once at the end of it.
 *
 * Her period is one thing she corrected, so half of it written is worse than none of it: the cache
 * would describe a period she never had. The rebuild is the one that joins a transaction already
 * open, because `replaceCycles` opens one of its own and SQLite holds no nested transaction.
 *
 * A day the table already holds is changed and a day it does not is written, so a caller hands over
 * the days it means to change and never has to ask which of the two each one is.
 *
 * The gate is asked before the transaction opens, so a refusal leaves no transaction behind.
 */
export function saveDays(
  db: Database,
  writes: readonly DayLogWrite[],
  readDay: ReadDay,
  now: Date,
): DaysAndCycles | undefined {
  if (writes.length === 0) {
    throw new Error('a save of no day would rebuild the cache for nothing');
  }

  if (!sheMayWrite(db)) {
    return undefined;
  }

  db.execute('BEGIN');

  try {
    const days = writes.map((write) =>
      readDayLog(db, write.day) === undefined ? insertDayLog(db, write) : updateDayLog(db, write),
    );
    const cycles = rebuildCyclesWithin(db, readDay, now);

    db.execute('COMMIT');

    return { cycles, days };
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
}

/** What the cache holds for a cycle, which is the arithmetic's own answer and nothing added to it. */
function asEntry(cycle: Cycle): CycleEntry {
  return {
    startedOn: cycle.startedOn,
    endedOn: cycle.endedOn,
    lengthDays: cycle.lengthDays,
    periodLengthDays: cycle.periodDays,
    isPredicted: false,
  };
}
