import type { DayRecord, Discharge, Orgasm, Product, Sex, SexDrive } from '@emi/crypto';
import { type Flow, isBleeding } from '@emi/cycle';

import type { Database } from '../../data/database';
import { readDayLog } from '../../data/dayLogRepository';
import type { DayVault } from '../../services/vault/dayVault';
import type { DayAndCycles, DaysAndCycles } from '../cycle/rebuild';
import { editDay, logDay, saveDays } from '../cycle/rebuild';

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
  const write = { day: log.day, payload: vault.seal(theDayAfter(db, vault, log)), now: log.now };

  return held ? editDay(db, write, vault.open) : logDay(db, write, vault.open);
}

/** One day of a save of many: which day, and the flow it takes. */
export interface DayFlow {
  readonly day: string;
  readonly flow: Flow;
}

export interface FlowsLog {
  readonly days: readonly DayFlow[];
  readonly now: Date;
}

/**
 * One save of the flow of several days, which is how a whole period is corrected in one action.
 *
 * Each day is built the way a day she logs on its own is built, so a day of the period keeps its
 * symptoms and everything else it holds. Every day is sealed before the write opens, because sealing
 * reads the day the table holds and the write is the part that has to be all or nothing.
 */
export function logFlows(db: Database, vault: DayVault, log: FlowsLog): DaysAndCycles {
  const writes = log.days.map((each) => ({
    day: each.day,
    payload: vault.seal(theDayAfter(db, vault, { ...each, now: log.now })),
    now: log.now,
  }));

  return saveDays(db, writes, vault.open, log.now);
}

