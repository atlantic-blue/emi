import type { DayRecord } from '@emi/cycle';
import { cyclesFrom, daysBetween, forecastFrom } from '@emi/cycle';

import type { Database } from '../../src/data/database';
import { insertDayLog, listDayLogs } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { decodeDay, encodeDay } from '../fixtures/dayPayload';
import { openTestDatabase } from '../data/nodeDatabase';
import {
  daysOf,
  oneLongCycle,
  startsOf,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';

const savedAt = new Date('2026-09-17T08:00:00.000Z');

function recorded(days: readonly DayRecord[]): Database {
  const db = openTestDatabase();
  migrate(db);
  for (const day of days) {
    insertDayLog(db, { day: day.day, payload: encodeDay(day), now: savedAt });
  }
  return db;
}

function readBack(db: Database): DayRecord[] {
  return listDayLogs(db).map((row) => decodeDay(row.payload));
}

function forecastShe(days: readonly DayRecord[]) {
  const result = forecastFrom(cyclesFrom(readBack(recorded(days))));
  if (result.kind !== 'forecast') {
    throw new Error(`the recorded days produced ${result.kind} and not a forecast`);
  }
  return result;
}

function lastPeriod(lengths: readonly number[]): string {
  const starts = startsOf({ ...veryRegular, lengths });
  const last = starts[starts.length - 1];
  if (last === undefined) {
    throw new Error('a set of cycles has a last start');
  }
  return last;
}

describe('one long cycle does not move the forecast', () => {
  describe('the days she recorded', () => {
    it('come back out of the table as the cycles she lived', () => {
      const db = recorded(daysOf(oneLongCycle));
      const cycles = cyclesFrom(readBack(db));

      expect(listDayLogs(db)).toHaveLength(daysOf(oneLongCycle).length);
      expect(cycles.map((cycle) => cycle.lengthDays)).toEqual([28, 28, 40, 28, 28, 28, null]);
      expect(cycles[2]?.startedOn).toBe('2026-03-02');
      expect(cycles[2]?.endedOn).toBe('2026-04-10');
    });
  });

  describe('the forecast she is left with', () => {
    it('reads the next period as a range and never as one day', () => {
      const forecast = forecastShe(daysOf(oneLongCycle));

      expect(forecast.start.from).toBe('2026-07-27');
      expect(forecast.start.to).toBe('2026-08-06');
      expect(forecast.start.from).not.toBe(forecast.start.to);
    });

    it('counts twenty eight days from her last period, the same as six regular cycles', () => {
      const outlier = forecastShe(daysOf(oneLongCycle));
      const regular = forecastShe(daysOf(veryRegular));
      const mean = oneLongCycle.lengths.reduce((total, value) => total + value, 0) / 6;

      expect(daysBetween(lastPeriod(oneLongCycle.lengths), outlier.expectedStart)).toBe(28);
      expect(daysBetween(lastPeriod(veryRegular.lengths), regular.expectedStart)).toBe(28);
      expect(mean).toBe(30);
    });

    it('says medium rather than high, and cites where that edge comes from', () => {
      const forecast = forecastShe(daysOf(oneLongCycle));

      expect(forecast.confidence.level).toBe('medium');
      expect(forecast.confidence.citation.doi).toBe('10.1038/s41746-019-0152-7');
      expect(daysBetween(forecast.start.from, forecast.start.to)).toBe(10);
    });

    it('estimates ovulation thirteen days before the middle of that range', () => {
      const forecast = forecastShe(daysOf(oneLongCycle));

      expect(forecast.expectedStart).toBe('2026-08-01');
      expect(forecast.estimatedOvulation).toBe('2026-07-19');
      expect(forecast.fertileWindow).toEqual({ from: '2026-07-14', to: '2026-07-20' });
    });
  });

  describe('bleeding she marked unexpected', () => {
    it('is stored as she wrote it, and starts no cycle', () => {
      const unexpected: DayRecord = {
        day: '2026-01-20',
        flow: 'heavy',
        bleedingIsUnexpected: true,
      };
      const db = recorded([...daysOf(veryRegular), unexpected]);
      const days = readBack(db);
      const cycles = cyclesFrom(days);

      expect(days).toContainEqual(unexpected);
      expect(cycles.map((cycle) => cycle.startedOn)).toEqual(startsOf(veryRegular));
      expect(cycles.map((cycle) => cycle.startedOn)).not.toContain('2026-01-20');
    });
  });
});
