import type { Cycle, DayRecord } from '@emi/cycle';
import { cyclesFrom } from '@emi/cycle';

import type { CycleEntry, CycleRow } from '../../data/cycleRepository';
import { replaceCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import type { DayLogDelete, DayLogRow, DayLogWrite } from '../../data/dayLogRepository';
import {
  insertDayLog,
  listDayLogs,
  softDeleteDayLog,
  updateDayLog,
} from '../../data/dayLogRepository';

/**
 * Every write to the day log comes through this module, and every write rebuilds the cache from the
 * whole day log. A day she edits can move the start of the cycle it falls in, which moves the length
 * of the cycle before it and of every cycle after it, so there is no smaller correct rebuild.
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

export function recordedDays(db: Database, readDay: ReadDay): DayRecord[] {
  return listDayLogs(db).map((row) => readDay(row.payload));
}

export function rebuildCycles(db: Database, readDay: ReadDay, now: Date): CycleRow[] {
  const cycles = cyclesFrom(recordedDays(db, readDay));
  return replaceCycles(db, { cycles: cycles.map(asEntry), now });
}

export function logDay(db: Database, write: DayLogWrite, readDay: ReadDay): DayAndCycles {
  const day = insertDayLog(db, write);
  return { day, cycles: rebuildCycles(db, readDay, write.now) };
}

export function editDay(db: Database, write: DayLogWrite, readDay: ReadDay): DayAndCycles {
  const day = updateDayLog(db, write);
  return { day, cycles: rebuildCycles(db, readDay, write.now) };
}

export function deleteDay(db: Database, remove: DayLogDelete, readDay: ReadDay): DayAndCycles {
  const day = softDeleteDayLog(db, remove);
  return { day, cycles: rebuildCycles(db, readDay, remove.now) };
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