/** The day as this write leaves it: what it already held, with the flow she just gave it. */
function theDayAfter(db: Database, vault: DayVault, log: FlowLog): DayRecord {
  const held = readDayLog(db, log.day);

  return {
    ...(held ? withoutTheMark(vault.open(held.payload)) : {}),
    day: log.day,
    flow: log.flow,
    ...(marksTheBleeding(log) ? { bleedingIsUnexpected: true } : {}),
    recordedAt: log.now.toISOString(),
  };
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

/**
 * What one write of the Cycle phase diary changes. Each list is the whole list after the press,
 * and a field left out is kept as the day holds it.
 */
export interface DiaryChange {
  readonly symptoms?: readonly string[];
  readonly moods?: readonly string[];
  readonly food?: readonly string[];
  readonly note?: string;
}

export interface DiaryLog {
  readonly day: string;
  readonly change: DiaryChange;
  readonly now: Date;
}

function isEmpty(value: string | readonly string[]): boolean {
  return typeof value === 'string' ? value.trim() === '' : value.length === 0;
}

/** The day with the change put in. An empty list or an empty note is left off, not written. */
function theDayWith(held: DayRecord | undefined, log: DiaryLog): DayRecord {
  const changed = Object.keys(log.change);
  const kept = Object.entries(held ?? {}).filter(([field]) => !changed.includes(field));
  const given = Object.entries(log.change).filter(
    (entry): entry is [string, string | readonly string[]] =>
      entry[1] !== undefined && !isEmpty(entry[1] as string | readonly string[]),
  );

  return {
    ...(Object.fromEntries([...kept, ...given]) as Partial<DayRecord>),
    day: log.day,
    recordedAt: log.now.toISOString(),
  };
}

/**
 * One write of the diary on the Cycle phase page. It goes through the same save as every other
 * write of a day, so the day keeps its flow and its mark, and a day with no flow cannot close her
 * period.
 */
export function logDiary(db: Database, vault: DayVault, log: DiaryLog): DayAndCycles {
  const held = readDayLog(db, log.day);
  const record = theDayWith(held ? vault.open(held.payload) : undefined, log);
  const write = { day: log.day, payload: vault.seal(record), now: log.now };

  return held ? editDay(db, write, vault.open) : logDay(db, write, vault.open);
}

/** The day as she left it, so the diary opens on the answers she gave it before. */
export function dayLogged(db: Database, vault: DayVault, day: string): DayRecord | undefined {
  const held = readDayLog(db, day);

  return held ? vault.open(held.payload) : undefined;
}

/** Her three answers on the Sex page. A field left out is a question she did not answer. */
export interface SexAnswers {
  readonly sex?: Sex;
  readonly sexDrive?: SexDrive;
  readonly orgasm?: Orgasm;
}

export interface SexLog {
  readonly day: string;
  /** The whole of what the page holds when she saves, so an answer she cleared is taken off. */
  readonly answers: SexAnswers;
  readonly now: Date;
}

/**
 * One save of the Sex page. The three answers replace the three the day held, and the day keeps its
 * flow, its symptoms and everything else, through the same save as every other write of a day.
 */
export function logSex(db: Database, vault: DayVault, log: SexLog): DayAndCycles {
  const held = readDayLog(db, log.day);
  const record: DayRecord = {
    ...(held ? withoutTheSexAnswers(vault.open(held.payload)) : {}),
    ...answersGiven(log.answers),
    day: log.day,
    recordedAt: log.now.toISOString(),
  };
  const write = { day: log.day, payload: vault.seal(record), now: log.now };

  return held ? editDay(db, write, vault.open) : logDay(db, write, vault.open);
}

/** The answers the day holds, so the page opens on what she saved before. */
export function sexLogged(db: Database, vault: DayVault, day: string): SexAnswers {
  const held = readDayLog(db, day);

  return held ? answersGiven(vault.open(held.payload)) : {};
}

/** Only the answers she gave, so an answer she cleared is left off rather than written empty. */
function answersGiven(from: SexAnswers): SexAnswers {
  return {
    ...(from.sex === undefined ? {} : { sex: from.sex }),
    ...(from.sexDrive === undefined ? {} : { sexDrive: from.sexDrive }),
    ...(from.orgasm === undefined ? {} : { orgasm: from.orgasm }),
  };
}

function withoutTheSexAnswers(record: DayRecord): DayRecord {
  const { sex, sexDrive, orgasm, ...rest } = record;

  return rest;
}

/** Her three answers on the Period page. A field left out is a question she did not answer. */
export interface PeriodAnswers {
  readonly flow?: Flow;
  readonly discharge?: Discharge;
  readonly products?: readonly Product[];
}

export interface PeriodLog {
  readonly day: string;
  /** The whole of what the page holds when she saves, so an answer she cleared is taken off. */
  readonly answers: PeriodAnswers;
  readonly now: Date;
}

/**
 * One save of the Period page. The flow, the discharge and the products replace what the day held,
 * through the same save as every other write of a day, so the flow keeps every period rule: a day
 * closes her period only when it carries a flow, and "No bleeding" is the flow `none`.
 *
 * The mark that the bleeding was not her period belongs to the bleeding, so it stays only while the
 * day still carries a bleeding flow.
 */
export function logPeriod(db: Database, vault: DayVault, log: PeriodLog): DayAndCycles {
  const held = readDayLog(db, log.day);
  const kept: Partial<DayRecord> = held ? withoutThePeriodAnswers(vault.open(held.payload)) : {};
  const { bleedingIsUnexpected, ...rest } = kept;
  const flow = log.answers.flow;
  const keepsTheMark =
    bleedingIsUnexpected === true && flow !== undefined && isBleeding({ day: log.day, flow });
  const record: DayRecord = {
    ...rest,
    ...periodAnswersGiven(log.answers),
    ...(keepsTheMark ? { bleedingIsUnexpected: true } : {}),
    day: log.day,
    recordedAt: log.now.toISOString(),
  };
  const write = { day: log.day, payload: vault.seal(record), now: log.now };

  return held ? editDay(db, write, vault.open) : logDay(db, write, vault.open);
}

/** The answers the day holds, so the page opens on what she saved before. */
export function periodLogged(db: Database, vault: DayVault, day: string): PeriodAnswers {
  const held = readDayLog(db, day);

  return held ? periodAnswersGiven(vault.open(held.payload)) : {};
}

/** Only the answers she gave. An empty list of products is left off rather than written empty. */
function periodAnswersGiven(from: PeriodAnswers): PeriodAnswers {
  return {
    ...(from.flow === undefined ? {} : { flow: from.flow }),
    ...(from.discharge === undefined ? {} : { discharge: from.discharge }),
    ...(from.products === undefined || from.products.length === 0
      ? {}
      : { products: from.products }),
  };
}

function withoutThePeriodAnswers(record: DayRecord): DayRecord {
  const { flow, discharge, products, ...rest } = record;

  return rest;
}
