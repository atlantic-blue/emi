import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync } from 'node:sqlite';

/**
 * The application opens its database through expo-sqlite, which has no implementation off a phone.
 * This stands in for it with the SQLite that ships with Node, so every statement the application
 * runs is run by a real engine. One database for each name, as the phone does, so a second launch
 * reads what the first one wrote.
 */
const held = new Map<string, DatabaseSync>();

export function openDatabaseSync(name: string): SQLiteDatabase {
  const already = held.get(name);
  if (already) {
    return statements(already);
  }

  const opened = new DatabaseSync(':memory:');
  held.set(name, opened);

  return statements(opened);
}

/** A fresh install: every database is forgotten. */
export function resetExpoSqlite(): void {
  for (const database of held.values()) {
    database.close();
  }
  held.clear();
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
