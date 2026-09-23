import type { Database } from '../../src/data/database';
import {
  ProfileTableError,
  markProfileSynced,
  profileIsUnsent,
  profileRow,
  readProfile,
  writeProfile,
  type ProfileRefusal,
} from '../../src/data/profileRepository';
import { migrate, runMigrations } from '../../src/data/schema';
import { dayLogMigration } from '../../src/data/migrations/001-day-log';
import { cycleMigration } from '../../src/data/migrations/002-cycle';
import { settingMigration } from '../../src/data/migrations/003-setting';

import { openTestDatabase } from './nodeDatabase';
import { herProfileVault } from '../fixtures/herVault';
import { aProfileRecord } from '../fixtures/profileRecord';

const sheAnsweredAt = new Date('2026-09-23T09:14:00.000Z');
const sheChangedItAt = new Date('2026-10-01T18:02:11.500Z');

function migrated(): Database {
  const db = openTestDatabase();
  migrate(db);
  return db;
}

function refusalOf(act: () => unknown): ProfileRefusal {
  try {
    act();
  } catch (error) {
    if (error instanceof ProfileTableError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the call was accepted and a refusal was expected');
}

/** What SQLite says when a statement is refused, which is the message the table itself raises. */
function refusalFromTheTable(act: () => unknown): string {
  try {
    act();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('the statement was accepted and a refusal was expected');
}

/** Bytes that pass every check the table makes, so a case about one column is about that column. */
function sealedAnswers(): Uint8Array {
  return herProfileVault().seal(aProfileRecord());
}

function insertRow(
  db: Database,
  values: Record<string, string | number | Uint8Array | null>,
): void {
  const names = Object.keys(values);
  db.run(
    `INSERT INTO profile (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
    names.map((name) => values[name] ?? null),
  );
}

function aWholeRow(
  overrides: Record<string, string | number | Uint8Array | null> = {},
): Record<string, string | number | Uint8Array | null> {
  return {
    id: '019995f2-4ac0-7000-8000-00000000000a',
    only_one: 1,
    payload: sealedAnswers(),
    revision: 1,
    created_at: sheAnsweredAt.toISOString(),
    updated_at: sheAnsweredAt.toISOString(),
    synced_revision: null,
    ...overrides,
  };
}

describe('the migration', () => {
  it('creates the seven columns of the contract, with their types and their nullability', () => {
    const db = migrated();

    const columns = db.all<{ name: string; type: string; notnull: number; pk: number }>(
      'PRAGMA table_info(profile)',
    );

    expect(columns.map((column) => [column.name, column.type, column.notnull, column.pk])).toEqual([
      ['id', 'TEXT', 1, 1],
      ['only_one', 'INTEGER', 1, 0],
      ['payload', 'BLOB', 1, 0],
      ['revision', 'INTEGER', 1, 0],
      ['created_at', 'TEXT', 1, 0],
      ['updated_at', 'TEXT', 1, 0],
      ['synced_revision', 'INTEGER', 0, 0],
    ]);
  });

  it('takes a phone from version 4 to version 5 and leaves the days it holds alone', () => {
    const db = openTestDatabase();

    runMigrations(db, [dayLogMigration, cycleMigration, settingMigration]);
    db.run(
      `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [
        '019995f2-4ac0-7000-8000-000000000001',
        '2026-09-14',
        sealedAnswers(),
        sheAnsweredAt.toISOString(),
        sheAnsweredAt.toISOString(),
      ],
    );
    // The sealing pass is version 4 and it runs in code, so a phone that has run every shipped
    // migration reports 3. A phone that reports 4 is one a later migration will number, and both
    // have to arrive at 5.
    db.execute('PRAGMA user_version = 4');

    const outcome = migrate(db);

    expect(outcome).toEqual({ from: 4, to: 5, applied: ['profile'] });
    expect(db.all('SELECT day FROM day_log')).toEqual([{ day: '2026-09-14' }]);
  });

  it('takes a phone that has run every shipped migration from version 3 to version 5', () => {
    const db = openTestDatabase();

    runMigrations(db, [dayLogMigration, cycleMigration, settingMigration]);

    expect(migrate(db)).toEqual({ from: 3, to: 5, applied: ['profile'] });
  });
});

