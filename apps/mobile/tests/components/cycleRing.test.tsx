import {
  DAYS_AHEAD_STRENGTH,
  FULL_TURN_DEGREES,
  GAP_DEGREES,
  type PhaseSpan,
  RING_DIAMETER,
  RING_OPEN_MILLISECONDS,
  RING_TRACK_WIDTH,
  RingError,
  arcPath,
  colour,
  coveredDegrees,
  phaseLabel,
  phasePalette,
  phaseNames,
  ringGeometry,
} from '@emi/tokens';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

import {
  CycleRing,
  cycleRingTestID,
  ringArcTestID,
  ringBeadTestID,
  ringTrackTestID,
} from '../../src/components/CycleRing';

/**
 * Her own cycles, as the four phase spans the ring is handed. A short one, a long one, and one
 * where a phase never happened.
 */
function phasesOf(period: number, follicular: number, ovulation: number, luteal: number) {
  return [
    { phase: 'period', days: period },
    { phase: 'follicular', days: follicular },
    { phase: 'ovulation', days: ovulation },
    { phase: 'luteal', days: luteal },
  ] as const satisfies readonly PhaseSpan[];
}

const shortCycle = { cycleLengthDays: 21, phases: phasesOf(4, 4, 6, 7) };
const usualCycle = { cycleLengthDays: 28, phases: phasesOf(5, 7, 7, 9) };
const longCycle = { cycleLengthDays: 45, phases: phasesOf(6, 20, 7, 12) };

function reduceMotion(asked: boolean): jest.SpyInstance {
  return jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(asked);
}

/**
 * The drawing keeps a colour as the integer the platform passes down, so it is read back as the
 * hex the token holds and the test can name the token rather than a number.
 */
