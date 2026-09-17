import type { Migration } from '../schema';

/** The one form `Date.toISOString` produces, which is what lets the table compare instants as text. */
const instantPattern =
  "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'";

const dayPattern = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";

/**
 * STRICT makes the declared types real, so a note written into `revision` is refused rather than
 * quietly stored. It does not refuse a number in a text column, because SQLite can always write a
 * number as text, and the patterns below are what close that door.
 */
const createDayLog = `
CREATE TABLE day_log (
  id TEXT NOT NULL PRIMARY KEY,
  day TEXT NOT NULL,
  payload BLOB NOT NULL,
  revision INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  synced_revision INTEGER,
  CHECK (day GLOB ${dayPattern}),
  CHECK (length(payload) > 0),
  CHECK (revision >= 1),
  CHECK (created_at GLOB ${instantPattern}),
  CHECK (updated_at GLOB ${instantPattern}),
  CHECK (updated_at >= created_at),
  CHECK (deleted_at IS NULL OR (deleted_at GLOB ${instantPattern} AND deleted_at >= created_at)),
  CHECK (synced_revision IS NULL OR synced_revision <= revision)
) STRICT
`;

/** One index carries both the unique day and the lookup every date query makes. */
const createDayIndex = `CREATE UNIQUE INDEX day_log_day ON day_log (day)`;

const createUnsyncedIndex = `CREATE INDEX day_log_unsynced ON day_log (synced_revision, revision)`;

/**
 * The revision is what the server orders writes by, so a write that does not raise it is refused by
 * the table rather than trusted from the caller. It guards the two columns that carry her day. The
 * sync marker is not one of them: writing `synced_revision` records what the server already has, so
 * a revision there would make the row unsent again the moment it was marked sent.
 */
const createRevisionGuard = `
CREATE TRIGGER day_log_revision_rises
BEFORE UPDATE OF payload, deleted_at ON day_log
WHEN NEW.revision <= OLD.revision
BEGIN
  SELECT RAISE(ABORT, 'day_log revision must rise on every write');
END
`;

export const dayLogMigration: Migration = {
  version: 1,
  name: 'day log',
  statements: [createDayLog, createDayIndex, createUnsyncedIndex, createRevisionGuard],
};
