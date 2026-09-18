import type { Cycle } from './cycles';
import { addDays, daysBetween } from './cycles';
import { FORECAST_WINDOW_CYCLES, median } from './forecast';

/**
 * What came back, and when in her cycle it came back. Every function here is arithmetic over the
 * days she recorded: no clock, no database, and no judgement about what a symptom means.
 *
 * The failure this module exists to stop is calling a coincidence a pattern. A woman who is told
 * that her headache arrives before her period, on the strength of one headache, has been told
 * something Emi does not know.
 */

/**
 * The part of a day this module reads. Moods and symptoms are counted together, because both are
 * slugs of the one catalogue and a woman who logs low mood every month is looking at a pattern
 * whichever control she reached for.
 */
export interface DayOfSymptoms {
  readonly day: string;
  readonly symptoms?: readonly string[];
  readonly moods?: readonly string[];
}

/** The same six the forecast reads, so the screen and the forecast talk about one span of her life. */
export const PATTERN_WINDOW_CYCLES = FORECAST_WINDOW_CYCLES;

/**
 * How many cycles must carry a symptom before Emi names it. Three is the smallest count that can
 * tell a repeat from a pair, and it is about three months of her life. The number is chosen and it
 * is not measured: no published distribution says when a symptom stops being a coincidence.
 */
export const PATTERN_NEEDS_CYCLES = 3;

/**
 * How far either side of the day a reading may sit and still be the same point in her cycle. A body
 * is not a clock, and a window wider than these three days would cover a fifth of a short cycle,
 * where the same point in her cycle stops meaning anything.
 */
export const PATTERN_DAY_TOLERANCE = 1;

/**
 * Which end of the cycle the day is counted from. A symptom before her period keeps its distance
 * from the period while her cycles change length, and a symptom at the start of one keeps its
 * distance from the start, so a single anchor would scatter half of what she logs.
 */
export type PatternAnchor = 'days-before-the-period' | 'cycle-day';

/** One symptom, the point in her cycle it keeps coming back at, and the evidence behind it. */
export interface SymptomPattern {
  readonly slug: string;
  readonly anchor: PatternAnchor;
  /** The day it lands on, counted the way `anchor` says, from one. */
  readonly day: number;
  readonly cyclesWithIt: number;
  /** The complete cycles that were read, so a screen names the evidence and not only the answer. */
  readonly cyclesRead: number;
  /** The days she logged it on, oldest first, so a screen can open one of them. */
  readonly days: readonly string[];
}

/** The days she recorded, and the cycles those days produced, which is everything a pattern needs. */
export interface PatternsFrom {
  readonly records: readonly DayOfSymptoms[];
  readonly cycles: readonly Cycle[];
  /** How many complete cycles to read back. The window of the design by default. */
  readonly windowCycles?: number;
}

/** Everything she logged on a day, as one list, with a slug she wrote twice counted once. */
export function slugsOn(record: DayOfSymptoms): string[] {
  return [...new Set([...(record.symptoms ?? []), ...(record.moods ?? [])])];
}

interface Window {
  readonly startedOn: string;
  readonly nextStartedOn: string;
  readonly lengthDays: number;
}

/**
 * The cycles a pattern may be read from: the complete ones, because a cycle still running has no
 * next period to count back from, and at most the last six of those.
 */
export function windowsOf(cycles: readonly Cycle[], windowCycles: number): Window[] {
  return cycles
    .filter((cycle): cycle is Cycle & { endedOn: string; lengthDays: number } => {
      return cycle.endedOn !== null && cycle.lengthDays !== null;
    })
    .map((cycle) => ({
      startedOn: cycle.startedOn,
      nextStartedOn: addDays(cycle.endedOn, 1),
      lengthDays: cycle.lengthDays,
    }))
    .slice(-windowCycles);
}

interface Reading {
  readonly cycle: number;
  readonly value: number;
  readonly day: string;
}

