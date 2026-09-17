import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { Database, SqlValue } from './database';

export const databaseFileName = 'emi.db';

export function openEmiDatabase(fileName: string = databaseFileName): Database {
  return expoDatabase(openDatabaseSync(fileName));
}

export function expoDatabase(sqlite: SQLiteDatabase): Database {
  return {
    execute: (sql: string): void => {
      sqlite.execSync(sql);
    },
    run: (sql: string, parameters: readonly SqlValue[] = []): void => {
      sqlite.runSync(sql, [...parameters]);
    },
    all: <Row>(sql: string, parameters: readonly SqlValue[] = []): Row[] =>
      sqlite.getAllSync<Row>(sql, [...parameters]),
  };
}