describe('the table', () => {
  it('refuses a second row, whatever identifier it carries', () => {
    const db = migrated();

    insertRow(db, aWholeRow());

    expect(
      refusalFromTheTable(() =>
        insertRow(db, aWholeRow({ id: '019995f2-4ac0-7000-8000-00000000000b' })),
      ),
    ).toMatch(/UNIQUE constraint failed: profile.only_one/);
    expect(db.all('SELECT count(*) AS held FROM profile')).toEqual([{ held: 1 }]);
  });

  it('refuses a second row that names a different number in the column that holds it to one', () => {
    const db = migrated();

    insertRow(db, aWholeRow());

    expect(
      refusalFromTheTable(() =>
        insertRow(db, aWholeRow({ id: '019995f2-4ac0-7000-8000-00000000000b', only_one: 2 })),
      ),
    ).toMatch(/CHECK constraint failed/);
  });

  it('refuses a write to the payload whose revision does not rise', () => {
    const db = migrated();

    insertRow(db, aWholeRow());

    expect(
      refusalFromTheTable(() =>
        db.run('UPDATE profile SET payload = ? WHERE only_one = 1', [sealedAnswers()]),
      ),
    ).toMatch(/profile revision must rise on every write/);
  });

  it('refuses an empty payload, a revision below one and an instant that is not one', () => {
    const db = migrated();

    expect(
      refusalFromTheTable(() => insertRow(db, aWholeRow({ payload: new Uint8Array() }))),
    ).toMatch(/CHECK constraint failed/);
    expect(refusalFromTheTable(() => insertRow(db, aWholeRow({ revision: 0 })))).toMatch(
      /CHECK constraint failed/,
    );
    expect(
      refusalFromTheTable(() => insertRow(db, aWholeRow({ created_at: '23 September 2026' }))),
    ).toMatch(/CHECK constraint failed/);
  });

  it('refuses an update time behind the creation time', () => {
    const db = migrated();

    expect(
      refusalFromTheTable(() =>
        insertRow(db, aWholeRow({ updated_at: '2026-09-22T09:14:00.000Z' })),
      ),
    ).toMatch(/CHECK constraint failed/);
  });

  it('refuses a confirmed revision above the revision the phone holds', () => {
    const db = migrated();

    expect(refusalFromTheTable(() => insertRow(db, aWholeRow({ synced_revision: 2 })))).toMatch(
      /CHECK constraint failed/,
    );
  });

  it('lets the sync marker be written without the revision rising', () => {
    const db = migrated();

    insertRow(db, aWholeRow());
    db.run('UPDATE profile SET synced_revision = 1 WHERE only_one = 1');

    expect(profileRow(db)?.syncedRevision).toBe(1);
    expect(profileRow(db)?.revision).toBe(1);
  });
});

