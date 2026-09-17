import { DatabaseSync } from 'node:sqlite';

import type { Database, SqlValue } from '../../src/data/database';

/**
 * The tests run the application's own statements through the SQLite that ships with Node, so a
 * constraint is proved against a real engine rather than against a double that agrees with it.
 */
export function openTestDatabase(): Database {
  return nodeDatabase(new DatabaseSync(':memory:'));
}

export function nodeDatabase(sqlite: DatabaseSync): Database {
  return {
    execute: (sql: string): void => {
      sqlite.exec(sql);
    },
    run: (sql: string, parameters: readonly SqlValue[] = []): void => {
      sqlite.prepare(sql).run(...parameters);
    },
    all: <Row>(sql: string, parameters: readonly SqlValue[] = []): Row[] =>
      sqlite.prepare(sql).all(...parameters) as unknown as Row[],
  };
}
