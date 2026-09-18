import type { DayRecord } from '@emi/cycle';
import { cyclesFrom } from '@emi/cycle';

import {
  CycleCacheError,
  type CycleCacheRefusal,
  type CycleEntry,
  listCycles,
  readCycle,
  replaceCycles,
  syncMarkersOn,
  tablesThatSync,
} from '../../src/data/cycleRepository';
import type { Database } from '../../src/data/database';
import { editDay, rebuildCycles } from '../../src/features/cycle/rebuild';
import { encodeDay } from '../fixtures/dayPayload';
import { daysLogged, migratedDatabase, readDay } from '../fixtures/cycleCache';
import { daysOf, veryRegular } from '../../../../packages/cycle/tests/fixtures/recordedSets';

const rebuiltAt = new Date('2026-09-17T08:00:00.000Z');

const january: CycleEntry = {
  startedOn: '2026-01-05',
  endedOn: '2026-02-01',
  lengthDays: 28,
  periodLengthDays: 5,
  isPredicted: false,
};

const february: CycleEntry = {
  startedOn: '2026-02-02',
  endedOn: null,
  lengthDays: null,
  periodLengthDays: null,
  isPredicted: false,
};

function refusalOf(act: () => unknown): CycleCacheRefusal {
  try {
    act();
  } catch (error) {
    if (error instanceof CycleCacheError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the write was accepted and a refusal was expected');
}

function written(cycles: readonly CycleEntry[]): Database {
  const database = migratedDatabase();
  replaceCycles(database, { cycles, now: rebuiltAt });
  return database;
}

/** Everything the cache holds about a cycle except the identifier, which is fresh on every rebuild. */
function valuesIn(database: Database): CycleEntry[] {
  return listCycles(database).map((cycle) => ({
    startedOn: cycle.startedOn,
    endedOn: cycle.endedOn,
    lengthDays: cycle.lengthDays,
    periodLengthDays: cycle.periodLengthDays,
    isPredicted: cycle.isPredicted,
  }));
}

describe('the migration', () => {
  it('creates the six columns of the design, with their types and their nullability', () => {
    const database = migratedDatabase();

    const columns = database.all<{ name: string; type: string; notnull: number; pk: number }>(
      'PRAGMA table_info(cycle)',
    );

    expect(columns.map((column) => [column.name, column.type, column.notnull, column.pk])).toEqual([
      ['id', 'TEXT', 1, 1],
      ['started_on', 'TEXT', 1, 0],
      ['ended_on', 'TEXT', 0, 0],
      ['length_days', 'INTEGER', 0, 0],
      ['period_length_days', 'INTEGER', 0, 0],
      ['is_predicted', 'INTEGER', 1, 0],
    ]);
  });

  it('indexes the start of a cycle uniquely', () => {
    const database = migratedDatabase();

    const indexes = database.all<{ name: string; unique: number }>('PRAGMA index_list(cycle)');
    const startColumns = database.all<{ name: string }>('PRAGMA index_info(cycle_started_on)');

    expect(indexes.map((index) => [index.name, index.unique])).toContainEqual([
      'cycle_started_on',
      1,
    ]);
    expect(startColumns.map((column) => column.name)).toEqual(['started_on']);
  });
});

describe('the cache is written whole', () => {
  it('keeps the cycles in the order she lived them', () => {
    const database = written([january, february]);

    expect(listCycles(database).map((cycle) => cycle.startedOn)).toEqual([
      '2026-01-05',
      '2026-02-02',
    ]);
  });

  it('reads back every value it was given', () => {
    const database = written([january, february]);

    const stored = readCycle(database, '2026-01-05');

    expect(stored).toMatchObject(january);
    expect(readCycle(database, '2026-02-02')).toMatchObject(february);
    expect(readCycle(database, '2026-03-02')).toBeUndefined();
  });

  it('leaves nothing of the cycles it replaced', () => {
    const database = written([january, february]);

    replaceCycles(database, { cycles: [january], now: rebuiltAt });

    expect(listCycles(database).map((cycle) => cycle.startedOn)).toEqual(['2026-01-05']);
  });

  it('gives each row a fresh identifier, because no row is the same row twice', () => {
    const database = written([january]);
    const first = listCycles(database)[0]?.id;

    replaceCycles(database, { cycles: [january], now: rebuiltAt });

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(listCycles(database)[0]?.id).not.toBe(first);
  });

  it('writes nothing at all when one cycle in the rebuild is refused', () => {
    const database = written([january, february]);

    expect(() =>
      replaceCycles(database, {
        cycles: [january, { ...february, startedOn: 'the second of February' }],
        now: rebuiltAt,
      }),
    ).toThrow(CycleCacheError);
    expect(listCycles(database).map((cycle) => cycle.startedOn)).toEqual([
      '2026-01-05',
      '2026-02-02',
    ]);
  });
});

describe('the cache refuses', () => {
  it('a start that is not a day in the calendar', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() =>
        replaceCycles(database, {
          cycles: [{ ...january, startedOn: '2026-02-30' }],
          now: rebuiltAt,
        }),
      ),
    ).toBe('day-is-not-a-date');
  });

  it('two cycles starting on one day', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() =>
        replaceCycles(database, { cycles: [january, { ...january }], now: rebuiltAt }),
      ),
    ).toBe('cycle-starts-twice');
  });

  it('a cycle that ends before it starts', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() =>
        replaceCycles(database, {
          cycles: [{ ...january, endedOn: '2025-12-20', lengthDays: -15 }],
          now: rebuiltAt,
        }),
      ),
    ).toBe('cycle-ends-before-it-starts');
  });

  it('a length that does not match the days between the two ends', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() =>
        replaceCycles(database, { cycles: [{ ...january, lengthDays: 27 }], now: rebuiltAt }),
      ),
    ).toBe('length-does-not-match-the-span');
  });

  it('an end with no length, and a length with no end', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() =>
        replaceCycles(database, { cycles: [{ ...january, lengthDays: null }], now: rebuiltAt }),
      ),
    ).toBe('end-and-length-disagree');
    expect(
      refusalOf(() =>
        replaceCycles(database, { cycles: [{ ...february, lengthDays: 28 }], now: rebuiltAt }),
      ),
    ).toBe('end-and-length-disagree');
  });

  it('a period of no whole days', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() =>
        replaceCycles(database, {
          cycles: [{ ...january, periodLengthDays: 2.5 }],
          now: rebuiltAt,
        }),
      ),
    ).toBe('length-is-not-a-count');
  });

  it('cycles written out of order', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() => replaceCycles(database, { cycles: [february, january], now: rebuiltAt })),
    ).toBe('cycles-are-not-in-order');
  });

  it('a cycle that starts before the one before it has ended', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() =>
        replaceCycles(database, {
          cycles: [
            january,
            {
              startedOn: '2026-02-01',
              endedOn: '2026-02-28',
              lengthDays: 28,
              periodLengthDays: 5,
              isPredicted: false,
            },
          ],
          now: rebuiltAt,
        }),
      ),
    ).toBe('cycles-overlap');
  });

  it('a cycle that follows the one she is still in', () => {
    const database = migratedDatabase();

    expect(
      refusalOf(() =>
        replaceCycles(database, {
          cycles: [
            february,
            {
              startedOn: '2026-03-02',
              endedOn: '2026-03-29',
              lengthDays: 28,
              periodLengthDays: 5,
              isPredicted: false,
            },
          ],
          now: rebuiltAt,
        }),
      ),
    ).toBe('cycle-follows-an-open-cycle');
  });

  it('an edit, because a cache is rebuilt and never corrected', () => {
    const database = written([january]);

    expect(() =>
      database.run('UPDATE cycle SET length_days = 99 WHERE started_on = ?', ['2026-01-05']),
    ).toThrow('cycle is a cache, change the day log and rebuild it');
    expect(readCycle(database, '2026-01-05')?.lengthDays).toBe(28);
  });

  it('a row that claims to be neither recorded nor predicted', () => {
    const database = migratedDatabase();

    expect(() =>
      database.run(
        `INSERT INTO cycle (id, started_on, ended_on, length_days, period_length_days, is_predicted)
         VALUES ('one', '2026-01-05', NULL, NULL, NULL, 2)`,
      ),
    ).toThrow('CHECK constraint failed');
  });
});

