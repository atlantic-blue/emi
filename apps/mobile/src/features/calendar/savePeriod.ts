import type { DayRecord } from '@emi/crypto';
import { type Flow, addDays, daysBetween, isBleeding } from '@emi/cycle';

import type { CycleRow } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import type { DayVault } from '../../services/vault/dayVault';
import type { DaysAndCycles } from '../cycle/rebuild';
import { refusalFor } from '../log/editDay';
import { logFlows } from '../log/logDay';
import { firstRunFlow } from '../onboarding/firstRun';

/**
 * A whole period, saved in one action.
 *
 * What one save writes is the difference between the days Emi held and the days she is holding when
 * she presses Save. A day she left alone is left alone: its record is unchanged, so its revision
 * stays where it is and the server is never asked to take it again.
 */

export type PeriodRefusal = 'nothing-changed' | 'no-day-is-left' | 'day-is-not-hers-to-log';

export class PeriodSaveError extends Error {
  readonly refusal: PeriodRefusal;

  constructor(refusal: PeriodRefusal, message: string) {
    super(message);
    this.name = 'PeriodSaveError';
    this.refusal = refusal;
  }
}

export interface TheDaysSheIsHolding {
  /** The days Emi holds as her period, which is what the picker opened with. */
  readonly held: readonly string[];
  /** The days she is holding now, after every press. */
  readonly ticked: readonly string[];
}

export interface WhatSheChanged {
  readonly added: readonly string[];
  readonly removed: readonly string[];
}

export function whatSheChanged({ held, ticked }: TheDaysSheIsHolding): WhatSheChanged {
  const wasHers = new Set(held);
  const isHers = new Set(ticked);

  return {
    added: [...isHers].filter((day) => !wasHers.has(day)).sort(),
    removed: [...wasHers].filter((day) => !isHers.has(day)).sort(),
  };
}

/** Whether one save has anything to write. */
export function sheChangedSomething(changed: WhatSheChanged): boolean {
  return changed.added.length + changed.removed.length > 0;
}

/**
 * Whether the save may be made, which is what decides if Save is offered at all.
 *
 * Something has to have changed, and she has to be left holding a period rather than nothing. A
 * grid she cleared says she never bled that month, and this save would write a day with no bleeding
 * over every day of the period to say it: a woman who cleared it to start again would have told Emi
 * something she did not mean, in one press. A month she truly did not bleed in is corrected a day at
 * a time, where each day says so on its own.
 */
export function sheCanSave(holding: TheDaysSheIsHolding): boolean {
  return sheChangedSomething(whatSheChanged(holding)) && holding.ticked.length > 0;
}

export interface PeriodSave extends TheDaysSheIsHolding {
  /** Her own day, because a day she has not lived is a forecast and takes no record. */
  readonly today: string;
  readonly now: Date;
}

/**
 * The flow a day she adds takes. She is saying she bled on that day and never how heavily, and a
 * record has no other way to say a day was a bleeding day, so it takes the same middle value the
 * first run writes and she can change it on the day itself.
 */
const theFlowOfADaySheAdds: Flow = firstRunFlow;

/**
 * The flow a day she takes off takes. It is a recorded day with no bleeding rather than a deleted
 * row, because a day she logged symptoms on is still that day, and because a recorded day with no
 * bleeding is what tells the arithmetic a period ended.
 */
const theFlowOfADaySheTakesOff: Flow = 'none';

/**
 * One save of the whole period. Every day it changes becomes a day record whose revision rises, and
 * the cache is rebuilt from the day log afterwards rather than written.
 */
export function savePeriodRange(db: Database, vault: DayVault, save: PeriodSave): DaysAndCycles {
  const changed = whatSheChanged(save);

  if (!sheChangedSomething(changed)) {
    throw new PeriodSaveError(
      'nothing-changed',
      'she is holding the days Emi already held, so there is nothing to write',
    );
  }

  if (save.ticked.length === 0) {
    throw new PeriodSaveError(
      'no-day-is-left',
      'a period holds at least one day, and this save would leave her holding none',
    );
  }

  for (const day of [...changed.added, ...changed.removed]) {
    if (refusalFor({ day, today: save.today }) !== undefined) {
      throw new PeriodSaveError(
        'day-is-not-hers-to-log',
        `${day} is not a day she can record, and ${save.today} is the last one she can`,
      );
    }
  }

  return logFlows(db, vault, {
    days: [
      ...changed.added.map((day) => ({ day, flow: theFlowOfADaySheAdds })),
      ...changed.removed.map((day) => ({ day, flow: theFlowOfADaySheTakesOff })),
    ].sort((one, other) => one.day.localeCompare(other.day)),
    now: save.now,
  });
}

/**
 * The period of the cycle holding a day: the days of it she recorded bleeding on, from the day the
 * cycle started, for as long as the bleeding runs. A day ahead of her asks about the cycle she is
 * in, because no period ahead of her is a record yet.
 *
 * It is read off her records rather than off what the month drew, because the month draws today as
 * today whether she bled on it or not, and a woman correcting the period she is having right now
 * would find that day missing from her own period.
 */
export function thePeriodEmiHoldsAround(
  records: readonly DayRecord[],
  cycles: readonly CycleRow[],
  { day, today }: { readonly day: string; readonly today: string },
): string[] {
  const asked = day > today ? today : day;
  const holding = cycles.filter((cycle) => !cycle.isPredicted && cycle.startedOn <= asked).at(-1);
  if (holding === undefined) {
    return [];
  }

  const bled = new Set(records.filter((record) => isBleeding(record)).map((record) => record.day));
  const held: string[] = [];
  for (let each = holding.startedOn; bled.has(each); each = addDays(each, 1)) {
    held.push(each);
  }

  return held;
}

/** How many days after the last day of her period the list offers, as the board draws it. */
export const DAYS_LISTED_AFTER_THE_PERIOD = 2;

/** The first and the last day the list of her period shows. */
export interface DaysListed {
  readonly from: string;
  readonly to: string;
}

/**
 * The days the list opens with: her period and the two days after it, so a day she forgot to mark
 * at the end is one press away. Where Emi holds no day of that period, the list starts on the day
 * she asked about. It never reaches past today, because a day she has not lived takes no record.
 */
export function theDaysListedFirst(
  held: readonly string[],
  { day, today }: { readonly day: string; readonly today: string },
): DaysListed {
  const first = held[0] ?? (day > today ? today : day);
  const last = held.at(-1) ?? first;
  const to = addDays(last, DAYS_LISTED_AFTER_THE_PERIOD);

  return { from: first, to: to > today ? today : to };
}

/** Every day from the first to the last of the list, in order. */
export function theDaysOf(listed: DaysListed): string[] {
  return Array.from({ length: daysBetween(listed.from, listed.to) + 1 }, (_unused, index) =>
    addDays(listed.from, index),
  );
}
