import type { DayVault } from '../services/vault/dayVault';
import type { ProfileVault } from '../services/vault/profileVault';
import type { Database } from './database';
import { rebuildTheFile } from './freePages';
import { type EncryptOutcome, encryptPlainPayloads } from './migrations/004-encrypt-payloads';
import {
  type CycleLengthOutcome,
  moveCycleLengthIntoProfile,
} from './migrations/006-cycle-length-into-profile';

/**
 * The two passes that cannot be statements, run together on the launch that holds her key.
 *
 * They are run in one place because the file is rebuilt once for both of them rather than once
 * each: a rebuild writes every page of her history out again, and a launch that has moved nothing
 * must not pay for one at all.
 */

export interface LaunchOutcome {
  readonly days: EncryptOutcome;
  readonly cycleLength: CycleLengthOutcome;
  /** Whether the file was written again, which is what takes the plain copies out of it. */
  readonly fileRebuilt: boolean;
}

/** Her key, in the two shapes the passes seal with. */
export interface HerVaults {
  readonly day: DayVault;
  readonly profile: ProfileVault;
}

export function runTheLaunchPasses(db: Database, vaults: HerVaults, now: Date): LaunchOutcome {
  const days = encryptPlainPayloads(db, vaults.day, now);
  const cycleLength = moveCycleLengthIntoProfile(db, vaults.profile, now);
  const moved = days.sealed > 0 || tookThePlainKeyOut(cycleLength);

  if (moved) {
    rebuildTheFile(db);
  }

  return { days, cycleLength, fileRebuilt: moved };
}

/**
 * Both of these took the plain row out of the setting table. The third answer left it where it
 * was, and the fourth never found one, so neither of those has anything to rebuild the file for.
 */
function tookThePlainKeyOut(outcome: CycleLengthOutcome): boolean {
  return outcome.move === 'sealed-into-the-profile' || outcome.move === 'already-in-the-profile';
}
