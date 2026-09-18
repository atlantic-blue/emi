import type { DayRecord } from '../../src/cycles';
import { addDays } from '../../src/cycles';

/**
 * The four recorded sets the step is proved over. Each one is written as the cycle lengths it
 * produces, so a reader can see at a glance which set is which, and the days are built from them.
 */
export interface RecordedSet {
  readonly firstStart: string;
  /** The complete cycle lengths, in order. One more cycle starts after the last of them. */
  readonly lengths: readonly number[];
  readonly periodDays: number;
}

export const veryRegular: RecordedSet = {
  firstStart: '2026-01-05',
  lengths: [28, 28, 28, 28, 28, 28],
  periodDays: 5,
};

/** The same woman, with one cycle of forty days in the middle of her six. */
export const oneLongCycle: RecordedSet = {
  firstStart: '2026-01-05',
  lengths: [28, 28, 40, 28, 28, 28],
  periodDays: 5,
};

export const genuinelyIrregular: RecordedSet = {
  firstStart: '2026-01-05',
  lengths: [24, 35, 29, 41, 26, 33],
  periodDays: 4,
};

export const twoCyclesExactly: RecordedSet = {
  firstStart: '2026-03-02',
  lengths: [28, 30],
  periodDays: 5,
};

/** Every cycle start in the set, including the start of the cycle she is still in. */
export function startsOf(set: RecordedSet): string[] {
  const starts = [set.firstStart];
  let day = set.firstStart;
  for (const length of set.lengths) {
    day = addDays(day, length);
    starts.push(day);
  }
  return starts;
}

/**
 * The days she would have recorded: her bleeding days, and the day after each period on which she
 * recorded no flow, which is what closes the period.
 */
export function daysOf(set: RecordedSet): DayRecord[] {
  const days: DayRecord[] = [];
  for (const start of startsOf(set)) {
    for (let offset = 0; offset < set.periodDays; offset += 1) {
      days.push({
        day: addDays(start, offset),
        flow: offset === set.periodDays - 1 ? 'light' : 'medium',
      });
    }
    days.push({ day: addDays(start, set.periodDays), flow: 'none' });
  }
  return days;
}

/**
 * Three sets for the learning state, where the days are driven through the first run rather than
 * written straight into the log. The first run refuses a period start more than ninety days back,
 * so these count from the days around 2026-09-17 rather than from the January the four sets above
 * start in.
 */
export const noCycleComplete: RecordedSet = {
  firstStart: '2026-09-05',
  lengths: [],
  periodDays: 5,
};

export const oneCycleComplete: RecordedSet = {
  firstStart: '2026-08-13',
  lengths: [28],
  periodDays: 5,
};

export const twoCyclesComplete: RecordedSet = {
  firstStart: '2026-07-16',
  lengths: [28, 30],
  periodDays: 5,
};
