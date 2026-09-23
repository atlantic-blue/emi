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
import { type RingInput, ringInputFor } from './ringInput';

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
  return ringInputFor({
    cycles: listCycles(db),
    records: recordedDays(db, vault.open),
    today,
    statedCycleLengthDays: statedCycleLengthDays(db, profiles) ?? defaultCycleLengthDays,
    statedPeriodLengthDays: statedPeriodLengthDays(db, profiles),
  });
}
