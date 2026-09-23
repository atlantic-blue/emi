import type { Database } from '../../data/database';
import { rebuildTheFile, writeOverWhatIsRemoved } from '../../data/freePages';
import type { ServerDelete, ServerDeleteOutcome } from '../sync/deleteAccount';
import { syncKeychainItems } from '../sync/deviceKey';
import type { SecureStore } from './keychain';
import { recoveryConfirmedItem } from './recoveryConfirmed';
import { vaultKeyItem } from './vaultKey';

/**
 * Contract KEEP-3. Every row she wrote, every item that would open one, and the account on the
 * server, removed in a single action with nothing kept back.
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
  /** What the account on the server came to, which is asked for before anything here is touched. */
  readonly serverAccount: ServerDeleteOutcome;
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
 * The rows are written over as they go and the file is rebuilt afterwards, which is what takes
 * them out of the file and not only out of the tables. Without the two, her days are off the index
 * and still in the file, which is a delete she cannot see the difference from and an attacker can.
 */
export function emptyTheDatabase(db: Database): string[] {
  const tables = everyTable(db);

  writeOverWhatIsRemoved(db);
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
  rebuildTheFile(db);

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
 * The server goes first, because the signing key that proves the account is hers is one of the
 * items this call is about to destroy. Then her days, then the keys. Either order of the last two
 * leaves her data unreadable, and this one leaves nothing readable at any moment in between.
 *
 * A server that cannot be reached does not stop any of it. What it returns is counted from the
 * storage rather than assumed from the calls it made, which is the whole reason the screen can say
 * it is gone.
 */
export async function deleteEverything(
  db: Database,
  store: KeychainRemover,
  server: ServerDelete,
): Promise<WipeOutcome> {
  const serverAccount = await whatTheServerSaid(server);
  const tables = emptyTheDatabase(db);
  const keychain = await emptyTheKeychain(store);

  return {
    serverAccount,
    tables,
    keychainItems: keychain.removed,
    keychainItemsRefused: keychain.refused,
    rowsLeft: rowsHeld(db),
    freePagesLeft: freePagesHeld(db),
    pagesLeft: pagesHeld(db),
  };
}

/**
 * What the server half came to, with a raise read as not reached. Nothing about a network may stop
 * her days going, so the one call that can fail from outside the phone cannot throw out of here.
 */
async function whatTheServerSaid(server: ServerDelete): Promise<ServerDeleteOutcome> {
  try {
    return await server();
  } catch {
    return 'not-reached';
  }
}

/** Whether the delete finished on this phone, read from what the storage now holds. */
export function nothingIsLeft(outcome: WipeOutcome): boolean {
  return outcome.rowsLeft === 0 && outcome.keychainItemsRefused.length === 0;
}

/**
 * Whether the account on the server went too. A phone that never had an address to talk to never
 * made an account, so there was nothing there and nothing is left there.
 */
export function theServerCopyWentToo(outcome: WipeOutcome): boolean {
  return outcome.serverAccount !== 'not-reached';
}
