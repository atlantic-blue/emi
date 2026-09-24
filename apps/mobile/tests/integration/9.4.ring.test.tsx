import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { addDays } from '@emi/cycle';
import {
  CYCLE_DAY_ROLE,
  DAYS_AHEAD_STRENGTH,
  FULL_TURN_DEGREES,
  PHASE_NAME_ROLE,
  type PhaseName,
  beadPalette,
  colour,
  coveredDegrees,
  face,
  fontNameFor,
  fonts,
  phaseLabel,
  phaseNames,
  phasePalette,
  ringGeometry,
  typeScale,
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
import { listCycles } from '../../src/data/cycleRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { type RingInput, ringInputFor } from '../../src/features/cycle/ringInput';
import { HomeScreen } from '../../src/features/home/HomeScreen';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { daysOf, veryRegular } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { daysLogged, readDay } from '../fixtures/cycleCache';
import { drawnRuns } from '../fixtures/drawnFaces';
import { recordedAt } from '../fixtures/forecast';
import { colourOf, textDrawnOnAPhaseFill } from '../fixtures/phaseInk';
import { phasesFromCycle } from '../fixtures/ringPhases';
import { OnAPhone } from '../fixtures/theSafeArea';

/**
 * The ring in the Warm Editorial Journal style. The arcs take the four phase fills, the name of
 * the phase she is in is written in that phase's ink on the surface, and the cycle day is written
 * in the monospaced face.
 *
 * Every colour here is read from somewhere rather than typed: the four fills come out of the
 * design system document itself, so the run reads the document, the token package and the drawing
 * as one chain and a break anywhere along it fails.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const designSystemDocument = join('docs', 'design', 'prototype-design-system.md');

/**
 * One colour of the front matter, by the name the document writes it under. The document is the
 * only place a value is written, so a test that typed the value would prove nothing about it.
 */
function inTheDesignSystem(name: string): string {
  const document = readFileSync(join(repositoryRoot, designSystemDocument), 'utf8');
  const front = document.split('---')[1] ?? '';
  const written = new RegExp(`^ {2}${name}: *'([^']+)'`, 'm').exec(front);

  if (written?.[1] === undefined) {
    throw new Error(`${designSystemDocument} names no colour called ${name}`);
  }

  return written[1];
}

/** The document writes a name in kebab case and the token package writes it in camel case. */
const documentName: Readonly<Record<PhaseName, string>> = {
  period: 'period',
  follicular: 'follicular',
  ovulation: 'ovulation',
  luteal: 'luteal',
};

const herCycle = { cycleLengthDays: 28, periodDays: 5 };
const herPhases = phasesFromCycle(herCycle.cycleLengthDays, herCycle.periodDays);
const herRing = { cycleLengthDays: herCycle.cycleLengthDays, phases: herPhases };

/** A day inside each phase, taken from the arcs rather than counted by hand. */
function aDayIn(phase: PhaseName): number {
  const arc = ringGeometry({ ...herRing, day: 1 }).arcs.find((each) => each.phase === phase);

  if (arc === undefined) {
    throw new Error(`a cycle of ${herCycle.cycleLengthDays} days drew no ${phase} arc`);
  }

  return arc.firstDay + Math.floor((arc.days - 1) / 2);
}

/**
 * The drawing keeps a colour as the integer the platform passes down, so it is read back as the
 * hex the token holds and a case can name the token rather than a number.
 */
function drawnColour(drawn: unknown): string {
  const payload = (drawn as { payload?: number }).payload;

  if (typeof payload !== 'number') {
    throw new Error(`${JSON.stringify(drawn)} is not a colour the drawing passed down`);
  }

  return `#${(payload & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;
}

/** The run of text the ring wrote the phase name in, as it reached the glass. */
function theWrittenName(phase: PhaseName): ReturnType<typeof screen.getByText> {
  return screen.getByText(phaseLabel[phase]);
}

async function sheLooksAtTheRingOn(day: number): Promise<void> {
  await render(<CycleRing {...herRing} day={day} />);
}

/** Her own six cycles, written and read back the way the application reads them. */
function herHomeScreen(dayOfCycle: number): {
  readonly ring: RingInput;
  readonly forecast: ReturnType<typeof forecastOf>;
} {
  const database = daysLogged(daysOf(veryRegular), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];

  if (open === undefined) {
    throw new Error('her own days were written and no cycle was read back');
  }

  const ring = ringInputFor({
    cycles,
    records: recordedDays(database, readDay),
    today: addDays(open.startedOn, dayOfCycle - 1),
    statedCycleLengthDays: herCycle.cycleLengthDays,
  });

  if (ring === undefined) {
    throw new Error('six recorded cycles drew no ring');
  }

  return { ring, forecast: forecastOf(cycles) };
}

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the phase name is written in its ink and never on its own fill', () => {
  describe('the four arcs take the phase fills of the design system', () => {
    it.each(phaseNames)('draws the %s arc in the fill the design system names', async (phase) => {
      await sheLooksAtTheRingOn(aDayIn('follicular'));

      const drawn =
        screen.queryByTestId(ringArcTestID(phase, 'elapsed')) ??
        screen.getByTestId(ringArcTestID(phase, 'ahead'));

      expect(drawnColour(drawn.props.stroke).toLowerCase()).toBe(
        inTheDesignSystem(documentName[phase]).toLowerCase(),
      );
      expect(drawnColour(drawn.props.stroke)).toBe(colour[phasePalette[phase].fill]);
    });

    it('draws the days ahead in the same fill, at a fifth of the strength', async () => {
      await sheLooksAtTheRingOn(aDayIn('follicular'));

      const elapsed = screen.getByTestId(ringArcTestID('follicular', 'elapsed'));
      const ahead = screen.getByTestId(ringArcTestID('follicular', 'ahead'));

      expect(drawnColour(ahead.props.stroke)).toBe(drawnColour(elapsed.props.stroke));
      expect(ahead.props.opacity).toBe(DAYS_AHEAD_STRENGTH);
      expect(elapsed.props.opacity).toBeUndefined();
    });
  });

  describe('the name of the phase she is in', () => {
    it.each(phaseNames)('writes the name in the ink of the %s phase', async (phase) => {
      await sheLooksAtTheRingOn(aDayIn(phase));

      expect(colourOf(theWrittenName(phase))).toBe(colour[phasePalette[phase].ink]);
    });

    it.each(phaseNames)('writes the %s name on no fill at all', async (phase) => {
      await sheLooksAtTheRingOn(aDayIn(phase));

      expect(textDrawnOnAPhaseFill(screen.toJSON())).toEqual([]);
      expect(colourOf(theWrittenName(phase))).not.toBe(colour[phasePalette[phase].fill]);
    });

    it('writes the name at the label size, which is small enough for her and not for a stranger', async () => {
      await sheLooksAtTheRingOn(aDayIn('period'));

      const written = drawnRuns(screen.toJSON()).find((run) => run.text === phaseLabel.period);

      expect(written?.points).toBe(typeScale[PHASE_NAME_ROLE].size);
      expect(written?.points).toBeLessThanOrEqual(14);
    });
  });

  describe('the cycle day', () => {
    it('writes the day in the monospaced face the design system gives a figure', async () => {
      const day = aDayIn('luteal');
      await sheLooksAtTheRingOn(day);

      const written = drawnRuns(screen.toJSON()).find((run) => run.text === String(day));

      expect(face[typeScale[CYCLE_DAY_ROLE].face]).toBe('JetBrains Mono');
      expect(fonts.jetBrainsMono.family).toBe(face.data);
      expect(written?.family).toBe(
        fontNameFor(typeScale[CYCLE_DAY_ROLE].face, typeScale[CYCLE_DAY_ROLE].weight),
      );
      expect(written?.points).toBe(typeScale[CYCLE_DAY_ROLE].size);
    });
  });

  describe('the bead on today', () => {
    it('draws it in the colour the design system gives the active bead on the ring', async () => {
      await sheLooksAtTheRingOn(aDayIn('ovulation'));

      const bead = screen.getByTestId(ringBeadTestID);

      expect(drawnColour(bead.props.fill)).toBe(colour[beadPalette.fill]);
      expect(drawnColour(bead.props.fill).toLowerCase()).toBe(
        inTheDesignSystem('primary-container').toLowerCase(),
      );
      expect(drawnColour(bead.props.stroke)).toBe(colour[beadPalette.halo]);
    });
  });

  describe('the ring still reads without colour', () => {
    it('leaves a gap of ground at every boundary, so no boundary is a colour change alone', async () => {
      const day = aDayIn('ovulation');
      const geometry = ringGeometry({ ...herRing, day });
      await sheLooksAtTheRingOn(day);

      expect(geometry.gapCount).toBe(phaseNames.length);
      expect(coveredDegrees(geometry)).toBeCloseTo(FULL_TURN_DEGREES, 9);
      expect(screen.getByTestId(cycleRingTestID).props.accessibilityLabel).toContain('ovulation');
    });

    it.each(phaseNames)('names the %s phase in words inside the ring', async (phase) => {
      await sheLooksAtTheRingOn(aDayIn(phase));

      expect(theWrittenName(phase)).toBeTruthy();
    });
  });

  describe('the ring and the reduced motion setting', () => {
    it('holds still and arrives open when the system asks for less motion', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      const timing = jest.spyOn(Animated, 'timing');

      await sheLooksAtTheRingOn(aDayIn('period'));

      await waitFor(() => {
        const held = JSON.parse(
          JSON.stringify(screen.getByTestId(ringTrackTestID).props.style ?? {}),
        ) as Record<string, unknown>;

        expect(held).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
      });
      expect(timing).not.toHaveBeenCalled();
    });
  });

  describe('the ring on the home screen she is looking at', () => {
    it('writes the phase name in its ink, on the surface and on no fill', async () => {
      const her = herHomeScreen(aDayIn('follicular'));

      await render(
        <OnAPhone>
          <HomeScreen
            cycleLengthDays={herCycle.cycleLengthDays}
            forecast={her.forecast}
            onExport={() => undefined}
            onHistory={() => undefined}
            onLogPain={() => undefined}
            onLogToday={() => undefined}
            onSettings={() => undefined}
            ring={her.ring}
          />
        </OnAPhone>,
      );

      const phase = ringGeometry(her.ring).phase;

      expect(colourOf(theWrittenName(phase))).toBe(colour[phasePalette[phase].ink]);
      expect(textDrawnOnAPhaseFill(screen.toJSON())).toEqual([]);
      expect(drawnColour(screen.getByTestId(ringBeadTestID).props.fill)).toBe(
        colour[beadPalette.fill],
      );
    });
  });
});
