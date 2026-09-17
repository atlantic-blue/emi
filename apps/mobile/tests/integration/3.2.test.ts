import type { DayRecord } from '@emi/cycle';
import { cyclesFrom } from '@emi/cycle';

import { listCycles, tablesThatSync } from '../../src/data/cycleRepository';
import type { Database } from '../../src/data/database';
import { listDayLogs, readDayLog, unsentDayLogs } from '../../src/data/dayLogRepository';
import { deleteDay, recordedDays } from '../../src/features/cycle/rebuild';
import { daysLogged, readDay } from '../fixtures/cycleCache';
import {
  daysOf,
  startsOf,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';

const loggedAt = new Date('2026-09-17T08:00:00.000Z');
const deletedAt = new Date('2026-09-17T21:30:00.000Z');

/** The first bleeding day of her third cycle, six months into the six she recorded. */
const theDaySheDeletes = '2026-03-02';

const sixCycles: readonly DayRecord[] = daysOf(veryRegular);

function startsIn(database: Database): string[] {
  return listCycles(database).map((cycle) => cycle.startedOn);
}

function lengthsIn(database: Database): (number | null)[] {
  return listCycles(database).map((cycle) => cycle.lengthDays);
}

function afterTheDelete(): Database {
  const database = daysLogged(sixCycles, loggedAt);
  deleteDay(database, { day: theDaySheDeletes, now: deletedAt }, readDay);
  return database;
}

describe('deleting a bleeding day rebuilds every cycle after it', () => {
  describe('the six cycles she logged', () => {
    it('fill the cache with one row for each cycle she lived', () => {
      const database = daysLogged(sixCycles, loggedAt);

      expect(startsIn(database)).toEqual(startsOf(veryRegular));
      expect(lengthsIn(database)).toEqual([28, 28, 28, 28, 28, 28, null]);
    });

    it('say the same thing in the cache as the arithmetic says about the same days', () => {
      const database = daysLogged(sixCycles, loggedAt);

      const cached = listCycles(database);
      const computed = cyclesFrom(recordedDays(database, readDay));

      expect(cached).toHaveLength(computed.length);
      expect(cached.map((cycle) => [cycle.startedOn, cycle.endedOn, cycle.lengthDays])).toEqual(
        computed.map((cycle) => [cycle.startedOn, cycle.endedOn, cycle.lengthDays]),
      );
      expect(cached.map((cycle) => cycle.periodLengthDays)).toEqual(
        computed.map((cycle) => cycle.periodDays),
      );
    });

    it('leave the cycle she is in open, with no end and no length', () => {
      const database = daysLogged(sixCycles, loggedAt);

      const current = listCycles(database)[6];

      expect(current?.startedOn).toBe('2026-06-22');
      expect(current?.endedOn).toBeNull();
      expect(current?.lengthDays).toBeNull();
      expect(current?.isPredicted).toBe(false);
    });
  });

  describe('the bleeding day she deletes in the middle', () => {
    it('is gone from her days, and the day after it now starts that cycle', () => {
      const database = afterTheDelete();

      expect(readDayLog(database, theDaySheDeletes)).toBeUndefined();
      expect(startsIn(database)).toEqual([
        '2026-01-05',
        '2026-02-02',
        '2026-03-03',
        '2026-03-30',
        '2026-04-27',
        '2026-05-25',
        '2026-06-22',
      ]);
      expect(startsIn(database)).not.toContain(theDaySheDeletes);
    });

    it('closes the cycle before it a day later and shortens the cycle it began', () => {
      const database = afterTheDelete();

      expect(lengthsIn(database)).toEqual([28, 29, 27, 28, 28, 28, null]);
      expect(listCycles(database)[1]?.endedOn).toBe('2026-03-02');
      expect(listCycles(database)[2]?.periodLengthDays).toBe(4);
    });

    it('leaves a cache that still matches the arithmetic, with no row from before the delete', () => {
      const database = afterTheDelete();

      const cached = listCycles(database);
      const computed = cyclesFrom(recordedDays(database, readDay));

      expect(cached.map((cycle) => [cycle.startedOn, cycle.lengthDays])).toEqual(
        computed.map((cycle) => [cycle.startedOn, cycle.lengthDays]),
      );
      expect(new Set(cached.map((cycle) => cycle.id)).size).toBe(cached.length);
    });
  });

  describe('the server', () => {
    it('is told about the deleted day and about no cycle at all', () => {
      const database = afterTheDelete();

      const unsent = unsentDayLogs(database);

      expect(tablesThatSync(database)).toEqual(['day_log']);
      expect(unsent).toHaveLength(listDayLogs(database).length + 1);
      expect(unsent.map((row) => row.day)).toContain(theDaySheDeletes);
    });
  });
});
