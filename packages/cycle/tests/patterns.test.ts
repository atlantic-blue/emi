import { addDays, cyclesFrom } from '../src/cycles';
import type { DayOfSymptoms } from '../src/patterns';
import {
  PATTERN_NEEDS_CYCLES,
  PATTERN_WINDOW_CYCLES,
  patternsIn,
  slugsOn,
  windowsOf,
} from '../src/patterns';
import type { RecordedSet } from './fixtures/recordedSets';
import {
  daysOf,
  genuinelyIrregular,
  startsOf,
  twoCyclesExactly,
  veryRegular,
} from './fixtures/recordedSets';

/** Her bleeding days, and a symptom written onto the days the test asks for. */
function herDays(set: RecordedSet, symptomDays: readonly DayOfSymptoms[]): DayOfSymptoms[] {
  const held = new Map<string, DayOfSymptoms>();

  for (const day of daysOf(set)) {
    held.set(day.day, { day: day.day });
  }
  for (const day of symptomDays) {
    held.set(day.day, { ...held.get(day.day), ...day });
  }

  return [...held.values()].sort((one, other) => one.day.localeCompare(other.day));
}

/** The first day of every period after the first, which is the day a completed cycle counts back from. */
function thePeriodsAfterTheFirst(set: RecordedSet): string[] {
  return startsOf(set).slice(1);
}

/** The same symptom, a fixed number of days before each of the periods named. */
function before(periods: readonly string[], days: number, slug: string): DayOfSymptoms[] {
  return periods.map((period) => ({ day: addDays(period, -days), symptoms: [slug] }));
}

/** The same symptom, on a fixed day of each of the cycles that began on the days named. */
function onCycleDay(starts: readonly string[], day: number, slug: string): DayOfSymptoms[] {
  return starts.map((start) => ({ day: addDays(start, day - 1), symptoms: [slug] }));
}

function patternsOf(set: RecordedSet, symptomDays: readonly DayOfSymptoms[]) {
  return patternsIn({ records: herDays(set, symptomDays), cycles: cyclesFrom(daysOf(set)) });
}

