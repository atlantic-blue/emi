import { cyclesFrom, daysBetween } from '../src/cycles';
import type { Forecast, Learning } from '../src/forecast';
import {
  CYCLES_BEFORE_A_FORECAST,
  DAYS_EITHER_SIDE_WHILE_LEARNING,
  FERTILE_DAYS_AFTER_OVULATION,
  FERTILE_DAYS_BEFORE_OVULATION,
  FORECAST_WINDOW_CYCLES,
  LUTEAL_LENGTH_DAYS,
  forecastFrom,
  lastLengths,
  median,
  spread,
  startWhileLearning,
} from '../src/forecast';
import type { RecordedSet } from './fixtures/recordedSets';
import {
  daysOf,
  genuinelyIrregular,
  oneLongCycle,
  startsOf,
  twoCyclesExactly,
  veryRegular,
} from './fixtures/recordedSets';

function forecastOf(set: RecordedSet): Forecast {
  const result = forecastFrom(cyclesFrom(daysOf(set)));
  if (result.kind !== 'forecast') {
    throw new Error(`${set.lengths.length} cycles produced no forecast`);
  }
  return result;
}

/** Counted from her last period, so a set whose cycles ran longer is still comparable. */
function daysFromHerLastPeriod(set: RecordedSet, day: string): number {
  const starts = startsOf(set);
  const last = starts[starts.length - 1];
  return daysBetween(last ?? set.firstStart, day);
}

describe('the median and the spread', () => {
  it('takes the middle value, and the middle pair when the count is even', () => {
    expect(median([28])).toBe(28);
    expect(median([30, 26, 28])).toBe(28);
    expect(median([28, 30])).toBe(29);
    expect(median([28, 28, 40, 28, 28, 28])).toBe(28);
  });

  it('refuses to take a median of nothing', () => {
    expect(() => median([])).toThrow(/at least one value/);
  });

  it('measures the spread as one standard deviation of her own lengths', () => {
    expect(spread([28, 28, 28])).toBe(0);
    expect(spread([28, 30])).toBeCloseTo(1.414214, 6);
    expect(spread([28, 28, 40, 28, 28, 28])).toBeCloseTo(4.898979, 6);
  });

  it('has no spread to measure from one length', () => {
    expect(spread([28])).toBe(0);
  });
});

describe('the forecast over the four recorded sets', () => {
  const expected = [
    {
      name: 'a very regular cycle',
      set: veryRegular,
      medianLengthDays: 28,
      spreadDays: 0,
      level: 'high',
      fromLastPeriod: { expected: 28, from: 27, to: 29 },
    },
    {
      name: 'one long cycle among six',
      set: oneLongCycle,
      medianLengthDays: 28,
      spreadDays: 4.898979,
      level: 'medium',
      fromLastPeriod: { expected: 28, from: 23, to: 33 },
    },
    {
      name: 'a genuinely irregular cycle',
      set: genuinelyIrregular,
      medianLengthDays: 31,
      spreadDays: 6.28225,
      level: 'low',
      fromLastPeriod: { expected: 31, from: 25, to: 37 },
    },
    {
      name: 'two cycles exactly',
      set: twoCyclesExactly,
      medianLengthDays: 29,
      spreadDays: 1.414214,
      level: 'high',
      fromLastPeriod: { expected: 29, from: 28, to: 30 },
    },
  ];

  it.each(expected)('reads $name', (row) => {
    const forecast = forecastOf(row.set);

    expect(forecast.medianLengthDays).toBe(row.medianLengthDays);
    expect(forecast.spreadDays).toBeCloseTo(row.spreadDays, 5);
    expect(forecast.confidence.level).toBe(row.level);
    expect(forecast.fromCycles).toBe(row.set.lengths.length);
    expect(daysFromHerLastPeriod(row.set, forecast.expectedStart)).toBe(
      row.fromLastPeriod.expected,
    );
    expect(daysFromHerLastPeriod(row.set, forecast.start.from)).toBe(row.fromLastPeriod.from);
    expect(daysFromHerLastPeriod(row.set, forecast.start.to)).toBe(row.fromLastPeriod.to);
  });

  it.each(expected)('gives $name a range and never a single day', (row) => {
    const forecast = forecastOf(row.set);

    expect(daysBetween(forecast.start.from, forecast.start.to)).toBeGreaterThanOrEqual(2);
    expect(forecast.start.from).not.toBe(forecast.start.to);
  });
});

