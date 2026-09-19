import { type DayRecord, addDays, daysBetween } from '@emi/cycle';
import {
  FULL_TURN_DEGREES,
  GAP_DEGREES,
  colour,
  coveredDegrees,
  phaseLabel,
  ringGeometry,
} from '@emi/tokens';
import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import {
  CycleRing,
  cycleRingTestID,
  ringArcTestID,
  ringBeadTestID,
} from '../../src/components/CycleRing';
import { listCycles } from '../../src/data/cycleRepository';
import { daysLogged } from '../fixtures/cycleCache';
import { phasesFromCycle } from '../fixtures/ringPhases';
import { type RecordedSet, daysOf } from '../../../../packages/cycle/tests/fixtures/recordedSets';

const loggedAt = new Date('2026-09-17T08:00:00.000Z');

/** Two women, each with six cycles of her own recorded, and neither of them a textbook 28 days. */
const herShortCycles: RecordedSet = {
  firstStart: '2026-01-05',
  lengths: [21, 21, 22, 21, 20, 21],
  periodDays: 4,
};

const herLongCycles: RecordedSet = {
  firstStart: '2026-01-05',
  lengths: [45, 44, 45, 46, 45, 45],
  periodDays: 6,
};

interface HerRing {
  readonly cycleLengthDays: number;
  readonly day: number;
  readonly phases: ReturnType<typeof phasesFromCycle>;
}

/**
 * What the ring is handed, read back out of the database she wrote to. The cycle she is in has no
 * length of its own yet, so the ring is drawn at the length of the last cycle she completed.
 */
function herRingOn(set: RecordedSet, today: string): HerRing {
  const database = daysLogged(daysOf(set) as DayRecord[], loggedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];
  const complete = cycles[cycles.length - 2];

  if (open === undefined || complete?.lengthDays == null || complete.periodLengthDays == null) {
    throw new Error('her own cycles are what the ring is drawn from, and none were read back');
  }

  return {
    cycleLengthDays: complete.lengthDays,
    day: daysBetween(open.startedOn, today) + 1,
    phases: phasesFromCycle(complete.lengthDays, complete.periodLengthDays),
  };
}

/** The day of the cycle she is in, counted from the day that cycle started. */
function theDay(set: RecordedSet, dayOfCycle: number): string {
  const starts = set.lengths.reduce((day, length) => addDays(day, length), set.firstStart);

  return addDays(starts, dayOfCycle - 1);
}

function sweepOf(phase: 'period' | 'follicular' | 'ovulation' | 'luteal', her: HerRing): number {
  const arc = ringGeometry(her).arcs.find((each) => each.phase === phase);

  return arc?.sweepDegrees ?? 0;
}

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the ring renders a short cycle and a long cycle correctly', () => {
  describe('a cycle of twenty one days', () => {
    it('draws her four bleeding days as a wider arc than the same days on a long cycle', () => {
      const short = herRingOn(herShortCycles, theDay(herShortCycles, 3));
      const long = herRingOn(herLongCycles, theDay(herLongCycles, 3));

      expect(short.cycleLengthDays).toBe(21);
      expect(long.cycleLengthDays).toBe(45);
      expect(sweepOf('period', short)).toBeGreaterThan(sweepOf('period', long));
    });

    it('draws nothing where a phase her cycle has no room for would go', async () => {
      const her = herRingOn(herShortCycles, theDay(herShortCycles, 3));

      await render(<CycleRing {...her} />);

      expect(her.phases).toContainEqual({ phase: 'follicular', days: 0 });
      expect(screen.queryByTestId(ringArcTestID('follicular', 'elapsed'))).toBeNull();
      expect(screen.queryByTestId(ringArcTestID('follicular', 'ahead'))).toBeNull();
      expect(screen.getByTestId(ringArcTestID('period', 'elapsed'))).toBeTruthy();
    });

    it('leaves the whole turn covered by the arcs it does draw and the ground between them', () => {
      const her = herRingOn(herShortCycles, theDay(herShortCycles, 3));
      const geometry = ringGeometry(her);

      expect(geometry.arcs).toHaveLength(3);
      expect(geometry.gapCount).toBe(3);
      expect(coveredDegrees(geometry)).toBeCloseTo(FULL_TURN_DEGREES, 9);
    });
  });

  describe('a cycle of forty five days', () => {
    it('draws all four phases, each one sized by her own days', () => {
      const her = herRingOn(herLongCycles, theDay(herLongCycles, 30));
      const geometry = ringGeometry(her);
      const forArcs = FULL_TURN_DEGREES - 4 * GAP_DEGREES;

      expect(geometry.arcs.map((arc) => arc.days)).toEqual([6, 21, 7, 11]);
      expect(geometry.arcs.map((arc) => Math.round(arc.sweepDegrees * 100) / 100)).toEqual(
        [6, 21, 7, 11].map((days) => Math.round(((forArcs * days) / 45) * 100) / 100),
      );
    });

    it('puts the bead further round the ring on day thirty than on day three', async () => {
      const early = herRingOn(herLongCycles, theDay(herLongCycles, 3));
      const later = herRingOn(herLongCycles, theDay(herLongCycles, 30));

      const view = await render(<CycleRing {...early} />);
      const earlyBead = screen.getByTestId(ringBeadTestID).props.cx as number;

      await view.rerender(<CycleRing {...later} />);

      expect(ringGeometry(later).beadDegrees).toBeGreaterThan(ringGeometry(early).beadDegrees);
      expect(screen.getByTestId(ringBeadTestID).props.cx).not.toBe(earlyBead);
    });
  });

  describe('what she is left looking at', () => {
    it('says the day she is on and names the phase in words', async () => {
      const her = herRingOn(herLongCycles, theDay(herLongCycles, 30));

      await render(<CycleRing {...her} />);

      expect(screen.getByText('30')).toBeTruthy();
      expect(screen.getByText(phaseLabel.ovulation)).toBeTruthy();
      expect(screen.getByTestId(cycleRingTestID).props.accessibilityLabel).toBe(
        'Day 30 of 45, ovulation',
      );
    });

    it('redraws the words and the bead when the day moves on', async () => {
      const today = herRingOn(herShortCycles, theDay(herShortCycles, 4));
      const tomorrow = herRingOn(herShortCycles, theDay(herShortCycles, 5));

      const view = await render(<CycleRing {...today} />);

      expect(screen.getByText(phaseLabel.period)).toBeTruthy();

      await view.rerender(<CycleRing {...tomorrow} />);

      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText(phaseLabel.ovulation)).toBeTruthy();
      expect(screen.queryByText(phaseLabel.period)).toBeNull();
    });

    it('draws the days she has lived at full strength and the rest of her cycle faintly', async () => {
      const her = herRingOn(herLongCycles, theDay(herLongCycles, 30));

      await render(<CycleRing {...her} />);

      const elapsed = screen.getByTestId(ringArcTestID('ovulation', 'elapsed'));
      const ahead = screen.getByTestId(ringArcTestID('luteal', 'ahead'));

      expect(elapsed.props.opacity).toBeUndefined();
      expect(ahead.props.opacity).toBeLessThan(1);
      expect(screen.queryByTestId(ringArcTestID('luteal', 'elapsed'))).toBeNull();
      expect(colour.primary).toBeTruthy();
    });
  });
});
