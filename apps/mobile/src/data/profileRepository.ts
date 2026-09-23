import { EnvelopeError, type ProfileRecord, readEnvelope } from '@emi/crypto';

import type { ProfileVault } from '../services/vault/profileVault';
import type { Database } from './database';
import { newIdentifier } from './identifier';

/**
 * Contract TABLE-5. The one profile this phone holds, written and read through her vault key.
 *
 * There is one row and it is replaced rather than added to, so every path here reads the row
 * first. The table refuses a second row on its own, and this module never relies on that: a
 * refusal at the edge of the database is the last line and not the first.
 */

export interface ProfileRow {
  readonly id: string;
  readonly payload: Uint8Array;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly syncedRevision: number | null;
}

export type ProfileRefusal =
  | 'instant-is-not-a-date'
  | 'payload-is-empty'
  | 'payload-is-not-an-envelope'
  | 'profile-is-not-written'
  | 'revision-is-not-written'
  | 'revision-is-behind';

/**
 * Named for the table and not for the record, because `@emi/crypto` raises a `ProfileError` when
 * an answer is outside its bounds and the two failures are answered in different places.
 */
export class ProfileTableError extends Error {
  readonly refusal: ProfileRefusal;

  constructor(refusal: ProfileRefusal, message: string) {
    super(message);
    this.name = 'ProfileTableError';
    this.refusal = refusal;
  }
}

export interface ProfileWrite {
  readonly profile: ProfileRecord;
  readonly now: Date;
  /** A restore carries the identifier the record already has. A first write leaves it out. */
  readonly id?: string;
}

export interface ProfileAcknowledgement {
  /** The revision the server holds. */
  readonly revision: number;
}

const columns = `id, payload, revision, created_at AS createdAt, updated_at AS updatedAt,
  synced_revision AS syncedRevision`;

/**
 * Her answers, sealed and stored. The first write makes the row and the rest edit it, so the
 * identifier and the creation time stay where the first write put them and the server reads every
 * later write as the record it already holds.
 */
export function writeProfile(db: Database, vault: ProfileVault, write: ProfileWrite): ProfileRow {
  const payload = checkedPayload(vault.seal(write.profile));
  const instant = checkedInstant(write.now);
  const held = profileRow(db);

  if (held) {
    db.run(
      'UPDATE profile SET payload = ?, revision = revision + 1, updated_at = ? WHERE only_one = 1',
      [payload, instant],
    );
  } else {
    db.run(
      `INSERT INTO profile (id, only_one, payload, revision, created_at, updated_at,
         synced_revision)
       VALUES (?, 1, ?, 1, ?, ?, NULL)`,
      [write.id ?? newIdentifier(db, write.now), payload, instant, instant],
    );
  }

  return written(db);
}

/** What she told Emi about herself, or nothing at all on a phone that has not been asked yet. */
export function readProfile(db: Database, vault: ProfileVault): ProfileRecord | undefined {
  const held = profileRow(db);

  return held ? vault.open(held.payload) : undefined;
}

/** The row as the table holds it, which is the sealed bytes and never an answer. */
export function profileRow(db: Database): ProfileRow | undefined {
  return db.all<ProfileRow>(`SELECT ${columns} FROM profile WHERE only_one = 1`)[0];
}

/**
 * The server accepted a revision of her profile. Her answers did not change, so this is the one
 * write that leaves the revision where it is.
 */
export function markProfileSynced(db: Database, seen: ProfileAcknowledgement): ProfileRow {
  const row = written(db);

  if (!Number.isInteger(seen.revision) || seen.revision < 1 || seen.revision > row.revision) {
    throw new ProfileTableError(
      'revision-is-not-written',
      `the profile is at revision ${row.revision}, and revision ${seen.revision} was acknowledged`,
    );
  }
  if (row.syncedRevision !== null && seen.revision < row.syncedRevision) {
    throw new ProfileTableError(
      'revision-is-behind',
      `the profile was acknowledged at revision ${row.syncedRevision} already`,
    );
  }

  db.run('UPDATE profile SET synced_revision = ? WHERE only_one = 1', [seen.revision]);

  return written(db);
}

/** Never acknowledged, or written again since it was, which is what feature 6 sends. */
export function profileIsUnsent(db: Database): boolean {
  const held = profileRow(db);

  return (
    held !== undefined && (held.syncedRevision === null || held.syncedRevision < held.revision)
  );
}

function written(db: Database): ProfileRow {
  const row = profileRow(db);
  if (!row) {
    throw new ProfileTableError('profile-is-not-written', 'this phone holds no profile');
  }
  return row;
}

function checkedInstant(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new ProfileTableError('instant-is-not-a-date', 'the write time is not a date');
  }
  return now.toISOString();
}

/**
 * The payload column carries an envelope and nothing else, so an answer she gave cannot reach the
 * table as text through any path. The shape is read the way the service reads it, with no key,
 * because this is a check on the bytes and not a read of her profile.
 */
function checkedPayload(payload: Uint8Array): Uint8Array {
  if (payload.byteLength === 0) {
    throw new ProfileTableError('payload-is-empty', 'a profile carries at least one byte');
  }

  try {
    readEnvelope(payload);
  } catch (error) {
    if (error instanceof EnvelopeError) {
      // The refusal names the shape and never the bytes, because bytes that are not an envelope
      // are the one thing here that might still be readable.
      throw new ProfileTableError(
        'payload-is-not-an-envelope',
        `a profile is stored as an envelope, and these ${payload.byteLength} bytes are not one: ${error.refusal}`,
      );
    }

    throw error;
  }

  return payload;
}