describe('one long cycle does not move the forecast', () => {
  it('predicts the same interval as the regular set, where the mean would move it', () => {
    const regular = forecastOf(veryRegular);
    const outlier = forecastOf(oneLongCycle);
    const lengths = oneLongCycle.lengths;
    const mean = lengths.reduce((total, value) => total + value, 0) / lengths.length;

    expect(outlier.medianLengthDays).toBe(regular.medianLengthDays);
    expect(daysFromHerLastPeriod(oneLongCycle, outlier.expectedStart)).toBe(
      daysFromHerLastPeriod(veryRegular, regular.expectedStart),
    );
    expect(mean).toBe(30);
    expect(mean).not.toBe(outlier.medianLengthDays);
  });

  it('widens the range and lowers the confidence, because that is what changed', () => {
    const regular = forecastOf(veryRegular);
    const outlier = forecastOf(oneLongCycle);

    expect(daysBetween(outlier.start.from, outlier.start.to)).toBeGreaterThan(
      daysBetween(regular.start.from, regular.start.to),
    );
    expect(regular.confidence.level).toBe('high');
    expect(outlier.confidence.level).toBe('medium');
  });
});

describe('the window it reads', () => {
  it('takes the last six lengths and forgets what came before', () => {
    const eight = { ...veryRegular, lengths: [15, 45, 28, 28, 28, 28, 28, 28] };
    const forecast = forecastOf(eight);

    expect(lastLengths(cyclesFrom(daysOf(eight)))).toEqual([28, 28, 28, 28, 28, 28]);
    expect(forecast.fromCycles).toBe(FORECAST_WINDOW_CYCLES);
    expect(forecast.medianLengthDays).toBe(28);
    expect(forecast.spreadDays).toBe(0);
  });
});

describe('before two cycles are complete', () => {
  it('says it is still learning rather than producing a forecast', () => {
    const one = { ...veryRegular, lengths: [28] };

    expect(forecastFrom(cyclesFrom(daysOf(one)))).toEqual({
      kind: 'learning',
      completeCycles: 1,
      needsCycles: CYCLES_BEFORE_A_FORECAST,
    });
  });

  it('says the same when she has recorded one period, or nothing at all', () => {
    const first = { ...veryRegular, lengths: [] };

    expect(forecastFrom(cyclesFrom(daysOf(first)))).toEqual({
      kind: 'learning',
      completeCycles: 0,
      needsCycles: CYCLES_BEFORE_A_FORECAST,
    });
    expect(forecastFrom([])).toEqual({
      kind: 'learning',
      completeCycles: 0,
      needsCycles: CYCLES_BEFORE_A_FORECAST,
    });
  });
});

