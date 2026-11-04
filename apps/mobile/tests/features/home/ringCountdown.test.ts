import {
  type CyclePhaseDays,
  type ForecastResult,
  addDays,
  cyclePhaseDays,
  ovulationDayWhileLearning,
} from '@emi/cycle';

import { phasesOf, shapeFromLength } from '../../../src/features/cycle/ringInput';
import { nextPeriodWords, ovulationWords } from '../../../src/features/home/copy';
import { ringCountdownFor } from '../../../src/features/home/ringCountdown';

const startedOn = '2026-10-01';
const cycleLengthDays = 28;
const periodDays = 5;

const herPhases: CyclePhaseDays = cyclePhaseDays({
  cycleLengthDays,
  periodLengthDays: periodDays,
  ovulationDay: ovulationDayWhileLearning(cycleLengthDays),
});

/** Her next period counted to the days 26 to 32 of this cycle, which is what the card names. */
const herForecast: ForecastResult = {
  completeCycles: 1,
  kind: 'learning',
  needsCycles: 2,
  start: { from: addDays(startedOn, 25), to: addDays(startedOn, 31) },
};

/** The ring as Today hands it over: a cycle running late is drawn at the length it has reached. */
function theCountdownOn(day: number, phaseDays: CyclePhaseDays = herPhases) {
  const drawnAt = Math.max(day, cycleLengthDays);

  return ringCountdownFor({
    forecast: herForecast,
    phaseDays,
    ring: { cycleLengthDays: drawnAt, day, phases: phasesOf(shapeFromLength(drawnAt, periodDays)) },
    today: addDays(startedOn, day - 1),
  });
}

describe('how long the ring of Today counts down to her next period', () => {
  it('should count from today to each end of the range the forecast gives', () => {
    expect(theCountdownOn(10).nextPeriod).toEqual({ fromDays: 16, kind: 'in', toDays: 22 });
  });

  it('should never name one day: every countdown ahead of the range is a range', () => {
    for (let day = periodDays + 1; day < 26; day += 1) {
      const countdown = theCountdownOn(day).nextPeriod;

      expect(countdown?.kind).toBe('in');
      if (countdown?.kind === 'in') {
        expect(countdown.fromDays).toBeLessThan(countdown.toDays);
      }
    }
  });

  it('should count to the far end once the range has opened, and say today on its last day', () => {
    expect(theCountdownOn(26).nextPeriod).toEqual({ kind: 'within', toDays: 6 });
    expect(theCountdownOn(32).nextPeriod).toEqual({ kind: 'today' });
  });

  it('should say nothing during her period, before a range or after it', () => {
    expect(theCountdownOn(3).nextPeriod).toBeUndefined();
    expect(theCountdownOn(33).nextPeriod).toBeUndefined();
    expect(
      ringCountdownFor({
        forecast: { completeCycles: 0, kind: 'learning', needsCycles: 2 },
        phaseDays: herPhases,
        ring: { cycleLengthDays, day: 10, phases: [] },
        today: addDays(startedOn, 9),
      }).nextPeriod,
    ).toBeUndefined();
  });

  it('should write the range in words, with no single day', () => {
    expect(nextPeriodWords({ fromDays: 16, kind: 'in', toDays: 22 })).toBe(
      'Period in 16 to 22 days',
    );
    expect(nextPeriodWords({ kind: 'within', toDays: 1 })).toBe('Period within 1 day');
    expect(nextPeriodWords({ kind: 'today' })).toBe('Period likely today');
  });
});

describe('how long the ring of Today counts down to the estimated ovulation', () => {
  it('should count to the ovulation arc the phase rule gives', () => {
    expect(theCountdownOn(10).ovulation).toEqual({
      fromDays: herPhases.ovulation.from - 10,
      kind: 'in',
      toDays: herPhases.ovulation.to - 10,
    });
  });

  it('should say nothing once the arc has begun, because the estimate may be behind her', () => {
    expect(theCountdownOn(herPhases.ovulation.from).ovulation).toBeUndefined();
    expect(theCountdownOn(herPhases.ovulation.to + 1).ovulation).toBeUndefined();
  });

  it('should count to the end of an arc of one day rather than name that day', () => {
    const oneDay = { ...herPhases, ovulation: { from: 9, to: 9 } };

    expect(theCountdownOn(6, oneDay).ovulation).toEqual({ kind: 'within', toDays: 3 });
  });

  it('should say nothing where a short cycle leaves no ovulation arc', () => {
    const none = { ...herPhases, ovulation: { from: 9, to: 8 } };

    expect(theCountdownOn(6, none).ovulation).toBeUndefined();
  });

  it('should mark the line as an estimate', () => {
    expect(ovulationWords({ fromDays: 4, kind: 'in', toDays: 8 })).toBe(
      'Estimated ovulation in 4 to 8 days',
    );
    expect(ovulationWords({ kind: 'within', toDays: 3 })).toBe('Estimated ovulation within 3 days');
  });
});