function colourOf(drawn: unknown): string {
  const payload = (drawn as { payload?: number }).payload;

  if (typeof payload !== 'number') {
    throw new Error(`${JSON.stringify(drawn)} is not a colour the drawing passed down`);
  }

  return `#${(payload & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;
}

/** The value an animated style holds right now, which is what she is looking at. */
function styleOf(testID: string): Record<string, unknown> {
  const node = screen.getByTestId(testID);

  return JSON.parse(JSON.stringify(node.props.style ?? {})) as Record<string, unknown>;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the ring geometry', () => {
  it('gives the arcs and the gaps the whole turn, on a short cycle and a long one', () => {
    for (const cycle of [shortCycle, usualCycle, longCycle]) {
      const geometry = ringGeometry({ ...cycle, day: 1 });

      expect(geometry.arcs).toHaveLength(4);
      expect(geometry.gapCount).toBe(4);
      expect(coveredDegrees(geometry)).toBeCloseTo(FULL_TURN_DEGREES, 9);
    }
  });

  it('sizes each arc by the days of that phase, and never by a fixed quarter', () => {
    const geometry = ringGeometry({ ...longCycle, day: 1 });
    const forArcs = FULL_TURN_DEGREES - 4 * GAP_DEGREES;
    const sweeps = geometry.arcs.map((arc) => arc.sweepDegrees);

    expect(sweeps.map((sweep) => Math.round(sweep * 100) / 100)).toEqual(
      [6, 20, 7, 12].map((days) => Math.round(((forArcs * days) / 45) * 100) / 100),
    );
    expect(new Set(sweeps).size).toBe(4);
  });

  it('leaves a gap of ground at every boundary, so no boundary is a colour change alone', () => {
    const geometry = ringGeometry({ ...usualCycle, day: 14 });

    for (let at = 1; at < geometry.arcs.length; at += 1) {
      const before = geometry.arcs[at - 1];
      const here = geometry.arcs[at];

      expect(here!.startDegrees - (before!.startDegrees + before!.sweepDegrees)).toBeCloseTo(
        GAP_DEGREES,
        9,
      );
    }

    const last = geometry.arcs[geometry.arcs.length - 1];

    expect(FULL_TURN_DEGREES - (last!.startDegrees + last!.sweepDegrees)).toBeCloseTo(
      GAP_DEGREES,
      9,
    );
  });

  it('draws nothing at all for a phase of no days, and no gap for it either', () => {
    const geometry = ringGeometry({
      cycleLengthDays: 24,
      day: 3,
      phases: phasesOf(5, 9, 0, 10),
    });

    expect(geometry.arcs.map((arc) => arc.phase)).toEqual(['period', 'follicular', 'luteal']);
    expect(geometry.gapCount).toBe(3);
    expect(coveredDegrees(geometry)).toBeCloseTo(FULL_TURN_DEGREES, 9);
  });

  it('gives the whole turn to one arc when only one phase ran, because it has no neighbour', () => {
    const geometry = ringGeometry({ cycleLengthDays: 6, day: 6, phases: phasesOf(6, 0, 0, 0) });

    expect(geometry.gapCount).toBe(0);
    expect(geometry.arcs[0]?.sweepDegrees).toBeCloseTo(FULL_TURN_DEGREES, 9);
  });

  it('puts the bead on the day she is on, for a cycle of 21 days and one of 45', () => {
    const forArcs = FULL_TURN_DEGREES - 4 * GAP_DEGREES;

    // Day 5 of the short cycle is the first follicular day: four period days, then a gap.
    const short = ringGeometry({ ...shortCycle, day: 5 });

    expect(short.phase).toBe('follicular');
    expect(short.beadDegrees).toBeCloseTo(
      (forArcs * 4) / 21 + GAP_DEGREES + (0.5 / 4) * ((forArcs * 4) / 21),
      9,
    );

    // Day 30 of the long cycle is the fourth ovulation day: six period and twenty follicular.
    const long = ringGeometry({ ...longCycle, day: 30 });

    expect(long.phase).toBe('ovulation');
    expect(long.beadDegrees).toBeCloseTo(
      (forArcs * 26) / 45 + 2 * GAP_DEGREES + (3.5 / 7) * ((forArcs * 7) / 45),
      9,
    );
  });

  it('keeps the bead inside the track on the first day and on the last', () => {
    for (const cycle of [shortCycle, longCycle]) {
      const first = ringGeometry({ ...cycle, day: 1 });
      const last = ringGeometry({ ...cycle, day: cycle.cycleLengthDays });

      expect(first.beadDegrees).toBeGreaterThan(0);
      expect(last.beadDegrees).toBeLessThan(FULL_TURN_DEGREES - GAP_DEGREES);
    }
  });

  it('counts today as elapsed, and every day after it as ahead', () => {
    const geometry = ringGeometry({ ...usualCycle, day: 9 });
    const [period, follicular, ovulation, luteal] = geometry.arcs;

    expect([period!.elapsedDays, follicular!.elapsedDays]).toEqual([5, 4]);
    expect([ovulation!.elapsedDays, luteal!.elapsedDays]).toEqual([0, 0]);
    expect(follicular!.elapsedDegrees).toBeCloseTo((follicular!.sweepDegrees * 4) / 7, 9);
  });

  it('refuses a day outside the cycle, naming the day and the cycle', () => {
    expect(() => ringGeometry({ ...shortCycle, day: 22 })).toThrow(RingError);
    expect(() => ringGeometry({ ...shortCycle, day: 0 })).toThrow(
      'day 0 is outside a cycle of 21 days',
    );
    try {
      ringGeometry({ ...shortCycle, day: 22 });
    } catch (refused) {
      expect((refused as RingError).refusal).toBe('the-day-is-outside-the-cycle');
    }
  });

  it('refuses phases that do not add up to the cycle she is in', () => {
    expect(() =>
      ringGeometry({ cycleLengthDays: 28, day: 1, phases: phasesOf(5, 7, 7, 8) }),
    ).toThrow('the four phases run for 27 days and the cycle runs for 28');
  });

  it('refuses a part day, and refuses anything but the four phases in their order', () => {
    expect(() =>
      ringGeometry({ cycleLengthDays: 28, day: 1, phases: phasesOf(5.5, 6.5, 7, 9) }),
    ).toThrow(RingError);
    expect(() =>
      ringGeometry({
        cycleLengthDays: 28,
        day: 1,
        phases: [
          { phase: 'follicular', days: 7 },
          { phase: 'period', days: 5 },
          { phase: 'ovulation', days: 7 },
          { phase: 'luteal', days: 9 },
        ],
      }),
    ).toThrow('the ring is drawn from period, follicular, ovulation, luteal');
  });
});

describe('the ring on the screen', () => {
  it('draws one arc for each phase that ran, at the colour of that phase', async () => {
    reduceMotion(false);
    await render(<CycleRing {...usualCycle} day={9} />);

    for (const phase of phaseNames) {
      const drawn =
        screen.queryByTestId(ringArcTestID(phase, 'elapsed')) ??
        screen.queryByTestId(ringArcTestID(phase, 'ahead'));

      expect(colourOf(drawn?.props.stroke)).toBe(colour[phasePalette[phase].fill]);
    }
    expect(colourOf(screen.getByTestId(ringArcTestID('period', 'elapsed')).props.stroke)).toBe(
      colour.period,
    );
    expect(colourOf(screen.getByTestId(ringArcTestID('luteal', 'ahead')).props.stroke)).toBe(
      colour.luteal,
    );
  });

  it('draws the days she has reached solid and the days ahead at a fifth', async () => {
    reduceMotion(false);
    await render(<CycleRing {...usualCycle} day={9} />);

    const elapsed = screen.getByTestId(ringArcTestID('follicular', 'elapsed'));
    const ahead = screen.getByTestId(ringArcTestID('follicular', 'ahead'));

    expect(elapsed.props.opacity).toBeUndefined();
    expect(ahead.props.opacity).toBe(DAYS_AHEAD_STRENGTH);
    expect(screen.queryByTestId(ringArcTestID('ovulation', 'elapsed'))).toBeNull();
    expect(screen.queryByTestId(ringArcTestID('period', 'ahead'))).toBeNull();
  });

  it('draws each arc where the geometry says, so the picture and the phone agree', async () => {
    reduceMotion(false);
    await render(<CycleRing {...longCycle} day={30} />);

    const centre = { x: RING_DIAMETER / 2, y: RING_DIAMETER / 2 };
    const radius = (RING_DIAMETER - RING_TRACK_WIDTH) / 2;
    const geometry = ringGeometry({ ...longCycle, day: 30 });
    const ovulation = geometry.arcs[2]!;

    expect(screen.getByTestId(ringArcTestID('ovulation', 'elapsed')).props.d).toBe(
      arcPath(centre, radius, ovulation.startDegrees, ovulation.elapsedDegrees),
    );
    expect(screen.getByTestId(ringArcTestID('ovulation', 'ahead')).props.d).toBe(
      arcPath(
        centre,
        radius,
        ovulation.startDegrees + ovulation.elapsedDegrees,
        ovulation.sweepDegrees - ovulation.elapsedDegrees,
      ),
    );
  });

  it('writes the phase in words and the day in the middle, so colour is never the only cue', async () => {
    reduceMotion(false);
    await render(<CycleRing {...longCycle} day={30} />);

    expect(screen.getByText(phaseLabel.ovulation)).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByTestId(cycleRingTestID).props.accessibilityLabel).toBe(
      'Day 30 of 45, ovulation',
    );
  });

  it('carries the written name in the ink partner, because a phase fill never carries text', async () => {
    reduceMotion(false);
    await render(<CycleRing {...usualCycle} day={2} />);

    const style = StyleSheetFlat(screen.getByText(phaseLabel.period).props.style);

    expect(style.color).toBe(colour.periodInk);
    expect(style.color).not.toBe(colour.period);
  });

  it('puts the bead where the geometry puts today', async () => {
    reduceMotion(false);
    await render(<CycleRing {...shortCycle} day={5} />);

    const bead = screen.getByTestId(ringBeadTestID);

    expect(colourOf(bead.props.fill)).toBe(colour.primary);
    expect(colourOf(bead.props.stroke)).toBe(colour.surfaceContainerLowest);
    expect(bead.props.cy).toBeLessThan(RING_DIAMETER / 2);
    expect(bead.props.cx).toBeGreaterThan(RING_DIAMETER / 2);
  });
});

function StyleSheetFlat(style: unknown): Record<string, unknown> {
  const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;

  return (flat ?? {}) as Record<string, unknown>;
}

describe('the ring and the reduced motion setting', () => {
  it('moves once when the phone allows motion, over six hundred milliseconds', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');

    await render(<CycleRing {...usualCycle} day={9} />);

    await waitFor(() => expect(timing).toHaveBeenCalled());
    for (const call of timing.mock.calls) {
      expect(call[1].duration).toBe(RING_OPEN_MILLISECONDS);
    }
  });

  it('does not move at all when the phone asks for less motion, and arrives open', async () => {
    reduceMotion(true);
    const timing = jest.spyOn(Animated, 'timing');

    await render(<CycleRing {...usualCycle} day={9} />);

    await waitFor(() =>
      expect(styleOf(ringTrackTestID)).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] }),
    );
    expect(timing).not.toHaveBeenCalled();
  });
});