describe('what came back, and what only happened', () => {
  describe('the count that separates a pattern from a coincidence', () => {
    it('names a symptom that came back three days before every period', () => {
      const patterns = patternsOf(
        veryRegular,
        before(thePeriodsAfterTheFirst(veryRegular), 3, 'headache'),
      );

      expect(patterns).toEqual([
        {
          slug: 'headache',
          anchor: 'days-before-the-period',
          day: 3,
          cyclesWithIt: PATTERN_WINDOW_CYCLES,
          cyclesRead: PATTERN_WINDOW_CYCLES,
          days: before(thePeriodsAfterTheFirst(veryRegular), 3, 'headache').map(({ day }) => day),
        },
      ]);
    });

    it('names nothing at all for a symptom she logged once', () => {
      const [firstPeriod] = thePeriodsAfterTheFirst(veryRegular);

      expect(patternsOf(veryRegular, before([firstPeriod as string], 3, 'migraine'))).toEqual([]);
    });

    it('still names nothing when it came back in two cycles', () => {
      const twice = thePeriodsAfterTheFirst(veryRegular).slice(0, 2);

      expect(patternsOf(veryRegular, before(twice, 3, 'migraine'))).toEqual([]);
    });

    it('names it once it came back in three, which is the floor', () => {
      const thrice = thePeriodsAfterTheFirst(veryRegular).slice(0, PATTERN_NEEDS_CYCLES);
      const [named] = patternsOf(veryRegular, before(thrice, 3, 'migraine'));

      expect(named?.slug).toBe('migraine');
      expect(named?.cyclesWithIt).toBe(PATTERN_NEEDS_CYCLES);
      expect(named?.cyclesRead).toBe(PATTERN_WINDOW_CYCLES);
    });

    it('reads nothing while fewer than three cycles are complete', () => {
      const periods = thePeriodsAfterTheFirst(twoCyclesExactly);

      expect(windowsOf(cyclesFrom(daysOf(twoCyclesExactly)), PATTERN_WINDOW_CYCLES)).toHaveLength(
        2,
      );
      expect(patternsOf(twoCyclesExactly, before(periods, 3, 'cramps'))).toEqual([]);
    });
  });

  describe('which end of the cycle the day is counted from', () => {
    it('counts back from the period when her cycles run to different lengths', () => {
      const patterns = patternsOf(
        genuinelyIrregular,
        before(thePeriodsAfterTheFirst(genuinelyIrregular), 2, 'cramps'),
      );

      expect(patterns[0]).toMatchObject({
        slug: 'cramps',
        anchor: 'days-before-the-period',
        day: 2,
        cyclesWithIt: PATTERN_WINDOW_CYCLES,
      });
    });

    it('counts from the start of the cycle for a symptom that keeps to the start', () => {
      const starts = startsOf(genuinelyIrregular).slice(0, PATTERN_WINDOW_CYCLES);
      const patterns = patternsOf(genuinelyIrregular, onCycleDay(starts, 2, 'nausea'));

      expect(patterns[0]).toMatchObject({
        slug: 'nausea',
        anchor: 'cycle-day',
        day: 2,
        cyclesWithIt: PATTERN_WINDOW_CYCLES,
      });
    });

    it('holds a day either side together, because a body is not a clock', () => {
      const periods = thePeriodsAfterTheFirst(veryRegular);
      const wandering = periods.map((period, index) => ({
        day: addDays(period, -3 - (index % 2)),
        symptoms: ['bloating'],
      }));

      expect(patternsOf(veryRegular, wandering)[0]).toMatchObject({
        slug: 'bloating',
        anchor: 'days-before-the-period',
        cyclesWithIt: PATTERN_WINDOW_CYCLES,
      });
    });
  });

  describe('the window it reads back', () => {
    /** Eight complete cycles behind her, which is two more than the window holds. */
    const eightCycles: RecordedSet = {
      firstStart: '2025-10-06',
      lengths: [28, 28, 28, 28, 28, 28, 28, 28],
      periodDays: 4,
    };

    it('counts the last six of them, and says so', () => {
      const patterns = patternsOf(
        eightCycles,
        before(thePeriodsAfterTheFirst(eightCycles), 3, 'cramps'),
      );

      expect(patterns[0]).toMatchObject({
        cyclesWithIt: PATTERN_WINDOW_CYCLES,
        cyclesRead: PATTERN_WINDOW_CYCLES,
      });
    });

    it('leaves out a symptom that only came back before the window', () => {
      const oldest = thePeriodsAfterTheFirst(eightCycles).slice(0, PATTERN_NEEDS_CYCLES);

      expect(patternsOf(eightCycles, before(oldest, 3, 'nausea'))).toEqual([]);
    });
  });

  describe('what is read, and what is left out', () => {
    it('leaves out the cycle she is still in, which has no next period to count back from', () => {
      const openCycleStarted = startsOf(veryRegular)[PATTERN_WINDOW_CYCLES] as string;
      const inTheOpenCycle = [1, 2, 3].map((day) => ({
        day: addDays(openCycleStarted, day),
        symptoms: ['acne'],
      }));

      expect(patternsOf(veryRegular, inTheOpenCycle)).toEqual([]);
    });

    it('counts a mood the same as a symptom, because both are her own catalogue', () => {
      const periods = thePeriodsAfterTheFirst(veryRegular);
      const moods = periods.map((period) => ({ day: addDays(period, -4), moods: ['irritable'] }));

      expect(patternsOf(veryRegular, moods)[0]).toMatchObject({
        slug: 'irritable',
        day: 4,
        cyclesWithIt: PATTERN_WINDOW_CYCLES,
      });
    });

    it('counts a day carrying the same slug twice as one day', () => {
      expect(slugsOn({ day: '2026-05-14', symptoms: ['cramps'], moods: ['cramps'] })).toEqual([
        'cramps',
      ]);
    });

    it('puts the symptom that came back in the most cycles first', () => {
      const periods = thePeriodsAfterTheFirst(veryRegular);
      const patterns = patternsOf(veryRegular, [
        ...before(periods, 3, 'headache'),
        ...before(periods.slice(0, PATTERN_NEEDS_CYCLES), 6, 'nausea'),
      ]);

      expect(patterns.map(({ slug, cyclesWithIt }) => [slug, cyclesWithIt])).toEqual([
        ['headache', PATTERN_WINDOW_CYCLES],
        ['nausea', PATTERN_NEEDS_CYCLES],
      ]);
    });
  });
});
