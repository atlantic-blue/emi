import type { Migration } from '../schema';

/**
 * The pattern of migration 001, written again rather than imported from it. A shipped migration is
 * never edited, and exporting a constant out of one is an edit to a file a phone has already run.
 */
const instantPattern =
  "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'";

/**
 * Contract TABLE-5. One sealed profile, holding every first run answer that is not a day.
 *
 * `only_one` is the whole of the single row rule. It is unique and it may hold nothing but 1, so
 * the second insert is refused by the table rather than by the code above it, and a path that
 * forgets to look first cannot make a second profile.
 */
const createProfile = `
CREATE TABLE profile (
  id TEXT NOT NULL PRIMARY KEY,
  only_one INTEGER NOT NULL DEFAULT 1 UNIQUE,
  payload BLOB NOT NULL,
  revision INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_revision INTEGER,
  CHECK (only_one = 1),
  CHECK (length(payload) > 0),
  CHECK (revision >= 1),
  CHECK (created_at GLOB ${instantPattern}),
  CHECK (updated_at GLOB ${instantPattern}),
  CHECK (updated_at >= created_at),
  CHECK (synced_revision IS NULL OR synced_revision <= revision)
) STRICT
`;

/**
 * The revision orders her writes for the server, so a write that does not raise it is refused by
 * the table rather than trusted from the caller. It guards the payload alone: writing
 * `synced_revision` records what the server already holds, and a revision there would make the row
 * unsent again the moment it was marked sent.
 */
const createRevisionGuard = `
CREATE TRIGGER profile_revision_rises
BEFORE UPDATE OF payload ON profile
WHEN NEW.revision <= OLD.revision
BEGIN
  SELECT RAISE(ABORT, 'profile revision must rise on every write');
END
`;

/**
 * Version 5 and not 4. Four is the pass that sealed the days she wrote before the envelope
 * existed, and that one needs the key and the cipher, so it runs in code at launch and never
 * reaches `PRAGMA user_version`.
 */
export const profileMigration: Migration = {
  version: 5,
  name: 'profile',
  statements: [createProfile, createRevisionGuard],
};
