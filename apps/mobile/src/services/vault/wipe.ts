import type { Database } from '../../data/database';
import { syncKeychainItems } from '../sync/deviceKey';
import type { SecureStore } from './keychain';
import { recoveryConfirmedItem } from './recoveryConfirmed';
import { vaultKeyItem } from './vaultKey';

/**
 * Contract KEEP-3, the half that runs on her phone. Every row she wrote, and every item that would
 * open one, removed in a single action with nothing kept back.
 *
 * The tables are read out of the database rather than written down here, because a table added by
 * a later migration and forgotten in a hand written list is a table that survives a delete. The
 * keychain cannot be listed the same way, so each directory that keeps an item declares what it
 * keeps and the pipeline holds those declarations against the delete.
 */

/** Every keychain item Emi holds, from the directory that owns each one. */
export const wipedKeychainItems: readonly string[] = [
  vaultKeyItem,
  recoveryConfirmedItem,
  ...syncKeychainItems,
];

/** All this module is given of the keychain, so nothing here can read an item or list one. */
export type KeychainRemover = Pick<SecureStore, 'remove'>;

export interface WipeOutcome {
  /** The tables emptied, in the order they were read. */
  readonly tables: readonly string[];
  /** The keychain items removed. Every one is asked for, held or not. */
  readonly keychainItems: readonly string[];
  /** The items the platform would not let go of, which is a delete that did not finish. */
  readonly keychainItemsRefused: readonly string[];
  /** Rows left in the database afterwards, counted by reading it back. */
  readonly rowsLeft: number;
  /** Free pages left in the file afterwards, which is where deleted rows would still sit. */
  readonly freePagesLeft: number;
  /** Pages the file holds afterwards, which a delete that only unlinked rows would not change. */
  readonly pagesLeft: number;
}

interface NamedRow {
  readonly name: string;
}

interface CountRow {
  readonly count: number;
}

/**
 * The tables this database holds, as SQLite reports them. The ones SQLite keeps for itself are
 * left alone: they carry the schema and the sequence counters and nothing she wrote.
 */
export function everyTable(db: Database): string[] {
  return db
    .all<NamedRow>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )
    .map((row) => row.name);
}

/** How many rows the whole database holds, which after a delete is the number that matters. */
export function rowsHeld(db: Database): number {
  return everyTable(db)
    .map((table) => db.all<CountRow>(`SELECT count(*) AS count FROM "${table}"`)[0]?.count ?? 0)
    .reduce((total, count) => total + count, 0);
}

/** Pages the file keeps after a delete, and a deleted row lives on in one until it is reused. */
export function freePagesHeld(db: Database): number {
  return db.all<{ freelist_count: number }>('PRAGMA freelist_count')[0]?.freelist_count ?? 0;
}

/** How large the file is, in pages. A delete that leaves this where it was moved nothing. */
export function pagesHeld(db: Database): number {
  return db.all<{ page_count: number }>('PRAGMA page_count')[0]?.page_count ?? 0;
}

/**
 * Every row of every table, gone.
 *
 * `secure_delete` writes zeroes over what it removes instead of leaving it on a free page, and the
 * vacuum afterwards rebuilds the file out of the pages still in use. Without the two, her days are
 * off the index and still in the file, which is a delete she cannot see the difference from and an
 * attacker can.
 */
export function emptyTheDatabase(db: Database): string[] {
  const tables = everyTable(db);

  db.execute('PRAGMA secure_delete = ON');
  db.execute('BEGIN');
  try {
    for (const table of tables) {
      db.execute(`DELETE FROM "${table}"`);
    }
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
  // A vacuum cannot run inside a transaction, so it follows the commit rather than joining it.
  db.execute('VACUUM');

  return tables;
}

export interface KeychainOutcome {
  readonly removed: readonly string[];
  readonly refused: readonly string[];
}

/**
 * Every item Emi keeps, gone, whether this phone happened to hold it or not.
 *
 * One item the platform refuses does not stop the others: stopping there would leave three items
 * behind over one, and the refusal is carried out rather than thrown so the screen can say which
 * part of the delete did not happen.
 */
export async function emptyTheKeychain(
  store: KeychainRemover,
  items: readonly string[] = wipedKeychainItems,
): Promise<KeychainOutcome> {
  const removed: string[] = [];
  const refused: string[] = [];

  for (const item of items) {
    try {
      await store.remove(item);
      removed.push(item);
    } catch {
      refused.push(item);
    }
  }

  return { removed, refused };
}

/**
 * The one call the screen makes.
 *
 * Her days go before the keys do. Either order leaves her data unreadable, and this one leaves
 * nothing readable at any moment in between.
 *
 * What it returns is counted from the storage rather than assumed from the calls it made, which is
 * the whole reason the screen can say it is gone.
 */
export async function deleteEverything(db: Database, store: KeychainRemover): Promise<WipeOutcome> {
  const tables = emptyTheDatabase(db);
  const keychain = await emptyTheKeychain(store);

  return {
    tables,
    keychainItems: keychain.removed,
    keychainItemsRefused: keychain.refused,
    rowsLeft: rowsHeld(db),
    freePagesLeft: freePagesHeld(db),
    pagesLeft: pagesHeld(db),
  };
}

/** Whether the delete finished, read from what the storage now holds. */
export function nothingIsLeft(outcome: WipeOutcome): boolean {
  return outcome.rowsLeft === 0 && outcome.keychainItemsRefused.length === 0;
}
