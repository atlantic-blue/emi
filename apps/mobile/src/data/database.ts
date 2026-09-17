/**
 * The application opens SQLite through expo-sqlite, and the tests open the same statements through
 * the SQLite that ships with Node. Both run real SQLite, so a constraint that refuses a write in a
 * test refuses it on the phone.
 */
export type SqlValue = string | number | null | Uint8Array;

export interface Database {
  /** One or more statements with no parameters. */
  execute(sql: string): void;
  run(sql: string, parameters?: readonly SqlValue[]): void;
  all<Row>(sql: string, parameters?: readonly SqlValue[]): Row[];
}