describe('nothing in the cache syncs', () => {
  it('carries no revision and no sync marker, so there is nothing to send', () => {
    const database = migratedDatabase();

    expect(syncMarkersOn(database, 'cycle')).toEqual([]);
    expect(syncMarkersOn(database, 'day_log')).toEqual(['revision', 'synced_revision']);
  });

  it('is not among the tables the sync may send', () => {
    const database = migratedDatabase();

    expect(tablesThatSync(database)).toEqual(['day_log']);
  });
});

describe('the rebuild', () => {
  const days: readonly DayRecord[] = daysOf(veryRegular);

  it('writes what the pure functions produce from the same days, and nothing else', () => {
    const database = daysLogged(days, rebuiltAt);

    expect(valuesIn(database)).toEqual(
      cyclesFrom(days).map((cycle) => ({
        startedOn: cycle.startedOn,
        endedOn: cycle.endedOn,
        lengthDays: cycle.lengthDays,
        periodLengthDays: cycle.periodDays,
        isPredicted: false,
      })),
    );
    expect(valuesIn(database).length).toBeGreaterThan(0);
  });

  it('reaches the same cache from the same days, however many times it runs', () => {
    const database = daysLogged(days, rebuiltAt);
    const afterTheWrites = valuesIn(database);

    rebuildCycles(database, readDay, rebuiltAt);
    rebuildCycles(database, readDay, rebuiltAt);

    expect(valuesIn(database)).toEqual(afterTheWrites);
  });

  it('follows a day she corrects, not only a day she adds', () => {
    const database = daysLogged(days, rebuiltAt);

    editDay(
      database,
      {
        day: '2026-03-02',
        payload: encodeDay({ day: '2026-03-02', flow: 'none' }),
        now: rebuiltAt,
      },
      readDay,
    );

    expect(listCycles(database).map((cycle) => cycle.startedOn)).toContain('2026-03-03');
    expect(listCycles(database).map((cycle) => cycle.startedOn)).not.toContain('2026-03-02');
    expect(listCycles(database).map((cycle) => cycle.lengthDays)).toEqual([
      28,
      29,
      27,
      28,
      28,
      28,
      null,
    ]);
  });

  it('empties the cache when every day she recorded is gone', () => {
    const database = daysLogged(days, rebuiltAt);

    database.run('UPDATE day_log SET deleted_at = ?, revision = revision + 1', [
      rebuiltAt.toISOString(),
    ]);
    rebuildCycles(database, readDay, rebuiltAt);

    expect(listCycles(database)).toEqual([]);
  });
});
