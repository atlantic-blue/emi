import type { DayRecord } from '@emi/crypto';
import { type Flow, isBleeding } from '@emi/cycle';

import type { Database } from '../../data/database';
import { readDayLog } from '../../data/dayLogRepository';
import type { DayVault } from '../../services/vault/dayVault';
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

export function logFlow(db: Database, vault: DayVault, log: FlowLog): DayAndCycles {
  const held = readDayLog(db, log.day);
  const record: DayRecord = {
    ...(held ? withoutTheMark(vault.open(held.payload)) : {}),
    day: log.day,
    flow: log.flow,
    ...(marksTheBleeding(log) ? { bleedingIsUnexpected: true } : {}),
    recordedAt: log.now.toISOString(),
  };
  const write = { day: log.day, payload: vault.seal(record), now: log.now };

  return held ? editDay(db, write, vault.open) : logDay(db, write, vault.open);
}

/** What she picked for this day already, so the picker opens on her own answer. */
export function flowLogged(db: Database, vault: DayVault, day: string): Flow | undefined {
  const held = readDayLog(db, day);

  return held ? vault.open(held.payload).flow : undefined;
}

/** Whether she said this day's bleeding was not her period, so the mark opens the way she left it. */
export function unexpectedLogged(db: Database, vault: DayVault, day: string): boolean {
  const held = readDayLog(db, day);

  return held ? vault.open(held.payload).bleedingIsUnexpected === true : false;
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

export interface SymptomLog {
  readonly day: string;
  /** Every symptom the day carries after this write, and not the one she just pressed. */
  readonly symptoms: readonly string[];
  readonly now: Date;
}

/**
 * One write of the symptoms of one day, from the group the log opened on. The day keeps its flow,
 * its mark and everything else it holds, because the group is one control on a day that carries
 * the rest of her answers.
 */
export function logSymptoms(db: Database, vault: DayVault, log: SymptomLog): DayAndCycles {
  const held = readDayLog(db, log.day);
  const record: DayRecord = {
    ...(held ? withoutTheSymptoms(vault.open(held.payload)) : {}),
    day: log.day,
    // An empty list is left off rather than written, so a day she cleared holds nothing at all.
    ...(log.symptoms.length > 0 ? { symptoms: log.symptoms } : {}),
    recordedAt: log.now.toISOString(),
  };
  const write = { day: log.day, payload: vault.seal(record), now: log.now };

  return held ? editDay(db, write, vault.open) : logDay(db, write, vault.open);
}

/** What the day already carries, so the group opens on the answers she gave it before. */
export function symptomsLogged(db: Database, vault: DayVault, day: string): readonly string[] {
  const held = readDayLog(db, day);

  return held ? (vault.open(held.payload).symptoms ?? []) : [];
}

/** The day as it stands, with its symptoms taken off, because this write decides them itself. */
function withoutTheSymptoms(record: DayRecord): DayRecord {
  const { symptoms, ...rest } = record;

  return rest;
}
