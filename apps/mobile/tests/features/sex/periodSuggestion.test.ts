import type { DayRecord } from '@emi/cycle';

import type { CycleRow } from '../../../src/data/cycleRepository';
import { periodDayOn, suggestsPeriodProducts } from '../../../src/features/sex/periodSuggestion';

/**
 * Issue 306: the Sex page suggests a disc or a sponge after a save that records sex on a day of her
 * period, and only on the save that first records sex on that day.
 */

function aCycle(startedOn: string, overrides: Partial<CycleRow> = {}): CycleRow {
  return {
    id: startedOn,
    startedOn,
    endedOn: null,
    lengthDays: null,
    periodLengthDays: null,
    isPredicted: false,
    ...overrides,
  };
}

function aDay(day: string, overrides: Partial<DayRecord> = {}): DayRecord {
  return { day, recordedAt: `${day}T12:00:00.000Z`, flow: 'medium', ...overrides } as DayRecord;
}

const from = {
  cycles: [aCycle('2026-09-07'), aCycle('2026-10-05')],
  records: [
    aDay('2026-10-05'),
    aDay('2026-10-06'),
    aDay('2026-10-07'),
    aDay('2026-10-09', { flow: 'spotting', bleedingIsUnexpected: true }),
    aDay('2026-10-10', { flow: 'none' }),
  ],
};

describe('the day of her period', () => {
  it('should count a period day from the start of the cycle that holds it', () => {
    expect(periodDayOn(from, '2026-10-05')).toBe(1);
    expect(periodDayOn(from, '2026-10-06')).toBe(2);
  });

  it('should be nothing on a day with no record, no bleeding, or bleeding she said was not her period', () => {
    expect(periodDayOn(from, '2026-10-08')).toBeUndefined();
    expect(periodDayOn(from, '2026-10-10')).toBeUndefined();
    expect(periodDayOn(from, '2026-10-09')).toBeUndefined();
  });

  it('should not count from a forecast cycle', () => {
    const withAForecast = {
      ...from,
      cycles: [...from.cycles, aCycle('2026-10-06', { isPredicted: true })],
    };

    expect(periodDayOn(withAForecast, '2026-10-06')).toBe(2);
  });
});

describe('when the Sex page suggests products', () => {
  it('should suggest on a period day when the save first records sex', () => {
    expect(
      suggestsPeriodProducts({ before: {}, after: { sex: 'unprotected' }, periodDay: 2 }),
    ).toBe(true);
    expect(
      suggestsPeriodProducts({
        before: { sex: 'none' },
        after: { sex: 'unprotected' },
        periodDay: 1,
      }),
    ).toBe(true);
  });

  it('should not suggest when the day already held sex, so it shows once for a day', () => {
    expect(
      suggestsPeriodProducts({
        before: { sex: 'unprotected' },
        after: { sex: 'unprotected', orgasm: 'yes' },
        periodDay: 2,
      }),
    ).toBe(false);
  });

  it('should not suggest for "No sex", for no answer, or on a day that is not a period day', () => {
    expect(suggestsPeriodProducts({ before: {}, after: { sex: 'none' }, periodDay: 2 })).toBe(
      false,
    );
    expect(suggestsPeriodProducts({ before: {}, after: { sexDrive: 'high' }, periodDay: 2 })).toBe(
      false,
    );
    expect(
      suggestsPeriodProducts({ before: {}, after: { sex: 'unprotected' }, periodDay: undefined }),
    ).toBe(false);
  });
});
