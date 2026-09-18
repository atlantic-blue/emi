/**
 * A cycle is derived from the days she recorded, and from nothing else. No function here reads a
 * clock, a database or a file, so the same days always produce the same cycles.
 */

/** The flow values of the day record, design section 6.2. */
export type Flow = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

/**
 * The part of a day that decides where a cycle starts. The rest of what she logged says nothing
 * about that, so this package never reads it.
 */
export interface DayRecord {
  readonly day: string;
  readonly flow?: Flow;
  /** She said this bleeding is not her period. Such a day never starts a cycle. */
  readonly bleedingIsUnexpected?: boolean;
}

/**
 * What can be known from the days she gave. Three of the four fields are null while this is the
 * cycle she is in, because each of them needs the cycle after this one.
 */
export interface Cycle {
  readonly startedOn: string;
  /** The day before the next cycle starts. Null while this cycle is the one she is in. */
  readonly endedOn: string | null;
  /** Null until the next cycle starts, because the length is the distance between two starts. */
  readonly lengthDays: number | null;
  /** Bleeding days from the start onwards. Null until a recorded day closes the bleeding. */
  readonly periodDays: number | null;
}

/**
 * Every way this package refuses, as a value, so a screen matches on the reason rather than on the
 * words of a message.
 */
export type CycleRefusal = 'day-is-not-a-date' | 'day-is-written-twice' | 'spread-is-not-a-length';

/**
 * Carries the refusal beside the message. The message is for a reader and the refusal is for the
 * code that catches it.
 */
export class CycleError extends Error {
  readonly refusal: CycleRefusal;

  constructor(refusal: CycleRefusal, message: string) {
    super(message);
    this.name = 'CycleError';
    this.refusal = refusal;
  }
}

/**
 * Bleeding may run for up to eight consecutive days and still be one period: the upper bound of
 * normal menstrual duration in FIGO System 1 (Munro, Critchley and Fraser 2018, International
 * Journal of Gynecology and Obstetrics 143(3):393 to 408, doi 10.1002/ijgo.12666). A bleeding day
 * inside that window continues the period she is already having. The next one starts a cycle.
 *
 * Without this bound the second day of a period would start a cycle of one day, and a period that
 * pauses for a day would start one of three.
 */
export const PERIOD_MAY_RUN_FOR_DAYS = 8;

const BLEEDING: readonly Flow[] = ['spotting', 'light', 'medium', 'heavy'];

/**
 * Spotting counts. The design gives her one way to say that bleeding is not her period, which is
 * the unexpected mark, so the amount of blood is not the thing that decides.
 */
export function isBleeding(record: DayRecord): boolean {
  return record.flow !== undefined && BLEEDING.includes(record.flow);
}

/**
 * Bleeding she did not mark as unexpected. The mark is hers, so Emi never decides on its own that
 * a bleed was not a period.
 */
export function startsACycle(record: DayRecord): boolean {
  return isBleeding(record) && record.bleedingIsUnexpected !== true;
}

const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_IN_A_DAY = 86_400_000;

/** Days since the first of January 1970, so that day arithmetic is addition. */
export function toDayNumber(day: string): number {
  if (!DAY_SHAPE.test(day)) {
    throw new CycleError(
      'day-is-not-a-date',
      `a day is written as YYYY-MM-DD, this one is ${JSON.stringify(day)}`,
    );
  }
  const instant = Date.parse(`${day}T00:00:00.000Z`);
  if (Number.isNaN(instant)) {
    throw new CycleError('day-is-not-a-date', `${day} is not a day in the calendar`);
  }
  const number = instant / MILLISECONDS_IN_A_DAY;
  if (toDay(number) !== day) {
    throw new CycleError('day-is-not-a-date', `${day} is not a day in the calendar`);
  }
  return number;
}

/**
 * The inverse of `toDayNumber`. It reads the number in Coordinated Universal Time, so the answer
 * does not move when the zone of the phone does.
 */
export function toDay(dayNumber: number): string {
  return new Date(dayNumber * MILLISECONDS_IN_A_DAY).toISOString().slice(0, 10);
}

/** Counts in whole days, so the hour a clock changes in the spring cannot take a day with it. */
export function addDays(day: string, count: number): string {
  return toDay(toDayNumber(day) + count);
}

/** Whole days, and negative when the second day is the earlier one. */
export function daysBetween(from: string, to: string): number {
  return toDayNumber(to) - toDayNumber(from);
}

interface Sorted {
  readonly record: DayRecord;
  readonly number: number;
}

function inDayOrder(days: readonly DayRecord[]): Sorted[] {
  const sorted = days
    .map((record) => ({ record, number: toDayNumber(record.day) }))
    .sort((one, other) => one.number - other.number);

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index]?.number === sorted[index - 1]?.number) {
      throw new CycleError(
        'day-is-written-twice',
        `${sorted[index]?.record.day} is written twice, and a day holds one record`,
      );
    }
  }
  return sorted;
}

interface Building {
  readonly startedOn: string;
  readonly startNumber: number;
  periodDays: number;
  /** The last day counted into the period, so that a recorded gap can close it. */
  lastPeriodDay: number;
  periodEnded: boolean;
}

/**
 * A cycle starts on the first bleeding day that is not marked unexpected, and ends the day before
 * the next such day. Days she never recorded say nothing either way, so a period is closed by a
 * recorded day that carries no bleeding, never by silence.
 */
export function cyclesFrom(days: readonly DayRecord[]): Cycle[] {
  const sorted = inDayOrder(days);
  const building: Building[] = [];

  for (const { record, number } of sorted) {
    const open = building[building.length - 1];

    if (startsACycle(record)) {
      if (!open || number - open.startNumber >= PERIOD_MAY_RUN_FOR_DAYS) {
        building.push({
          startedOn: record.day,
          startNumber: number,
          periodDays: 1,
          lastPeriodDay: number,
          periodEnded: false,
        });
        continue;
      }
      if (!open.periodEnded) {
        open.periodDays += 1;
        open.lastPeriodDay = number;
      }
      continue;
    }

    if (open && !open.periodEnded && number > open.lastPeriodDay) {
      open.periodEnded = true;
    }
  }

  return building.map((cycle, index) => {
    const next = building[index + 1];
    return {
      startedOn: cycle.startedOn,
      endedOn: next ? toDay(next.startNumber - 1) : null,
      lengthDays: next ? next.startNumber - cycle.startNumber : null,
      periodDays: cycle.periodEnded || next ? cycle.periodDays : null,
    };
  });
}

/** The cycles whose length is known, because the cycle after them has started. */
export function completeCycles(cycles: readonly Cycle[]): Cycle[] {
  return cycles.filter((cycle) => cycle.lengthDays !== null);
}

/**
 * The lengths that are known, in the order she lived them. A cycle that is still running has none
 * and is left out rather than guessed at.
 */
export function cycleLengths(cycles: readonly Cycle[]): number[] {
  const lengths: number[] = [];
  for (const cycle of cycles) {
    if (cycle.lengthDays !== null) {
      lengths.push(cycle.lengthDays);
    }
  }
  return lengths;
}
