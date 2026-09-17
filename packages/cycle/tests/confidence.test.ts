import {
  CYCLE_LENGTH_VARIATION,
  HIGH_UP_TO_SPREAD_DAYS,
  MEDIUM_UP_TO_SPREAD_DAYS,
  POPULATION_SPREAD_DAYS,
  POPULATION_SPREAD_DEVIATION_DAYS,
  confidenceBands,
  confidenceFor,
} from '../src/confidence';
import { CycleError } from '../src/cycles';

describe('the three bands', () => {
  it('runs from high through medium to low, and the last one is unbounded', () => {
    expect(confidenceBands.map((band) => band.level)).toEqual(['high', 'medium', 'low']);
    expect(confidenceBands[2].upToSpreadDays).toBe(Number.POSITIVE_INFINITY);
  });

  it('leaves no spread between two bands and no spread in both', () => {
    expect(confidenceBands[0].aboveSpreadDays).toBe(0);
    expect(confidenceBands[1].aboveSpreadDays).toBe(confidenceBands[0].upToSpreadDays);
    expect(confidenceBands[2].aboveSpreadDays).toBe(confidenceBands[1].upToSpreadDays);
  });
});

describe('every edge is traceable to a published figure', () => {
  it('cites a source, a digital object identifier and the figure itself', () => {
    for (const band of confidenceBands) {
      expect(band.citation.source).toMatch(/\d{4}/);
      expect(band.citation.doi).toMatch(/^10\.\d{4,9}\/\S+$/);
      expect(band.citation.figure.length).toBeGreaterThan(40);
      expect(band.derivation.length).toBeGreaterThan(40);
    }
  });

  it('takes the high edge from the mean per-user variation of the cohort', () => {
    expect(POPULATION_SPREAD_DAYS).toBe(2.6);
    expect(HIGH_UP_TO_SPREAD_DAYS).toBe(POPULATION_SPREAD_DAYS);
    expect(CYCLE_LENGTH_VARIATION.figure).toContain('2.6 days');
  });

  it('takes the medium edge one standard deviation above that mean', () => {
    expect(POPULATION_SPREAD_DEVIATION_DAYS).toBe(2.5);
    expect(MEDIUM_UP_TO_SPREAD_DAYS).toBeCloseTo(
      POPULATION_SPREAD_DAYS + POPULATION_SPREAD_DEVIATION_DAYS,
      10,
    );
    expect(CYCLE_LENGTH_VARIATION.figure).toContain('standard deviation of 2.5 days');
  });

  it('names the statistic the figure is measured in, because a range is not a deviation', () => {
    expect(CYCLE_LENGTH_VARIATION.figure).toContain('one standard deviation');
    expect(CYCLE_LENGTH_VARIATION.doi).toBe('10.1038/s41746-019-0152-7');
  });
});

describe('the band a spread falls in', () => {
  const rows = [
    { spreadDays: 0, level: 'high' },
    { spreadDays: 1.4, level: 'high' },
    { spreadDays: 2.6, level: 'high' },
    { spreadDays: 2.61, level: 'medium' },
    { spreadDays: 4.9, level: 'medium' },
    { spreadDays: 5.1, level: 'medium' },
    { spreadDays: 5.11, level: 'low' },
    { spreadDays: 6.28, level: 'low' },
    { spreadDays: 40, level: 'low' },
  ];

  it.each(rows)('reads $spreadDays days as $level', ({ spreadDays, level }) => {
    expect(confidenceFor(spreadDays).level).toBe(level);
  });

  it('refuses a spread that is not a count of days', () => {
    for (const wrong of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => confidenceFor(wrong)).toThrow(CycleError);
    }
    try {
      confidenceFor(-1);
    } catch (error) {
      expect((error as CycleError).refusal).toBe('spread-is-not-a-length');
    }
  });
});
