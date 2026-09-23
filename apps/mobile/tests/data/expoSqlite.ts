import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * The application opens its database through expo-sqlite, which has no implementation off a phone.
 * This stands in for it with the SQLite that ships with Node, so every statement the application
 * runs is run by a real engine. One database for each name, as the phone does, so a second launch
 * reads what the first one wrote.
 */
const held = new Map<string, DatabaseSync>();

/**
 * Where the databases are written. A test that asks what the file itself holds names a directory,
 * because a database held in memory has no bytes to read, and every other test leaves it unnamed.
 */
let writtenInto: string | undefined;

export function expoSqliteWritesInto(directory: string): void {
  writtenInto = directory;
}

export function openDatabaseSync(name: string): SQLiteDatabase {
  const already = held.get(name);
  if (already) {
    return statements(already);
  }

  const opened = new DatabaseSync(writtenInto ? join(writtenInto, name) : ':memory:');
  held.set(name, opened);

  return statements(opened);
}

/** A fresh install: every database is forgotten. */
export function resetExpoSqlite(): void {
  for (const database of held.values()) {
    database.close();
  }
  held.clear();
  writtenInto = undefined;
}

// Three synchronous methods are all the application asks of expo-sqlite, so three are all this
// carries, and the cast is what says so out loud.
function statements(sqlite: DatabaseSync): SQLiteDatabase {
  return {
    execSync: (sql: string): void => {
      sqlite.exec(sql);
    },
    runSync: (sql: string, parameters: unknown[]): void => {
      sqlite.prepare(sql).run(...(parameters as never[]));
    },
    getAllSync: (sql: string, parameters: unknown[]): unknown[] =>
      sqlite.prepare(sql).all(...(parameters as never[])),
  } as unknown as SQLiteDatabase;
}
