import { type DayRecord, recordBytes, recordFromBytes } from '@emi/crypto';
import { type Flow, isBleeding } from '@emi/cycle';

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
  /**
   * Her mark, as the screen holds it at the moment she presses. It is written every time rather
   * than carried over from the day, so a day she says she did not bleed on cannot keep a mark from
   * the answer before it.
   */
  readonly bleedingIsUnexpected?: boolean;
  readonly now: Date;
}

export function logFlow(db: Database, log: FlowLog): DayAndCycles {
  const held = readDayLog(db, log.day);
  const record: DayRecord = {
    ...(held ? withoutTheMark(recordFromBytes(held.payload)) : {}),
    day: log.day,
    flow: log.flow,
    ...(marksTheBleeding(log) ? { bleedingIsUnexpected: true } : {}),
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

/** Whether she said this day's bleeding was not her period, so the mark opens the way she left it. */
export function unexpectedLogged(db: Database, day: string): boolean {
  const held = readDayLog(db, day);

  return held ? recordFromBytes(held.payload).bleedingIsUnexpected === true : false;
}

/**
 * The mark belongs to bleeding, so a day carrying none carries no mark either. Without this a
 * woman who marked a spot and then said there was no bleeding after all would leave a record
 * saying that the bleeding she did not have was not her period.
 */
function marksTheBleeding(log: FlowLog): boolean {
  return log.bleedingIsUnexpected === true && isBleeding({ day: log.day, flow: log.flow });
}

/** The day as it stands, with the mark taken off, because this write decides the mark itself. */
function withoutTheMark(record: DayRecord): DayRecord {
  const { bleedingIsUnexpected, ...rest } = record;

  return rest;
}
