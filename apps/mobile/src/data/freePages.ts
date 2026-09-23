import type { Database } from './database';

/**
 * SQLite does not erase what it takes out of a table. A deleted row, and the old copy of a row an
 * update replaced, stay in the file on a page nothing points at any more, until some later write
 * happens to need that page. So a table that no longer holds her cycle length is not a file that no
 * longer holds it.
 *
 * Two settings together take it out of the file as well. The first writes zeroes over a row as it
 * goes, and the second rebuilds the file out of the pages still in use. Both are needed: the first
 * does nothing for a row an update replaced, and the second leaves a window between the write and
 * the rebuild in which the plain bytes are still there.
 */

/**
 * Zeroes over every row this connection removes from here on, rather than leaving it where it lay.
 * It is a setting of the connection, so it holds until the connection closes and is written where
 * the pass that needs it can be read beside it.
 */
export function writeOverWhatIsRemoved(db: Database): void {
  db.execute('PRAGMA secure_delete = ON');
}

/** The journal this database keeps, which decides whether the rebuild below is the whole job. */
export function journalKept(db: Database): string {
  return db.all<{ journal_mode: string }>('PRAGMA journal_mode')[0]?.journal_mode ?? '';
}

/**
 * The file, written again from the rows that are still in it.
 *
 * A database that keeps a write ahead log is rebuilt into that log and not into the file, so the
 * file still reads the old way to anything that opens it until the log is folded back in. The
 * application never closes its database, and closing is the only other moment that happens, so the
 * fold is asked for here. A database that keeps a rollback journal instead is already written.
 *
 * It costs the whole file, so it is asked for by a pass that moved something and never by a launch
 * that had nothing to move.
 */
export function rebuildTheFile(db: Database): void {
  // A vacuum cannot run inside a transaction, so every caller commits before it reaches here.
  db.execute('VACUUM');

  if (journalKept(db) === 'wal') {
    db.execute('PRAGMA wal_checkpoint(TRUNCATE)');
  }
}
