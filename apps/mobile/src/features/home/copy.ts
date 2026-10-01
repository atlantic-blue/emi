import type { PatternAnchor, PublishedFigure, PublishedMeasurement } from '@emi/cycle';

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
  logToday: words('home.logToday'),
  painLine: words('home.painLine'),
  doctorRecord: words('home.doctorRecord'),
  cycles: {
    line: words('home.cycles.line'),
  },
  numbers: {
    hers: words('home.numbers.hers'),
    published: words('home.numbers.published'),
    line: words('home.numbers.line'),
    press: words('home.numbers.press'),
  },
  trend: {
    press: words('home.trend.press'),
  },
  waiting: {
    cycles: words('home.waiting.cycles.heading'),
    trend: words('home.waiting.trend.heading'),
    patterns: words('home.waiting.patterns.heading'),
  },
  patterns: {
    line: words('home.patterns.line'),
    press: words('home.patterns.press'),
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

/**
 * What the section of her three numbers says while it waits, and how many complete cycles Emi read
 * to say it. The count is her own, so a woman who recorded nothing reads nought rather than a
 * number Emi picked for the look of the screen.
 */
export function cyclesWaitingReads(completeCycles: number): { needs: string; read: string } {
  return {
    needs: words('home.waiting.cycles.needs'),
    read: words('home.waiting.cycles.read', undefined, {
      cycles: trendCycleCount(completeCycles),
    }),
  };
}

/**
 * What the chart says while it waits. The threshold is the arithmetic's own, handed in rather than
 * written here, so the sentence cannot name one number while the chart waits for another.
 */
export function trendWaitingReads(needsCycles: number): { needs: string; read: string } {
  return {
    needs: words('home.waiting.trend.needs', needsCycles),
    read: words('home.waiting.trend.read'),
  };
}

/** How many complete cycles the chart drew, in her own language, agreeing with the number. */
export function trendCycleCount(cycles: number): string {
  return words('home.trend.cycleCount', cycles);
}

/** The caption under the chart, which says what the band behind her points is. */
export function trendCaptionReads(cycles: number): string {
  return words('home.trend.caption', undefined, { cycles: trendCycleCount(cycles) });
}

/**
 * How many of the cycles on the chart ran outside the published range. A woman whose cycles all
 * fell inside it reads a sentence of its own, because the plural lookup gives nought the same form
 * as six and "0 of your last 6" is not a sentence anybody writes.
 */
export function cyclesOutsideReads(outside: number, read: number): string {
  const cycles = trendCycleCount(read);

  return outside === 0
    ? words('home.trend.allInside', undefined, { cycles })
    : words('home.trend.outside', undefined, { cycles, outside });
}

/**
 * What somebody listening is told about the chart. A picture says nothing to a screen reader, so
 * the sentence carries what the shape carries: how many cycles, the ends of her own range, and the
 * range the paper reports.
 */
export function trendSpokenLabel(reads: {
  readonly cycles: number;
  readonly shortest: number;
  readonly longest: number;
  readonly low: number;
  readonly high: number;
}): string {
  return words('home.trend.spoken', undefined, {
    cycles: trendCycleCount(reads.cycles),
    high: reads.high,
    longest: reads.longest,
    low: reads.low,
    shortest: reads.shortest,
  });
}

/**
 * Where in her cycle a symptom keeps landing, said the way the arithmetic anchored it. The clause
 * opens in lower case, because a card writes it after the name of the symptom rather than first.
 */
export function patternWhenReads(anchor: PatternAnchor, day: number): string {
  if (anchor === 'cycle-day') {
    return words('home.patterns.onCycleDay', undefined, { day });
  }

  return words('home.patterns.beforePeriod', undefined, { days: days(day) });
}

/** The lead of one card: the symptom she logged, then the point in her cycle it comes back at. */
export function patternCardReads(pattern: {
  readonly name: string;
  readonly anchor: PatternAnchor;
  readonly day: number;
}): string {
  return words('home.patterns.card', undefined, {
    name: pattern.name,
    when: patternWhenReads(pattern.anchor, pattern.day),
  });
}
