import { listCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import type { DayVault } from '../../services/vault/dayVault';
import type { ProfileVault } from '../../services/vault/profileVault';
import {
  defaultCycleLengthDays,
  statedCycleLengthDays,
  statedPeriodLengthDays,
} from '../onboarding/firstRun';
import { recordedDays } from './rebuild';
import { type RingInput, type RingInputFrom, ringInputFor, ringOn } from './ringInput';

function herDays(
  db: Database,
  vault: DayVault,
  profiles: ProfileVault,
  today: string,
): RingInputFrom {
  return {
    cycles: listCycles(db),
    records: recordedDays(db, vault.open),
    today,
    statedCycleLengthDays: statedCycleLengthDays(db, profiles) ?? defaultCycleLengthDays,
    statedPeriodLengthDays: statedPeriodLengthDays(db, profiles),
  };
}

/**
 * The ring as her cycle stands now, read back out of the database every time. Nothing is patched in
 * memory, because a day she writes can move the start of the cycle she is in, which moves the day
 * she is on and the phase the bead sits in.
 */
export function ringNow(
  db: Database,
  vault: DayVault,
  profiles: ProfileVault,
  today: string,
): RingInput | undefined {
  return ringInputFor(herDays(db, vault, profiles, today));
}

export function ringOnTheDay(
  db: Database,
  vault: DayVault,
  profiles: ProfileVault,
  day: string,
): RingInput | undefined {
  return ringOn(herDays(db, vault, profiles, day), day);
}
