import type { Migration } from '../schema';

const dayPattern = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";

/**
 * The cache of design section 6.1. Every value in it is derived from `day_log`, so it carries no
 * revision and no sync marker: there is nothing here the server could be told, because there is
 * nothing here she entered.
 *
 * A cycle whose length is known is a cycle whose end is known, so the two columns are null together
 * or filled together. That the length matches the span is checked in the repository rather than
 * here, because a date function inside a CHECK constraint is a bet on the SQLite version the phone
 * ships.
 */
const createCycle = `
CREATE TABLE cycle (
  id TEXT NOT NULL PRIMARY KEY,
  started_on TEXT NOT NULL,
  ended_on TEXT,
  length_days INTEGER,
  period_length_days INTEGER,
  is_predicted INTEGER NOT NULL,
  CHECK (started_on GLOB ${dayPattern}),
  CHECK (ended_on IS NULL OR (ended_on GLOB ${dayPattern} AND ended_on >= started_on)),
  CHECK ((ended_on IS NULL) = (length_days IS NULL)),
  CHECK (length_days IS NULL OR length_days >= 1),
  CHECK (period_length_days IS NULL OR period_length_days >= 1),
  CHECK (is_predicted IN (0, 1))
) STRICT
`;

/** Two cycles cannot start on one day. */
const createStartIndex = `CREATE UNIQUE INDEX cycle_started_on ON cycle (started_on)`;

/**
 * A rebuild empties the table and writes it again, so an update is always somebody editing the
 * cache by hand. The day log is where a correction belongs, and the cache follows it.
 */
const createEditGuard = `
CREATE TRIGGER cycle_is_rebuilt_never_edited
BEFORE UPDATE ON cycle
BEGIN
  SELECT RAISE(ABORT, 'cycle is a cache, change the day log and rebuild it');
END
`;

export const cycleMigration: Migration = {
  version: 2,
  name: 'cycle cache',
  statements: [createCycle, createStartIndex, createEditGuard],
};