describe('the repository', () => {
  it('gives back nothing at all on a phone that has not been asked yet', () => {
    const db = migrated();

    expect(profileRow(db)).toBeUndefined();
    expect(readProfile(db, herProfileVault())).toBeUndefined();
  });

  it('writes her answers once and reads them back as she gave them', () => {
    const db = migrated();
    const hers = aProfileRecord();

    const row = writeProfile(db, herProfileVault(), { profile: hers, now: sheAnsweredAt });

    expect(row.revision).toBe(1);
    expect(row.createdAt).toBe(sheAnsweredAt.toISOString());
    expect(row.updatedAt).toBe(sheAnsweredAt.toISOString());
    expect(row.syncedRevision).toBeNull();
    expect(readProfile(db, herProfileVault())).toEqual(hers);
  });

  it('carries the identifier it was handed, so a restore writes the record the server holds', () => {
    const db = migrated();

    const row = writeProfile(db, herProfileVault(), {
      profile: aProfileRecord(),
      now: sheAnsweredAt,
      id: '019995f2-4ac0-7000-8000-0000000000ff',
    });

    expect(row.id).toBe('019995f2-4ac0-7000-8000-0000000000ff');
  });

  it('gives a new profile an identifier of its own, sorted by the moment it was written', () => {
    const db = migrated();

    const row = writeProfile(db, herProfileVault(), {
      profile: aProfileRecord(),
      now: sheAnsweredAt,
    });

    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('edits the row she has when she answers again, and raises the revision', () => {
    const db = migrated();
    const vault = herProfileVault();

    const first = writeProfile(db, vault, { profile: aProfileRecord(), now: sheAnsweredAt });
    const again = writeProfile(db, vault, {
      profile: aProfileRecord({ cycleLengthDays: 31, name: 'Mar' }),
      now: sheChangedItAt,
    });

    expect(again.id).toBe(first.id);
    expect(again.createdAt).toBe(sheAnsweredAt.toISOString());
    expect(again.updatedAt).toBe(sheChangedItAt.toISOString());
    expect(again.revision).toBe(2);
    expect(db.all('SELECT count(*) AS held FROM profile')).toEqual([{ held: 1 }]);
    expect(readProfile(db, vault)?.cycleLengthDays).toBe(31);
  });

  it('refuses a write time that is not a date, before anything reaches the table', () => {
    const db = migrated();

    expect(
      refusalOf(() =>
        writeProfile(db, herProfileVault(), {
          profile: aProfileRecord(),
          now: new Date('the afternoon'),
        }),
      ),
    ).toBe('instant-is-not-a-date');
    expect(profileRow(db)).toBeUndefined();
  });

  it('refuses bytes that are not an envelope, whatever handed them over', () => {
    const db = migrated();
    const aVaultThatSealsNothing = {
      seal: () => new TextEncoder().encode('{"cycleLengthDays":29,"kind":"profile"}'),
      open: () => aProfileRecord(),
    };

    expect(
      refusalOf(() =>
        writeProfile(db, aVaultThatSealsNothing, {
          profile: aProfileRecord(),
          now: sheAnsweredAt,
        }),
      ),
    ).toBe('payload-is-not-an-envelope');
    expect(profileRow(db)).toBeUndefined();
  });

  it('refuses a payload of no bytes at all', () => {
    const db = migrated();
    const aVaultThatSealsEmptiness = {
      seal: () => new Uint8Array(),
      open: () => aProfileRecord(),
    };

    expect(
      refusalOf(() =>
        writeProfile(db, aVaultThatSealsEmptiness, {
          profile: aProfileRecord(),
          now: sheAnsweredAt,
        }),
      ),
    ).toBe('payload-is-empty');
  });
});

describe('the marker the sync writes', () => {
  it('records what the server took, and leaves the revision where it is', () => {
    const db = migrated();
    const vault = herProfileVault();

    writeProfile(db, vault, { profile: aProfileRecord(), now: sheAnsweredAt });
    const marked = markProfileSynced(db, { revision: 1 });

    expect(marked.syncedRevision).toBe(1);
    expect(marked.revision).toBe(1);
    expect(profileIsUnsent(db)).toBe(false);
  });

  it('says the profile is unsent again once she answers something else', () => {
    const db = migrated();
    const vault = herProfileVault();

    writeProfile(db, vault, { profile: aProfileRecord(), now: sheAnsweredAt });
    markProfileSynced(db, { revision: 1 });
    writeProfile(db, vault, {
      profile: aProfileRecord({ feeling: 'fine' }),
      now: sheChangedItAt,
    });

    expect(profileIsUnsent(db)).toBe(true);
  });

  it('says nothing is unsent on a phone that holds no profile', () => {
    expect(profileIsUnsent(migrated())).toBe(false);
  });

  it('refuses a revision the phone never wrote', () => {
    const db = migrated();

    writeProfile(db, herProfileVault(), { profile: aProfileRecord(), now: sheAnsweredAt });

    expect(refusalOf(() => markProfileSynced(db, { revision: 2 }))).toBe('revision-is-not-written');
    expect(refusalOf(() => markProfileSynced(db, { revision: 0 }))).toBe('revision-is-not-written');
  });

  it('refuses a revision behind the one the server already took', () => {
    const db = migrated();
    const vault = herProfileVault();

    writeProfile(db, vault, { profile: aProfileRecord(), now: sheAnsweredAt });
    writeProfile(db, vault, { profile: aProfileRecord({ feeling: 'fine' }), now: sheChangedItAt });
    markProfileSynced(db, { revision: 2 });

    expect(refusalOf(() => markProfileSynced(db, { revision: 1 }))).toBe('revision-is-behind');
  });

  it('refuses to mark a phone that holds no profile', () => {
    expect(refusalOf(() => markProfileSynced(migrated(), { revision: 1 }))).toBe(
      'profile-is-not-written',
    );
  });
});
