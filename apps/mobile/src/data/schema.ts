import type { Database } from './database';
import { dayLogMigration } from './migrations/001-day-log';
import { cycleMigration } from './migrations/002-cycle';
import { settingMigration } from './migrations/003-setting';
import { profileMigration } from './migrations/005-profile';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly statements: readonly string[];
}

export interface MigrationOutcome {
  readonly from: number;
  readonly to: number;
  readonly applied: readonly string[];
}

/** In version order. A shipped migration is never edited, because a phone has already run it. */
export const migrations: readonly Migration[] = [
  dayLogMigration,
  cycleMigration,
  settingMigration,
  profileMigration,
];

export function schemaVersion(db: Database): number {
  const rows = db.all<{ user_version: number }>('PRAGMA user_version');
  return rows[0]?.user_version ?? 0;
}

export function migrate(db: Database): MigrationOutcome {
  return runMigrations(db, migrations);
}

export function runMigrations(db: Database, list: readonly Migration[]): MigrationOutcome {
  const from = schemaVersion(db);
  const applied: string[] = [];

  for (const migration of list) {
    if (migration.version <= from) {
      continue;
    }
    apply(db, migration);
    applied.push(migration.name);
  }

  return { from, to: schemaVersion(db), applied };
}

function apply(db: Database, migration: Migration): void {
  db.execute('BEGIN');
  try {
    for (const statement of migration.statements) {
      db.execute(statement);
    }
    // PRAGMA takes no parameter, so the version goes into the statement. A test holds every version
    // in the shipped list to a whole number.
    db.execute(`PRAGMA user_version = ${migration.version}`);
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }
}
