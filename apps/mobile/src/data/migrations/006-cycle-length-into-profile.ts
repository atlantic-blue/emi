import { longestCycleLengthDays, shortestCycleLengthDays } from '@emi/crypto';

import type { ProfileVault } from '../../services/vault/profileVault';
import type { Database } from '../database';
import { writeOverWhatIsRemoved } from '../freePages';
import { readProfile, writeProfile } from '../profileRepository';

/**
 * How long her cycle runs is a fact about her body, and until now it sat in the setting table as
 * plain text that any process reading the file could see. This moves it into the sealed profile
 * and takes the key out of the setting table.
 *
 * It is not a statement migration for the reason migration 004 is not one: sealing needs the vault
 * key, the key is in the keychain, and no SQL can read a keychain. So it runs in code on the first
 * launch that holds a key, beside the pass that sealed her older days. Every launch may run it,
 * and a phone that has nothing left to move writes nothing.
 */

/** The key the setting table held it under, which no `SettingKey` names any more. */
export const statedCycleLengthKey = 'cycleLengthDays';

export type CycleLengthMove =
  /** Nothing in the setting table, which is a phone whose first run already sealed its answers. */
  | 'no-setting-to-move'
  /** The number is in the profile now, and the setting table no longer holds it. */
  | 'sealed-into-the-profile'
  /** The profile already stated a cycle length, so the plain key was dropped and nothing sealed. */
  | 'already-in-the-profile'
  /** The stored value is not a cycle length, so it is left where it is rather than thrown away. */
  | 'not-a-cycle-length';

export interface CycleLengthOutcome {
  readonly move: CycleLengthMove;
  /** The number the profile states afterwards, and nothing when nothing was moved. */
  readonly cycleLengthDays?: number;
}

export function moveCycleLengthIntoProfile(
  db: Database,
  vault: ProfileVault,
  now: Date,
): CycleLengthOutcome {
  const held = statedInTheSettingTable(db);

  if (held === undefined) {
    return { move: 'no-setting-to-move' };
  }

  const days = Number(held);

  // A number the profile would refuse cannot be sealed, and deleting it would throw away the one
  // answer she gave. It stays in the setting table, and a launch after the bounds move takes it.
  if (!isASealableCycleLength(days)) {
    return { move: 'not-a-cycle-length' };
  }

  // The plain key is about to go, and a row SQLite unlinks stays in the file unless this is on.
  writeOverWhatIsRemoved(db);

  const stated = readProfile(db, vault);

  // Her profile is where the number lives from here, so a profile that already states one is the
  // answer and the plain key is the stale copy.
  if (stated?.cycleLengthDays !== undefined) {
    forget(db);
    return { move: 'already-in-the-profile', cycleLengthDays: stated.cycleLengthDays };
  }

  db.execute('BEGIN');
  try {
    writeProfile(db, vault, {
      // Every other answer she gave travels, so a profile written by a later first run keeps its
      // name and its goals while this adds the one field it is missing.
      profile: {
        kind: 'profile',
        ...stated,
        cycleLengthDays: days,
        // The moment this was sealed, because the setting table never held the moment she answered.
        recordedAt: stated?.recordedAt ?? now.toISOString(),
      },
      now,
    });
    forget(db);
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }

  return { move: 'sealed-into-the-profile', cycleLengthDays: days };
}

/** Read with the key written out, because `SettingKey` is the list of keys that may still be written. */
function statedInTheSettingTable(db: Database): string | undefined {
  return db.all<{ value: string }>('SELECT value FROM setting WHERE key = ?', [
    statedCycleLengthKey,
  ])[0]?.value;
}

function forget(db: Database): void {
  db.run('DELETE FROM setting WHERE key = ?', [statedCycleLengthKey]);
}

function isASealableCycleLength(days: number): boolean {
  return (
    Number.isInteger(days) && days >= shortestCycleLengthDays && days <= longestCycleLengthDays
  );
}
