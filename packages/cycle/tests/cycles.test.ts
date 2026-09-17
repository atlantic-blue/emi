import type { DayRecord } from '../src/cycles';
import {
  CycleError,
  PERIOD_MAY_RUN_FOR_DAYS,
  addDays,
  completeCycles,
  cycleLengths,
  cyclesFrom,
  daysBetween,
  isBleeding,
  startsACycle,
  toDay,
  toDayNumber,
} from '../src/cycles';
import {
  daysOf,
  genuinelyIrregular,
  oneLongCycle,
  startsOf,
  twoCyclesExactly,
  veryRegular,
} from './fixtures/recordedSets';

const sets = [
  { name: 'a very regular cycle', set: veryRegular },
  { name: 'one long cycle among six', set: oneLongCycle },
  { name: 'a genuinely irregular cycle', set: genuinelyIrregular },
  { name: 'two cycles exactly', set: twoCyclesExactly },
];

describe('day arithmetic', () => {
  it('reads a day and writes it back unchanged', () => {
    expect(toDay(toDayNumber('2026-09-17'))).toBe('2026-09-17');
  });

  it('crosses a month and a leap day', () => {
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(daysBetween('2026-01-05', '2026-02-02')).toBe(28);
  });

  it('counts backwards', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-02-02', '2026-01-05')).toBe(-28);
  });

  it('refuses anything that is not a day in the calendar', () => {
    for (const wrong of ['2026-02-30', '2026-13-01', '17/09/2026', '2026-9-17', '']) {
      expect(() => toDayNumber(wrong)).toThrow(CycleError);
    }
  });
});

describe('what counts as bleeding', () => {
  it('counts every flow but none', () => {
    expect(isBleeding({ day: '2026-01-05', flow: 'spotting' })).toBe(true);
    expect(isBleeding({ day: '2026-01-05', flow: 'light' })).toBe(true);
    expect(isBleeding({ day: '2026-01-05', flow: 'medium' })).toBe(true);
    expect(isBleeding({ day: '2026-01-05', flow: 'heavy' })).toBe(true);
    expect(isBleeding({ day: '2026-01-05', flow: 'none' })).toBe(false);
    expect(isBleeding({ day: '2026-01-05' })).toBe(false);
  });

  it('never starts a cycle on a day she marked unexpected', () => {
    const unexpected: DayRecord = {
      day: '2026-01-05',
      flow: 'heavy',
      bleedingIsUnexpected: true,
    };

    expect(isBleeding(unexpected)).toBe(true);
    expect(startsACycle(unexpected)).toBe(false);
  });
});

describe('a cycle from the days she recorded', () => {
  it('starts on the first bleeding day and ends the day before the next', () => {
    const cycles = cyclesFrom(daysOf(veryRegular));

    expect(cycles[0]).toEqual({
      startedOn: '2026-01-05',
      endedOn: '2026-02-01',
      lengthDays: 28,
      periodDays: 5,
    });
    expect(cycles[1]?.startedOn).toBe('2026-02-02');
  });

  it('leaves the cycle she is in open, because its length is not known yet', () => {
    const cycles = cyclesFrom(daysOf(veryRegular));
    const last = cycles[cycles.length - 1];

    expect(cycles).toHaveLength(7);
    expect(last).toEqual({
      startedOn: '2026-06-22',
      endedOn: null,
      lengthDays: null,
      periodDays: 5,
    });
  });

  it.each(sets)('reads every start back from $name', ({ set }) => {
    const cycles = cyclesFrom(daysOf(set));

    expect(cycles.map((cycle) => cycle.startedOn)).toEqual(startsOf(set));
    expect(cycleLengths(cycles)).toEqual(set.lengths);
    expect(completeCycles(cycles)).toHaveLength(set.lengths.length);
  });

  it('does not care what order the days arrive in', () => {
    const days = daysOf(veryRegular);
    const shuffled = [...days.slice(10), ...days.slice(0, 10)].reverse();

    expect(cyclesFrom(shuffled)).toEqual(cyclesFrom(days));
  });

  it('starts nothing at all when she has recorded no bleeding', () => {
    expect(cyclesFrom([])).toEqual([]);
    expect(cyclesFrom([{ day: '2026-01-05', flow: 'none' }])).toEqual([]);
  });
});

