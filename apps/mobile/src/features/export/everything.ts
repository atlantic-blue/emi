import { base64Of } from '@emi/crypto';

import type { Database } from '../../data/database';
import { schemaVersion } from '../../data/schema';
import type { DayVault } from '../../services/vault/dayVault';

/**
 * Everything the database holds, read by walking the database rather than by naming the tables and
 * the columns here. A column added by a later migration reaches the export because the walk finds
 * it, which is the one way a field cannot go missing: a list written by hand is a list that falls
 * behind the schema it describes.
 *
 * Names are carried across exactly as SQLite holds them, tables and columns alike, so the file and
 * the database can be read side by side with nothing to translate.
 */

export const exportFormat = 'emi.export.v1';

/** One value as the file carries it. A sealed column arrives here already opened. */
export type ExportedValue = string | number | null | Readonly<Record<string, unknown>>;

export type ExportedRow = Readonly<Record<string, ExportedValue>>;

export interface Everything {
  readonly format: string;
  /** When the file was written, which is the only value in it that is not hers. */
  readonly writtenAt: string;
  /** The migration the phone had reached, so an importer knows which shape it is reading. */
  readonly schemaVersion: number;
  readonly tables: Readonly<Record<string, readonly ExportedRow[]>>;
}

interface Column {
  readonly name: string;
  /** 1 for the first part of the primary key, 2 for the second, 0 for a column outside it. */
  readonly pk: number;
}

/** The tables her data sits in. SQLite keeps its own bookkeeping here too, and that is not hers. */
export function tableNames(db: Database): string[] {
  return db
    .all<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )
    .map((row) => row.name);
}

export function columnsOf(db: Database, table: string): Column[] {
  return db.all<Column>(`PRAGMA table_info(${quoted(table)})`);
}

export function everythingIn(db: Database, vault: DayVault, writtenAt: Date): Everything {
  const tables: Record<string, readonly ExportedRow[]> = {};

  for (const table of tableNames(db)) {
    tables[table] = rowsOf(db, table, vault);
  }

  return {
    format: exportFormat,
    writtenAt: writtenAt.toISOString(),
    schemaVersion: schemaVersion(db),
    tables,
  };
}

/** How many of her records the file carries, which is what the screen says back to her. */
export function rowCount(everything: Everything, table: string): number {
  return everything.tables[table]?.length ?? 0;
}

function rowsOf(db: Database, table: string, vault: DayVault): ExportedRow[] {
  const columns = columnsOf(db, table);
  const rows = db.all<Record<string, unknown>>(
    `SELECT * FROM ${quoted(table)} ORDER BY ${order(columns)}`,
  );

  return rows.map((row) => {
    const exported: Record<string, ExportedValue> = {};

    for (const column of columns) {
      exported[column.name] = exportedValue(row[column.name], vault);
    }

    return exported;
  });
}

/**
 * The primary key, in its own order, so two exports of one phone produce the same file. A table
 * without one falls back to the column it was declared with first, which is still an order and is
 * never an accident of how SQLite happened to store the rows.
 */
function order(columns: readonly Column[]): string {
  const key = columns.filter((column) => column.pk > 0).sort((one, two) => one.pk - two.pk);
  const sorted = key.length > 0 ? key : columns.slice(0, 1);

  return sorted.map((column) => quoted(column.name)).join(', ');
}

/**
 * Bytes in a column are a sealed record, so they are opened and carried as the day she wrote. A
 * blob the vault cannot open is written as base 64 instead of being dropped, because bytes nobody
 * can read are still hers and an export that quietly loses a column is the failure this walk
 * exists to prevent.
 */
function exportedValue(value: unknown, vault: DayVault): ExportedValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Uint8Array) {
    return opened(value, vault);
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  return String(value);
}

function opened(bytes: Uint8Array, vault: DayVault): ExportedValue {
  try {
    return vault.open(bytes) as unknown as Readonly<Record<string, unknown>>;
  } catch {
    return base64Of(bytes);
  }
}

/** A name from the schema goes back into a statement, so it is quoted the way SQLite quotes one. */
function quoted(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
