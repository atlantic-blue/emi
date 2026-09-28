import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { POPULATION_SPREAD_DAYS, POPULATION_SPREAD_DEVIATION_DAYS } from '../src/confidence';
import { PERIOD_MAY_RUN_FOR_DAYS } from '../src/cycles';
import {
  CYCLE_LENGTH_HIGH_DAYS,
  CYCLE_LENGTH_IN_SYSTEM_1,
  CYCLE_LENGTH_LOW_DAYS,
  PUBLISHED_CYCLE_LENGTH,
  publishedFigures,
} from '../src/published';

const module = resolve(__dirname, '..', 'src', 'published.ts');

describe('the published cycle length range', () => {
  it('runs from 24 days to 38 days, counted in days', () => {
    expect(CYCLE_LENGTH_LOW_DAYS).toBe(24);
    expect(CYCLE_LENGTH_HIGH_DAYS).toBe(38);
    expect(PUBLISHED_CYCLE_LENGTH.measures).toBe('cycle-length');
    expect(PUBLISHED_CYCLE_LENGTH.unit).toBe('days');
    expect(PUBLISHED_CYCLE_LENGTH.value).toEqual({ kind: 'range', low: 24, high: 38 });
  });

  it('names System 1 of the International Federation of Gynecology and Obstetrics', () => {
    expect(CYCLE_LENGTH_IN_SYSTEM_1.source).toContain(
      'International Federation of Gynecology and Obstetrics',
    );
    expect(CYCLE_LENGTH_IN_SYSTEM_1.source).toContain('Munro, Critchley and Fraser 2018');
    expect(CYCLE_LENGTH_IN_SYSTEM_1.doi).toBe('10.1002/ijgo.12666');
    expect(CYCLE_LENGTH_IN_SYSTEM_1.figure).toContain('System 1');
  });

  it('quotes the figure in the words the paper reports it, so she can check the range', () => {
    expect(CYCLE_LENGTH_IN_SYSTEM_1.figure).toContain('24 to 38 days');
    expect(CYCLE_LENGTH_IN_SYSTEM_1.figure).toContain('onset');
  });

  it('cites the paper the period duration already cites', () => {
    const duration = publishedFigures.find((figure) => figure.measures === 'period-duration');

    expect(duration?.citation.doi).toBe(CYCLE_LENGTH_IN_SYSTEM_1.doi);
    expect(duration?.citation.source).toBe(CYCLE_LENGTH_IN_SYSTEM_1.source);
    expect(duration?.citation.figure).not.toBe(CYCLE_LENGTH_IN_SYSTEM_1.figure);
  });
});

describe('the three published figures are held in one place', () => {
  it('holds the cycle length, the period duration and the variation, each once', () => {
    expect(publishedFigures.map((figure) => figure.measures)).toEqual([
      'cycle-length',
      'period-duration',
      'cycle-length-variation',
    ]);
  });

  it('carries a citation on every figure, so a fourth cannot arrive without one', () => {
    for (const figure of publishedFigures) {
      expect(figure.citation.source).toMatch(/\d{4}/);
      expect(figure.citation.doi).toMatch(/^10\.\d{4,9}\/\S+$/);
      expect(figure.citation.figure.length).toBeGreaterThan(40);
      expect(figure.unit).toBe('days');
    }
  });

  it('leaves no figure declared outside the list', () => {
    const source = readFileSync(module, 'utf8');
    const declared = [...source.matchAll(/export const (\w+): PublishedFigure =/g)].map(
      (match) => match[1],
    );
    const list = source.slice(source.indexOf('export const publishedFigures'));

    expect(declared).toHaveLength(publishedFigures.length);
    for (const name of declared) {
      expect(list).toContain(name);
    }
  });

  it('takes the period duration bound from the number the cycle arithmetic runs on', () => {
    const duration = publishedFigures.find((figure) => figure.measures === 'period-duration');

    expect(duration?.value).toEqual({ kind: 'upper-bound', high: PERIOD_MAY_RUN_FOR_DAYS });
  });

  it('takes the variation from the numbers the confidence bands are built on', () => {
    const variation = publishedFigures.find(
      (figure) => figure.measures === 'cycle-length-variation',
    );

    expect(variation?.value).toEqual({
      kind: 'mean',
      mean: POPULATION_SPREAD_DAYS,
      deviation: POPULATION_SPREAD_DEVIATION_DAYS,
    });
  });
});

describe('the package hands the figures to the application', () => {
  it('exports the list from the package entry point', () => {
    const index = readFileSync(join(resolve(__dirname, '..', 'src'), 'index.ts'), 'utf8');

    expect(index).toContain("export * from './published';");
  });
});
