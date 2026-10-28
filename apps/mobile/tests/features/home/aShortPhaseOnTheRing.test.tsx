import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import {
  NAMED_RING_DIAMETER,
  NAMED_RING_RADIUS,
  type PhaseName,
  type RingGeometry,
  arcAtPoint,
  phaseNameOnArc,
  phaseNames,
  pointOnRing,
  ringGeometry,
  sweepForName,
} from '@emi/tokens';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { getLocales } from 'expo-localization';
import { AccessibilityInfo } from 'react-native';

import {
  cycleRingTestID,
  namedArcFloors,
  ringArcsPressTestID,
  ringNameTestID,
} from '../../../src/components/CycleRing';
import { phaseName } from '../../../src/features/cycle/copy';
import { phasesOf, shapeFromLength } from '../../../src/features/cycle/ringInput';
import {
  ringArcPopoverDaysTestID,
  ringArcPopoverGuideTestID,
  ringArcPopoverNameTestID,
  ringArcPopoverOutsideTestID,
  ringArcPopoverTestID,
} from '../../../src/features/home/RingOfToday';
import { phaseGuidePhaseTestID } from '../../../src/features/phase/PhaseGuide';
import { type Language, forgetLanguage } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHoldsTheseAnswers } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]) }));

/**
 * A short phase on the ring of Today: each arc is wide enough for its whole name, the marker stays
 * in the arc of its phase, and a press on an arc opens a small card with its name and its days.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const centre = { x: NAMED_RING_DIAMETER / 2, y: NAMED_RING_DIAMETER / 2 };

function sheReadsIn(language: Language): void {
  jest.mocked(getLocales).mockReturnValue([{ languageTag: language } as never]);
  forgetLanguage();
}

function theRingOfToday(cycleLengthDays: number, periodDays: number, day = 1): RingGeometry {
  return ringGeometry({
    cycleLengthDays,
    day,
    phases: phasesOf(shapeFromLength(cycleLengthDays, periodDays)),
    minimumSweepDegrees: namedArcFloors(),
  });
}

function arcOf(geometry: RingGeometry, phase: PhaseName) {
  const arc = geometry.arcs.find((each) => each.phase === phase);
  if (arc === undefined) {
    throw new Error(`the ring draws no ${phase} arc`);
  }
  return arc;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  resetExpoSqlite();
  resetExpoSecureStore();
  sheReadsIn('en');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the narrowest arc', () => {
  it.each([28, 45])(
    'should give a 2 day period in a %i day cycle the angle its whole name needs',
    (cycleLengthDays) => {
      const period = arcOf(theRingOfToday(cycleLengthDays, 2), 'period');

      expect(period.sweepDegrees).toBeGreaterThanOrEqual(sweepForName('Period'));
      expect(phaseNameOnArc(period, 'Period')).toEqual({ fit: 'name', written: 'PERIOD' });
    },
  );

  it('should take the degrees the short arcs need from the long arcs, in proportion to their days', () => {
    const ring = theRingOfToday(45, 2);
    const floors = namedArcFloors();
    const follicular = arcOf(ring, 'follicular');
    const luteal = arcOf(ring, 'luteal');

    for (const arc of ring.arcs) {
      expect(arc.sweepDegrees).toBeGreaterThanOrEqual(floors[arc.phase]);
    }
    expect(follicular.sweepDegrees / follicular.days).toBeCloseTo(
      luteal.sweepDegrees / luteal.days,
    );
    expect(
      ring.arcs.reduce((total, arc) => total + arc.sweepDegrees, 0) +
        ring.gapCount * ring.gapDegrees,
    ).toBeCloseTo(360);
  });

  it.each<Language>(['en', 'es', 'ru'])(
    'should write every name whole in %s, for a period of 1 to 10 days and a cycle of 21 to 45',
    (language) => {
      sheReadsIn(language);
      const cut: string[] = [];

      for (let cycleLengthDays = 21; cycleLengthDays <= 45; cycleLengthDays += 1) {
        for (let periodDays = 1; periodDays <= 10; periodDays += 1) {
          for (const arc of theRingOfToday(cycleLengthDays, periodDays).arcs) {
            if (phaseNameOnArc(arc, phaseName(arc.phase)).fit !== 'name') {
              cut.push(`${arc.phase} in ${cycleLengthDays}/${periodDays}`);
            }
          }
        }
      }

      expect(cut).toEqual([]);
    },
  );
});

describe('the marker', () => {
  it.each([
    [28, 2],
    [45, 2],
    [21, 10],
  ])(
    'should sit inside the arc of its phase, at its place in that arc, on each day of a %i day cycle with a %i day period',
    (cycleLengthDays, periodDays) => {
      for (let day = 1; day <= cycleLengthDays; day += 1) {
        const ring = theRingOfToday(cycleLengthDays, periodDays, day);
        const arc = arcOf(ring, ring.phase);

        expect(day).toBeGreaterThanOrEqual(arc.firstDay);
        expect(day).toBeLessThan(arc.firstDay + arc.days);
        expect(ring.beadDegrees).toBeGreaterThan(arc.startDegrees);
        expect(ring.beadDegrees).toBeLessThan(arc.startDegrees + arc.sweepDegrees);
        expect((ring.beadDegrees - arc.startDegrees) / arc.sweepDegrees).toBeCloseTo(
          (day - arc.firstDay + 0.5) / arc.days,
        );
      }
    },
  );
});

describe('a press on the ring', () => {
  it('should find the arc under the press, and nothing off the band', () => {
    const ring = theRingOfToday(28, 2);
    const band = { centre, radius: NAMED_RING_RADIUS, reach: 26 };

    for (const arc of ring.arcs) {
      const middle = pointOnRing(
        centre,
        NAMED_RING_RADIUS,
        arc.startDegrees + arc.sweepDegrees / 2,
      );
      expect(arcAtPoint(ring, band, middle)?.phase).toBe(arc.phase);
    }
    expect(arcAtPoint(ring, band, centre)).toBeUndefined();
  });
});

const herPeriodDays = 2;
const herCycleDays = 28;

function herFirstRunDays(cycleDay: number): DayRecord[] {
  const started = addDays(today, -(cycleDay - 1));
  const lastStart = addDays(started, -herCycleDays);

  return [
    aBleedingDay(lastStart),
    aBleedingDay(addDays(lastStart, 1)),
    aBleedingDay(started),
    aBleedingDay(addDays(started, 1)),
  ];
}

async function sheOpensToday(cycleDay: number): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: herCycleDays,
      periodLengthDays: herPeriodDays,
      name: 'Maria',
      recordedAt: whenSheOpensIt.toISOString(),
    },
    herFirstRunDays(cycleDay),
  );
  await renderRouter(appDirectory, { initialUrl: '/' });
  await screen.findByTestId(cycleRingTestID);
}

async function shePresses(phase: PhaseName): Promise<void> {
  const ring = theRingOfToday(herCycleDays, herPeriodDays, 10);
  const arc = arcOf(ring, phase);
  const middle = pointOnRing(centre, NAMED_RING_RADIUS, arc.startDegrees + arc.sweepDegrees / 2);

  await fireEvent.press(screen.getByTestId(ringArcsPressTestID), {
    nativeEvent: { locationX: middle.x, locationY: middle.y },
  });
}

/** The drawing library carries the words of a text along a path as a prop, not as a child. */
function writtenAlong(node: unknown): string {
  if (Array.isArray(node)) {
    return node.map(writtenAlong).join('');
  }
  if (node !== null && typeof node === 'object' && 'children' in node) {
    const content = (node as { props?: { content?: unknown } }).props?.content;
    return (
      (typeof content === 'string' ? content : '') +
      writtenAlong((node as { children: unknown }).children)
    );
  }
  return typeof node === 'string' ? node : '';
}

