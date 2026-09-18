import { startsACycle } from '@emi/cycle';

import type { Database, SqlValue } from '../../src/data/database';
import { listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { readSetting } from '../../src/data/settingRepository';
import {
  FirstRunError,
  type FirstRunRefusal,
  completeFirstRun,
  firstRunIsDone,
  longestLookBackDays,
  maximumCycleLengthDays,
  minimumCycleLengthDays,
  statedCycleLengthDays,
} from '../../src/features/onboarding/firstRun';
import { openTestDatabase } from '../data/nodeDatabase';
import { herVault } from '../fixtures/herVault';

const sheAnswered = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

/** The same database, with one statement refused, so a half written first run can be watched. */
function refusing(database: Database, table: string): Database {
  return {
    execute: (sql: string): void => database.execute(sql),
    run: (sql: string, parameters?: readonly SqlValue[]): void => {
      if (sql.includes(table)) {
        throw new Error(`the write to ${table} was refused`);
      }
      database.run(sql, parameters);
    },
    all: <Row>(sql: string, parameters?: readonly SqlValue[]): Row[] =>
      database.all<Row>(sql, parameters),
  };
}

/** The refusal a call gives, so a case names the rule rather than the wording of a message. */
function refusalFrom(run: () => void): FirstRunRefusal {
  try {
    run();
  } catch (error) {
    if (error instanceof FirstRunError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the first run accepted an answer it is written to refuse');
}

describe('the answers she gives on the first run', () => {
  describe('a day and a length that make sense', () => {
    it('writes the day she picked, as a day that starts a cycle', () => {
      const database = migrated();

      completeFirstRun(
        database,
        herVault(),
        { periodStartedOn: herPeriodStarted, cycleLengthDays: 30 },
        sheAnswered,
      );

      const row = readDayLog(database, herPeriodStarted);
      expect(row?.revision).toBe(1);
      expect(row && startsACycle(herVault().open(row.payload))).toBe(true);
      expect(row && herVault().open(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: sheAnswered.toISOString(),
      });
    });

    it('holds the length she stated and the instant she finished', () => {
      const database = migrated();

      completeFirstRun(
        database,
        herVault(),
        { periodStartedOn: herPeriodStarted, cycleLengthDays: 30 },
        sheAnswered,
      );

      expect(statedCycleLengthDays(database)).toBe(30);
      expect(readSetting(database, 'firstRunCompletedAt')).toBe(sheAnswered.toISOString());
      expect(firstRunIsDone(database)).toBe(true);
    });

    it('is not done before she answers', () => {
      const database = migrated();

      expect(firstRunIsDone(database)).toBe(false);
      expect(statedCycleLengthDays(database)).toBeUndefined();
    });
  });

  describe('a day she could not have bled on', () => {
    it('refuses a day after today', () => {
      const database = migrated();

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            herVault(),
            { periodStartedOn: '2026-05-15', cycleLengthDays: 28 },
            sheAnswered,
          ),
        ),
      ).toBe('period-start-is-in-the-future');
      expect(listDayLogs(database)).toEqual([]);
    });

    it('refuses a day further back than the list reaches', () => {
      const database = migrated();
      const tooFar = '2026-02-12';

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            herVault(),
            { periodStartedOn: tooFar, cycleLengthDays: 28 },
            sheAnswered,
          ),
        ),
      ).toBe('period-start-is-too-long-ago');
      expect(() =>
        completeFirstRun(
          database,
          herVault(),
          { periodStartedOn: tooFar, cycleLengthDays: 28 },
          sheAnswered,
        ),
      ).toThrow(new RegExp(`${longestLookBackDays}`));
      expect(listDayLogs(database)).toEqual([]);
    });
  });

  describe('a cycle length outside what a cycle runs', () => {
    it('refuses one day short of the shortest, one day past the longest, and a half day', () => {
      const database = migrated();

      for (const days of [minimumCycleLengthDays - 1, maximumCycleLengthDays + 1, 28.5]) {
        expect(
          refusalFrom(() =>
            completeFirstRun(
              database,
              herVault(),
              { periodStartedOn: herPeriodStarted, cycleLengthDays: days },
              sheAnswered,
            ),
          ),
        ).toBe('cycle-length-is-out-of-range');
      }
      expect(listDayLogs(database)).toEqual([]);
    });
  });

  describe('a first run that is already done', () => {
    it('refuses to be answered twice', () => {
      const database = migrated();
      completeFirstRun(
        database,
        herVault(),
        { periodStartedOn: herPeriodStarted, cycleLengthDays: 30 },
        sheAnswered,
      );

      expect(() =>
        completeFirstRun(
          database,
          herVault(),
          { periodStartedOn: '2026-05-10', cycleLengthDays: 29 },
          sheAnswered,
        ),
      ).toThrow(/already done/);
      expect(listDayLogs(database)).toHaveLength(1);
    });
  });

  describe('a write that fails halfway', () => {
    it('leaves no day behind, so she can answer the same day again', () => {
      const database = migrated();

      expect(() =>
        completeFirstRun(
          refusing(database, 'setting'),
          herVault(),
          { periodStartedOn: herPeriodStarted, cycleLengthDays: 30 },
          sheAnswered,
        ),
      ).toThrow(/refused/);
      expect(listDayLogs(database)).toEqual([]);

      completeFirstRun(
        database,
        herVault(),
        { periodStartedOn: herPeriodStarted, cycleLengthDays: 30 },
        sheAnswered,
      );
      expect(readDayLog(database, herPeriodStarted)?.revision).toBe(1);
    });
  });
});
