import type { DayRecord } from '@emi/crypto';
import { type PublishedFigure, type PublishedMeasurement, findSymptom } from '@emi/cycle';

import { words } from '../../language';
import { flowLabel } from '../log/FlowPicker';
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
 * Everything one day holds, in the order the row names it, each one in her own words.
 *
 * The flow comes first because it is the thing she opens the log for. A measurement is named and
 * never read out, because the row says what she marked and the day itself says what she wrote.
 */
function theMarksOn(record: DayRecord): string[] {
  const named: string[] = [];

  if (record.flow !== undefined) {
    named.push(
      record.flow === 'none'
        ? words('home.loggedToday.noFlow')
        : words('home.loggedToday.flow', undefined, {
            flow: flowLabel[record.flow].toLowerCase(),
          }),
    );
  }

  for (const slug of [...(record.symptoms ?? []), ...(record.moods ?? [])]) {
    const symptom = findSymptom(slug);

    if (symptom !== undefined) {
      named.push(symptom.name.toLowerCase());
    }
  }

  if (record.energy !== undefined) {
    named.push(words('home.loggedToday.energy'));
  }

  if (record.temperatureCelsius !== undefined) {
    named.push(words('home.loggedToday.temperature'));
  }

  if (record.weightKilograms !== undefined) {
    named.push(words('home.loggedToday.weight'));
  }

  if (record.note !== undefined && record.note.trim().length > 0) {
    named.push(words('home.loggedToday.note'));
  }

  return named;
}

/**
 * The marks as one sentence. A comma separates a list in all three languages Emi is written in, so
 * the only part the catalogue has to hold is the word before the last mark.
 */
function saidTogether(named: readonly string[], last: string): string {
  const before = named.slice(0, -1).join(', ');

  return before.length === 0
    ? last
    : words('home.loggedToday.andTheLast', undefined, { last, said: before });
}

/**
 * What she marked today, as the one line under the heading, and nothing at all where she marked
 * nothing. The row is drawn only where this answers, so the absent case is decided once here
 * rather than once in the screen and once in the row.
 */
export function whatSheMarkedToday(record: DayRecord | undefined): string | undefined {
  const named = record === undefined ? [] : theMarksOn(record);
  const last = named[named.length - 1];

  if (last === undefined) {
    return undefined;
  }

  const said = saidTogether(named, last);

  return said.charAt(0).toUpperCase() + said.slice(1);
}
