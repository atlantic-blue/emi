import { CycleError, type Flow, toDayNumber } from '@emi/cycle';

import type { Database } from '../../data/database';
import type { DayVault } from '../../services/vault/dayVault';
import type { DayAndCycles } from '../cycle/rebuild';
import { flowLogged, logFlow, unexpectedLogged } from './logDay';

/**
 * Which days she may open, and the one write a day she opened takes. A day behind her is a memory
 * she can correct. A day ahead of her is a forecast, and a forecast she could type into would stop
 * being one.
 */

export type DayRefusal = 'day-is-not-a-date' | 'day-is-in-the-future';

export class DayEditError extends Error {
  readonly refusal: DayRefusal;

  constructor(refusal: DayRefusal, message: string) {
    super(message);
    this.name = 'DayEditError';
    this.refusal = refusal;
  }
}

export interface DayToOpen {
  readonly day: string;
  readonly today: string;
}

export interface DayEdit extends DayToOpen {
  readonly flow: Flow;
  /** Her mark on that day, as the screen holds it, on the same terms as a day she logs today. */
  readonly bleedingIsUnexpected?: boolean;
  readonly now: Date;
}

/**
 * Why the day cannot be opened, or nothing where it can. The day arrives in an address she can
 * type, so a day that is not a day is an answer here. Today comes from her own clock, so a today
 * that is not a day is ours and is thrown.
 */
export function refusalFor({ day, today }: DayToOpen): DayRefusal | undefined {
  let number: number;

  try {
    number = toDayNumber(day);
  } catch (thrown) {
    if (thrown instanceof CycleError) {
      return 'day-is-not-a-date';
    }
    throw thrown;
  }

  return number > toDayNumber(today) ? 'day-is-in-the-future' : undefined;
}

/** What she logged on that day, and nothing where she logged nothing at all. */
export function flowOn(db: Database, vault: DayVault, open: DayToOpen): Flow | undefined {
  requireSheCanEdit(open);

  return flowLogged(db, vault, open.day);
}

/** Whether she marked that day as not her period, so a day she reopens carries her own answer. */
export function unexpectedOn(db: Database, vault: DayVault, open: DayToOpen): boolean {
  requireSheCanEdit(open);

  return unexpectedLogged(db, vault, open.day);
}

/**
 * One press on a day she reopened. The write is the write today takes, because a day she is
 * correcting is a day like any other: it keeps what it already held and its revision rises.
 */
export function editFlow(db: Database, vault: DayVault, edit: DayEdit): DayAndCycles {
  requireSheCanEdit(edit);

  return logFlow(db, vault, {
    day: edit.day,
    flow: edit.flow,
    bleedingIsUnexpected: edit.bleedingIsUnexpected,
    now: edit.now,
  });
}

function requireSheCanEdit(open: DayToOpen): void {
  const refusal = refusalFor(open);

  if (refusal === 'day-is-not-a-date') {
    throw new DayEditError(
      refusal,
      `a day is written as YYYY-MM-DD, this one is ${JSON.stringify(open.day)}`,
    );
  }
  if (refusal === 'day-is-in-the-future') {
    throw new DayEditError(
      refusal,
      `${open.day} has not happened yet, and ${open.today} is the last day she can log`,
    );
  }
}
