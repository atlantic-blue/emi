import { type DayRecord, recordBytes, recordFromBytes } from '@emi/crypto';
import type { Flow } from '@emi/cycle';

import type { Database } from '../../data/database';
import { readDayLog } from '../../data/dayLogRepository';
import type { DayAndCycles } from '../cycle/rebuild';
import { editDay, logDay } from '../cycle/rebuild';

/**
 * One write of one day, from a screen. A day she already logged keeps everything else it holds,
 * because the flow picker is one control on a day that also carries her symptoms, and a write that
 * sent only the flow would delete the rest of her day.
 */

export interface FlowLog {
  readonly day: string;
  readonly flow: Flow;
  readonly now: Date;
}

export function logFlow(db: Database, log: FlowLog): DayAndCycles {
  const held = readDayLog(db, log.day);
  const record: DayRecord = {
    ...(held ? recordFromBytes(held.payload) : {}),
    day: log.day,
    flow: log.flow,
    recordedAt: log.now.toISOString(),
  };
  const write = { day: log.day, payload: recordBytes(record), now: log.now };

  return held ? editDay(db, write, recordFromBytes) : logDay(db, write, recordFromBytes);
}

/** What she picked for this day already, so the picker opens on her own answer. */
export function flowLogged(db: Database, day: string): Flow | undefined {
  const held = readDayLog(db, day);

  return held ? recordFromBytes(held.payload).flow : undefined;
}
