import { CycleError } from './cycles';

/**
 * How sure Emi is about a forecast is a statement about her own regularity, so it needs a number
 * to compare her against. These bands take that number from published cycle length distributions
 * and name the figure beside each edge. A band edge with no citation is somebody's feeling about
 * what regular means, and it would be presented to her as measurement.
 */

export interface Citation {
  readonly source: string;
  readonly doi: string;
  /** The figure the edge is computed from, in the words the paper reports it. */
  readonly figure: string;
}

export const CYCLE_LENGTH_VARIATION: Citation = {
  source:
    'Bull, Rowland, Berglund Scherwitzl, Scherwitzl, Gemzell Danielsson and Harper 2019, ' +
    'Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles, ' +
    'npj Digital Medicine 2:83',
  doi: '10.1038/s41746-019-0152-7',
  figure:
    'per-user cycle length variation, defined in the methods as one standard deviation of a ' +
    "user's own cycle lengths: mean 2.6 days with a standard deviation of 2.5 days, across " +
    '612,613 cycles from 124,648 users',
};

/** The mean of the per-user variation, over the whole cohort. */
export const POPULATION_SPREAD_DAYS = 2.6;

/** How widely that per-user variation itself varies across the cohort. */
export const POPULATION_SPREAD_DEVIATION_DAYS = 2.5;

/**
 * FIGO System 1 also publishes a regularity bound, up to seven days for ages 26 to 41, but it
 * measures shortest cycle to longest cycle rather than a standard deviation. The two numbers are
 * not in the same unit, so it cannot set an edge here. It bounds a period's duration instead, in
 * cycles.ts.
 */
export const HIGH_UP_TO_SPREAD_DAYS = POPULATION_SPREAD_DAYS;
export const MEDIUM_UP_TO_SPREAD_DAYS = POPULATION_SPREAD_DAYS + POPULATION_SPREAD_DEVIATION_DAYS;

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceBand {
  readonly level: ConfidenceLevel;
  /** Spreads above this, in days. The first band starts at a spread of nothing at all. */
  readonly aboveSpreadDays: number;
  /** Spreads up to and including this, in days. The last band has no upper edge. */
  readonly upToSpreadDays: number;
  /** How the two edges come out of the cited figure. */
  readonly derivation: string;
  readonly citation: Citation;
}

/** Three bands, because the design gives her narrow, middling and wide and nothing between. */
export const confidenceBands: readonly [ConfidenceBand, ConfidenceBand, ConfidenceBand] = [
  {
    level: 'high',
    aboveSpreadDays: 0,
    upToSpreadDays: HIGH_UP_TO_SPREAD_DAYS,
    derivation:
      'her own cycles vary no more than the mean per-user variation of 2.6 days, so she is at ' +
      'least as regular as the average woman in the cohort',
    citation: CYCLE_LENGTH_VARIATION,
  },
  {
    level: 'medium',
    aboveSpreadDays: HIGH_UP_TO_SPREAD_DAYS,
    upToSpreadDays: MEDIUM_UP_TO_SPREAD_DAYS,
    derivation:
      'her variation is above the cohort mean of 2.6 days and within one standard deviation of ' +
      'it, which the paper reports as 2.5 days, so the edge is 2.6 plus 2.5',
    citation: CYCLE_LENGTH_VARIATION,
  },
  {
    level: 'low',
    aboveSpreadDays: MEDIUM_UP_TO_SPREAD_DAYS,
    upToSpreadDays: Number.POSITIVE_INFINITY,
    derivation:
      'her variation is further above the cohort mean of 2.6 days than one standard deviation of ' +
      '2.5 days, so a forecast from her median is worth less than the spread around it',
    citation: CYCLE_LENGTH_VARIATION,
  },
];

export function confidenceFor(spreadDays: number): ConfidenceBand {
  if (!Number.isFinite(spreadDays) || spreadDays < 0) {
    throw new CycleError(
      'spread-is-not-a-length',
      `a spread is a count of days and never negative, this one is ${spreadDays}`,
    );
  }

  const [high, medium, low] = confidenceBands;
  if (spreadDays <= high.upToSpreadDays) {
    return high;
  }
  if (spreadDays <= medium.upToSpreadDays) {
    return medium;
  }
  return low;
}