interface Cluster {
  readonly day: number;
  readonly cycles: number;
  readonly days: string[];
}

/**
 * The point that explains the most cycles. Where two points explain as many, the one carrying more
 * readings wins, and where those are equal too the earlier number wins, so the answer does not move
 * when a reading arrives at the far end of the window.
 */
function tightestCluster(readings: readonly Reading[]): Cluster | undefined {
  let best: (Cluster & { readings: number }) | undefined;

  for (const candidate of [...new Set(readings.map((reading) => reading.value))].sort(
    (one, other) => one - other,
  )) {
    const near = readings.filter(
      (reading) => Math.abs(reading.value - candidate) <= PATTERN_DAY_TOLERANCE,
    );
    const cycles = new Set(near.map((reading) => reading.cycle));
    const found = {
      // Half a day rounds up, which names the earlier day of the two, because being told to expect
      // something a day early costs her less than being surprised by it.
      day: Math.round(median(near.map((reading) => reading.value))),
      cycles: cycles.size,
      days: [...near].sort((one, other) => one.day.localeCompare(other.day)).map(({ day }) => day),
      readings: near.length,
    };

    if (
      best === undefined ||
      found.cycles > best.cycles ||
      (found.cycles === best.cycles && found.readings > best.readings)
    ) {
      best = found;
    }
  }

  return best;
}

function readingsFor(
  records: readonly DayOfSymptoms[],
  windows: readonly Window[],
): Map<string, { before: Reading[]; cycleDay: Reading[] }> {
  const readings = new Map<string, { before: Reading[]; cycleDay: Reading[] }>();

  for (const record of records) {
    const cycle = windows.findIndex(
      (window) => record.day >= window.startedOn && record.day < window.nextStartedOn,
    );

    if (cycle < 0) {
      continue;
    }

    const window = windows[cycle] as Window;

    for (const slug of slugsOn(record)) {
      const held = readings.get(slug) ?? { before: [], cycleDay: [] };
      held.before.push({
        cycle,
        value: daysBetween(record.day, window.nextStartedOn),
        day: record.day,
      });
      held.cycleDay.push({
        cycle,
        value: daysBetween(window.startedOn, record.day) + 1,
        day: record.day,
      });
      readings.set(slug, held);
    }
  }

  return readings;
}

/**
 * Every symptom that came back at the same point in at least three of her cycles, most repeated
 * first. A symptom she logged once is absent, which is the whole point of the count.
 */
export function patternsIn(from: PatternsFrom): SymptomPattern[] {
  const windows = windowsOf(from.cycles, from.windowCycles ?? PATTERN_WINDOW_CYCLES);

  if (windows.length < PATTERN_NEEDS_CYCLES) {
    return [];
  }

  const found: SymptomPattern[] = [];

  for (const [slug, readings] of readingsFor(from.records, windows)) {
    const before = tightestCluster(readings.before);
    const cycleDay = tightestCluster(readings.cycleDay);

    if (before === undefined || cycleDay === undefined) {
      continue;
    }

    // A tie goes to the distance from her period, because a symptom that sits as well against
    // either end is one she meets on her way into a period.
    const anchored =
      cycleDay.cycles > before.cycles
        ? { anchor: 'cycle-day' as const, cluster: cycleDay }
        : { anchor: 'days-before-the-period' as const, cluster: before };

    if (anchored.cluster.cycles < PATTERN_NEEDS_CYCLES) {
      continue;
    }

    found.push({
      slug,
      anchor: anchored.anchor,
      day: anchored.cluster.day,
      cyclesWithIt: anchored.cluster.cycles,
      cyclesRead: windows.length,
      days: anchored.cluster.days,
    });
  }

  return found.sort(
    (one, other) =>
      other.cyclesWithIt - one.cyclesWithIt ||
      one.day - other.day ||
      one.slug.localeCompare(other.slug),
  );
}