describe('the days of one period', () => {
  it('is one cycle, not five', () => {
    const days: DayRecord[] = [
      { day: '2026-01-05', flow: 'medium' },
      { day: '2026-01-06', flow: 'heavy' },
      { day: '2026-01-07', flow: 'medium' },
      { day: '2026-01-08', flow: 'light' },
      { day: '2026-01-09', flow: 'light' },
    ];

    expect(cyclesFrom(days)).toEqual([
      { startedOn: '2026-01-05', endedOn: null, lengthDays: null, periodDays: null },
    ]);
  });

  it('survives a day in the middle when the bleeding paused', () => {
    const days: DayRecord[] = [
      { day: '2026-01-05', flow: 'medium' },
      { day: '2026-01-06', flow: 'light' },
      { day: '2026-01-07', flow: 'none' },
      { day: '2026-01-08', flow: 'light' },
    ];

    expect(cyclesFrom(days).map((cycle) => cycle.startedOn)).toEqual(['2026-01-05']);
  });

  it('holds bleeding for eight days and starts a cycle on the ninth', () => {
    const eight = Array.from({ length: PERIOD_MAY_RUN_FOR_DAYS }, (_, offset) => ({
      day: addDays('2026-01-05', offset),
      flow: 'medium' as const,
    }));

    expect(cyclesFrom(eight)).toHaveLength(1);
    expect(
      cyclesFrom([
        ...eight,
        { day: addDays('2026-01-05', PERIOD_MAY_RUN_FOR_DAYS), flow: 'light' },
      ]),
    ).toHaveLength(2);
  });

  it('counts the bleeding days once a recorded day closes them, and not before', () => {
    const bleeding: DayRecord[] = [
      { day: '2026-01-05', flow: 'medium' },
      { day: '2026-01-06', flow: 'light' },
    ];

    expect(cyclesFrom(bleeding)[0]?.periodDays).toBeNull();
    expect(cyclesFrom([...bleeding, { day: '2026-01-07', flow: 'none' }])[0]?.periodDays).toBe(2);
  });

  it('closes the bleeding on a day she recorded without a flow at all', () => {
    const days: DayRecord[] = [{ day: '2026-01-05', flow: 'medium' }, { day: '2026-01-06' }];

    expect(cyclesFrom(days)[0]?.periodDays).toBe(1);
  });

  it('leaves unexpected bleeding out of the count', () => {
    const days: DayRecord[] = [
      { day: '2026-01-05', flow: 'medium' },
      { day: '2026-01-06', flow: 'light' },
      { day: '2026-01-07', flow: 'none' },
      { day: '2026-01-18', flow: 'heavy', bleedingIsUnexpected: true },
      { day: '2026-01-19', flow: 'none' },
    ];

    expect(cyclesFrom(days)).toEqual([
      { startedOn: '2026-01-05', endedOn: null, lengthDays: null, periodDays: 2 },
    ]);
  });
});

describe('the input it refuses', () => {
  it('refuses a day written twice, because a day holds one record', () => {
    const twice: DayRecord[] = [
      { day: '2026-01-05', flow: 'medium' },
      { day: '2026-01-05', flow: 'heavy' },
    ];

    expect(() => cyclesFrom(twice)).toThrow(/written twice/);
    try {
      cyclesFrom(twice);
    } catch (error) {
      expect((error as CycleError).refusal).toBe('day-is-written-twice');
    }
  });

  it('refuses a day that is not a date', () => {
    expect(() => cyclesFrom([{ day: '5th January', flow: 'medium' }])).toThrow(CycleError);
  });
});

describe('the rules a set of cycles always keeps', () => {
  /**
   * The contract names a cycle of zero days and two overlapping cycles as failures, and neither
   * can be reached through a single hand written case. These sets are built to be awkward: long
   * runs of bleeding, single days, pauses, unexpected days and very short cycles.
   */
  function awkwardDays(seed: number): DayRecord[] {
    const days: DayRecord[] = [];
    let day = '2026-01-01';
    let state = seed;
    for (let index = 0; index < 120; index += 1) {
      state = (state * 1103515245 + 12345) % 2147483648;
      const roll = state % 10;
      if (roll < 4) {
        days.push({ day, flow: 'medium' });
      } else if (roll < 5) {
        days.push({ day, flow: 'spotting', bleedingIsUnexpected: true });
      } else if (roll < 7) {
        days.push({ day, flow: 'none' });
      }
      day = addDays(day, 1 + (state % 4));
    }
    return days;
  }

  it.each([1, 2, 3, 7, 11, 23, 101, 1009])('holds for the set built from seed %i', (seed) => {
    const days = awkwardDays(seed);
    const cycles = cyclesFrom(days);
    const unexpected = new Set(
      days.filter((record) => record.bleedingIsUnexpected === true).map((record) => record.day),
    );

    cycles.forEach((cycle, index) => {
      const next = cycles[index + 1];
      expect(unexpected.has(cycle.startedOn)).toBe(false);
      if (!next) {
        expect(cycle.endedOn).toBeNull();
        expect(cycle.lengthDays).toBeNull();
        return;
      }
      expect(cycle.lengthDays).toBeGreaterThan(0);
      expect(cycle.endedOn).toBe(addDays(next.startedOn, -1));
      expect(daysBetween(cycle.startedOn, next.startedOn)).toBe(cycle.lengthDays);
    });
  });
});