function saidUnder(testID: string): string {
  return textIn(screen.getByTestId(testID)).join('');
}

describe('the card a press on an arc opens', () => {
  it('should write PERIOD whole on a 2 day period arc', async () => {
    await sheOpensToday(10);

    expect(writtenAlong(screen.getByTestId(ringNameTestID('period')))).toBe('PERIOD');
  });

  it.each<[Language, Record<PhaseName, [string, string]>]>([
    [
      'en',
      {
        period: ['Period', 'Days 1 to 2 of this cycle'],
        follicular: ['Follicular', 'Days 3 to 13 of this cycle'],
        ovulation: ['Ovulation', 'Days 14 to 18 of this cycle'],
        luteal: ['Luteal', 'Days 19 to 28 of this cycle'],
      },
    ],
    [
      'es',
      {
        period: ['Periodo', 'Días 1 a 2 de este ciclo'],
        follicular: ['Folicular', 'Días 3 a 13 de este ciclo'],
        ovulation: ['Ovulación', 'Días 14 a 18 de este ciclo'],
        luteal: ['Lútea', 'Días 19 a 28 de este ciclo'],
      },
    ],
    [
      'ru',
      {
        period: ['Месячные', 'Дни с 1 по 2 этого цикла'],
        follicular: ['Фолликулярная', 'Дни с 3 по 13 этого цикла'],
        ovulation: ['Овуляция', 'Дни с 14 по 18 этого цикла'],
        luteal: ['Лютеиновая', 'Дни с 19 по 28 этого цикла'],
      },
    ],
  ])('should name each arc and its days in %s', async (language, says) => {
    sheReadsIn(language);
    await sheOpensToday(10);

    for (const phase of phaseNames) {
      await shePresses(phase);

      expect([saidUnder(ringArcPopoverNameTestID), saidUnder(ringArcPopoverDaysTestID)]).toEqual(
        says[phase],
      );
      await fireEvent.press(screen.getByTestId(ringArcPopoverOutsideTestID));
      expect(screen.queryByTestId(ringArcPopoverTestID)).toBeNull();
    }
  });

  it('should open the guide of the phase it names', async () => {
    await sheOpensToday(10);
    await shePresses('period');
    await fireEvent.press(screen.getByTestId(ringArcPopoverGuideTestID));

    expect(screen.queryByTestId(ringArcPopoverTestID)).toBeNull();
    expect(saidUnder(phaseGuidePhaseTestID)).toBe('Period phase');
  });
});
