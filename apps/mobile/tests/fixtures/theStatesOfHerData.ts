import type { DayRecord } from '@emi/crypto';

import type { Database } from '../../src/data/database';

/**
 * The four states of her data the screen she opens is read at. Nothing is built yet, so the list
 * below is empty and the guard measures no state at all.
 */

/** What her phone holds at one state: the counts her days come to, and the answers she gave. */
export interface HerData {
  readonly recordedDays: number;
  readonly completeCycles: number;
  readonly loggedToday: boolean;
  readonly dayOfHerCycle: number | undefined;
  readonly aSymptomCameBack: boolean;
  readonly gaveAName: boolean;
  readonly askedForTheFertileWindow: boolean;
  readonly askedForARecordForHerDoctor: boolean;
  readonly saidHerPeriodIsHard: boolean;
  readonly periodRunsFor: number;
}

/** The counts her days come to, which is the half of the above that moves between the states. */
export type HerDays = Pick<
  HerData,
  'recordedDays' | 'completeCycles' | 'loggedToday' | 'dayOfHerCycle'
>;

/** One state: what it is called, the days it seeds, and what those days come to. */
export interface HerDataState {
  readonly name: string;
  readonly days: readonly DayRecord[];
  readonly holds: HerData;
}

export function theStatesOfHerData(_today: string): HerDataState[] {
  return [];
}

export async function herPhoneHoldsThisState(
  _firstRunFinishedAt: Date,
  _state: HerDataState,
): Promise<void> {
  return undefined;
}

export function whatHerPhoneHolds(_database: Database, _today: string): HerDays {
  return { completeCycles: 0, dayOfHerCycle: undefined, loggedToday: false, recordedDays: 0 };
}