describe('the range Emi counts while it is still learning', () => {
  const sheSaidHerCycleRuns = 31;

  /** One period recorded and no cycle complete, which is where the first run leaves her. */
  const herFirstPeriodOnly = { ...veryRegular, lengths: [] };

  function learningFrom(set: RecordedSet, statedCycleLengthDays?: number): Learning {
    const result = forecastFrom(
      cyclesFrom(daysOf(set)),
      statedCycleLengthDays === undefined ? {} : { statedCycleLengthDays },
    );

    if (result.kind !== 'learning') {
      throw new Error(
        `${set.lengths.length} cycles produced a forecast rather than the learning state`,
      );
    }

    return result;
  }

  it('counts the range from her last start and the length she gave', () => {
    const learning = learningFrom(herFirstPeriodOnly, sheSaidHerCycleRuns);

    expect(learning.start).toEqual({ from: '2026-02-02', to: '2026-02-08' });
  });

  it('counts from the last start she recorded, where she gave the period before it as well', () => {
    const oneCycleBehindHer = { ...veryRegular, lengths: [28] };
    const starts = startsOf(oneCycleBehindHer);
    const lastStart = starts[starts.length - 1];

    const learning = learningFrom(oneCycleBehindHer, sheSaidHerCycleRuns);

    expect(lastStart).toBe('2026-02-02');
    expect(learning.completeCycles).toBe(1);
    expect(learning.start).toEqual({ from: '2026-03-02', to: '2026-03-08' });
  });

  it('opens the range three days either side, which is the cohort variation rounded', () => {
    const learning = learningFrom(herFirstPeriodOnly, sheSaidHerCycleRuns);

    expect(DAYS_EITHER_SIDE_WHILE_LEARNING).toBe(3);
    expect(daysBetween(learning.start?.from ?? '', learning.start?.to ?? '')).toBe(
      DAYS_EITHER_SIDE_WHILE_LEARNING * 2,
    );
  });

  it('is wider than the range a woman with six steady cycles reads', () => {
    const settled = forecastOf(veryRegular);
    const learning = learningFrom(herFirstPeriodOnly, sheSaidHerCycleRuns);

    expect(daysBetween(learning.start?.from ?? '', learning.start?.to ?? '')).toBeGreaterThan(
      daysBetween(settled.start.from, settled.start.to),
    );
  });

  it('never names a single day, whatever length she gave', () => {
    for (let days = 21; days <= 45; days += 1) {
      const learning = learningFrom(herFirstPeriodOnly, days);

      expect(learning.start?.from).not.toBe(learning.start?.to);
    }
  });

  it('counts no range at all where the caller gave no length to count by', () => {
    expect(learningFrom(herFirstPeriodOnly).start).toBeUndefined();
  });

  it('counts no range at all where she has recorded no day', () => {
    expect(forecastFrom([], { statedCycleLengthDays: sheSaidHerCycleRuns })).toEqual({
      kind: 'learning',
      completeCycles: 0,
      needsCycles: CYCLES_BEFORE_A_FORECAST,
    });
  });

  it('refuses a length that is not a whole number of days from one', () => {
    expect(() => startWhileLearning('2026-01-05', 0)).toThrow('whole number of days');
    expect(() => startWhileLearning('2026-01-05', 28.5)).toThrow('whole number of days');
  });

  it('is not counted by once two cycles are complete, where her own lengths are', () => {
    const settled = forecastFrom(cyclesFrom(daysOf(twoCyclesExactly)), {
      statedCycleLengthDays: sheSaidHerCycleRuns,
    });

    expect(settled).toEqual(forecastFrom(cyclesFrom(daysOf(twoCyclesExactly))));
    expect(settled.kind).toBe('forecast');
  });
});

describe('the estimated ovulation and the fertile window', () => {
  it('counts back from the middle of the range by the luteal length', () => {
    const forecast = forecastOf(veryRegular);

    expect(forecast.lutealLengthDays).toBe(LUTEAL_LENGTH_DAYS);
    expect(daysBetween(forecast.estimatedOvulation, forecast.expectedStart)).toBe(
      LUTEAL_LENGTH_DAYS,
    );
    expect(forecast.estimatedOvulation).toBe('2026-07-07');
    expect(forecast.expectedStart).toBe('2026-07-20');
  });

  it('opens five days before the estimated ovulation and closes one day after', () => {
    const forecast = forecastOf(genuinelyIrregular);

    expect(daysBetween(forecast.fertileWindow.from, forecast.estimatedOvulation)).toBe(
      FERTILE_DAYS_BEFORE_OVULATION,
    );
    expect(daysBetween(forecast.estimatedOvulation, forecast.fertileWindow.to)).toBe(
      FERTILE_DAYS_AFTER_OVULATION,
    );
    expect(daysBetween(forecast.fertileWindow.from, forecast.fertileWindow.to)).toBe(6);
  });

  it('moves with a luteal length measured from her own temperature', () => {
    const measured = forecastFrom(cyclesFrom(daysOf(veryRegular)), { lutealLengthDays: 11 });
    if (measured.kind !== 'forecast') {
      throw new Error('six cycles produced no forecast');
    }

    expect(measured.lutealLengthDays).toBe(11);
    expect(measured.estimatedOvulation).toBe('2026-07-09');
    expect(measured.expectedStart).toBe('2026-07-20');
  });
});
