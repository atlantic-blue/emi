import {
  type Citation,
  CYCLE_LENGTH_VARIATION,
  POPULATION_SPREAD_DAYS,
  POPULATION_SPREAD_DEVIATION_DAYS,
} from './confidence';
import { PERIOD_MAY_RUN_FOR_DAYS } from './cycles';

/**
 * Every number Emi takes from a paper rather than from the days she recorded, in one list. A screen
 * puts her own number beside one of these, so each one travels with the paper that reports it: a
 * figure with no citation would reach her as a measurement when it is somebody's feeling about what
 * is ordinary.
 */

const SYSTEM_1_SOURCE =
  'Munro, Critchley and Fraser 2018, The two systems of the International Federation of ' +
  'Gynecology and Obstetrics for normal and abnormal uterine bleeding symptoms and ' +
  'classification of causes of abnormal uterine bleeding in the reproductive years, 2018 ' +
  'revisions, International Journal of Gynecology and Obstetrics 143(3):393 to 408';

const SYSTEM_1_DOI = '10.1002/ijgo.12666';

/**
 * The range her own cycle length sits against. System 1 sorts the interval between two period
 * onsets into three, and this is the middle one, so a shorter interval and a longer one each have a
 * name in the same paper.
 */
export const CYCLE_LENGTH_IN_SYSTEM_1: Citation = {
  source: SYSTEM_1_SOURCE,
  doi: SYSTEM_1_DOI,
  figure:
    'menstrual cycle frequency, reported in System 1 as 24 to 38 days between the onset of one ' +
    'period and the onset of the next, with a shorter interval named frequent and a longer one ' +
    'named infrequent',
};

/**
 * The same paper, reporting how long the bleeding itself may run. The cycle arithmetic already
 * turns this bound into the window in which a second bleeding day continues one period rather than
 * starting a cycle.
 */
export const PERIOD_DURATION_IN_SYSTEM_1: Citation = {
  source: SYSTEM_1_SOURCE,
  doi: SYSTEM_1_DOI,
  figure:
    'menstrual bleeding duration, reported in System 1 as up to 8 days, with a longer bleed ' +
    'named prolonged',
};

/** The lowest cycle length System 1 reports inside its middle category, in days. */
export const CYCLE_LENGTH_LOW_DAYS = 24;

/** The highest cycle length System 1 reports inside its middle category, in days. */
export const CYCLE_LENGTH_HIGH_DAYS = 38;

/** What a published figure is about, so a screen matches on this rather than on the words of it. */
export type PublishedMeasurement = 'cycle-length' | 'period-duration' | 'cycle-length-variation';

/**
 * What a paper reports, in the shape it reports it in. One shape for all three would put a number
 * in a field no paper published: the cycle length is bounded at both ends, the bleeding duration at
 * the top only, and the variation is a mean with a spread around it and no bound at all.
 */
export type PublishedValue =
  | { readonly kind: 'range'; readonly low: number; readonly high: number }
  | { readonly kind: 'upper-bound'; readonly high: number }
  | { readonly kind: 'mean'; readonly mean: number; readonly deviation: number };

/** One figure, what it measures, what the paper says and where to read it. */
export interface PublishedFigure {
  readonly measures: PublishedMeasurement;
  readonly value: PublishedValue;
  /** Days, for all three. It is written on each one so a fourth figure has to declare its own. */
  readonly unit: 'days';
  readonly citation: Citation;
}

/** 24 to 38 days, the range the cycle length row and the band behind the trend chart both use. */
export const PUBLISHED_CYCLE_LENGTH: PublishedFigure = {
  measures: 'cycle-length',
  value: { kind: 'range', low: CYCLE_LENGTH_LOW_DAYS, high: CYCLE_LENGTH_HIGH_DAYS },
  unit: 'days',
  citation: CYCLE_LENGTH_IN_SYSTEM_1,
};

/** Up to 8 days of bleeding, the bound the cycle arithmetic starts a new cycle after. */
export const PUBLISHED_PERIOD_DURATION: PublishedFigure = {
  measures: 'period-duration',
  value: { kind: 'upper-bound', high: PERIOD_MAY_RUN_FOR_DAYS },
  unit: 'days',
  citation: PERIOD_DURATION_IN_SYSTEM_1,
};

/** The cohort mean of how much one woman's own cycle lengths move, and how widely it moves. */
export const PUBLISHED_CYCLE_LENGTH_VARIATION: PublishedFigure = {
  measures: 'cycle-length-variation',
  value: {
    kind: 'mean',
    mean: POPULATION_SPREAD_DAYS,
    deviation: POPULATION_SPREAD_DEVIATION_DAYS,
  },
  unit: 'days',
  citation: CYCLE_LENGTH_VARIATION,
};

/**
 * The one list, in the order the page that says where the figures come from lists them. A figure
 * that is not in it is a number no screen may show, and a figure in it carries a citation because
 * the type demands one.
 */
export const publishedFigures: readonly PublishedFigure[] = [
  PUBLISHED_CYCLE_LENGTH,
  PUBLISHED_PERIOD_DURATION,
  PUBLISHED_CYCLE_LENGTH_VARIATION,
];
