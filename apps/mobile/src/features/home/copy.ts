import type { PublishedFigure, PublishedMeasurement } from '@emi/cycle';

import { words } from '../../language';
import type { MeasuredNumber } from './herNumbers';

/**
 * The words of the one screen she opens. They stay small, which is design section 9.1: she reads
 * everything and a stranger beside her reads nothing.
 */
export const homeCopy = {
  wordmark: words('home.wordmark'),
  roundAction: {
    period: words('home.roundAction.period'),
    symptoms: words('home.roundAction.symptoms'),
  },
  loggedToday: {
    lead: words('home.loggedToday.lead'),
  },
  painLine: words('home.painLine'),
  doctorRecord: words('home.doctorRecord'),
  numbers: {
    hers: words('home.numbers.hers'),
    published: words('home.numbers.published'),
    line: words('home.numbers.line'),
    press: words('home.numbers.press'),
  },
} as const;

/** What each measurement is called, in her own language, on the row that carries it. */
export const measurementName: Readonly<Record<PublishedMeasurement, string>> = {
  'cycle-length': words('home.numbers.cycleLength'),
  'cycle-length-variation': words('home.numbers.cycleLengthVariation'),
  'period-duration': words('home.numbers.periodDuration'),
};

function days(count: number): string {
  return words('home.numbers.days', count);
}

/**
 * Days with a fraction in them. A count that is not whole takes the plural category the standard
 * calls other, and Russian writes no other form, so a fraction may never reach the plural lookup.
 */
function fractionOfDays(value: number): string {
  return words('home.numbers.fractionDays', undefined, { days: value });
}

/** Her own measurement, as she reads it. The variation is the one that carries a fraction. */
export function herNumberReads(number: MeasuredNumber): string {
  return Number.isInteger(number.hers) ? days(number.hers) : fractionOfDays(number.hers);
}

/**
 * A published figure, in the shape the paper reports it in. The cycle length is bounded at both
 * ends, the bleeding duration at the top only, and the variation is a mean, so one sentence for
 * all three would put a number in a field no paper published.
 */
export function publishedFigureReads(figure: PublishedFigure): string {
  const value = figure.value;

  if (value.kind === 'range') {
    return words('home.numbers.range', undefined, { high: days(value.high), low: value.low });
  }

  if (value.kind === 'upper-bound') {
    return words('home.numbers.upTo', undefined, { days: days(value.high) });
  }

  return fractionOfDays(value.mean);
}

/**
 * How Emi says hello to her by the name she gave. A woman who gave none is not greeted at all,
 * so this is never called with an empty name and never draws an empty line.
 */
export function greeting(name: string): string {
  return words('home.greeting', undefined, { name });
}
