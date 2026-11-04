import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { type PhaseName, phaseLabel } from '@emi/tokens';
import { screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID } from '../../../src/components/CycleRing';
import { listCycles } from '../../../src/data/cycleRepository';
import { theDayPhaseOn } from '../../../src/features/calendar/herMonthPhases';
import { phaseFullName } from '../../../src/features/cycle/copy';
import { recordedDays } from '../../../src/features/cycle/rebuild';
import { type RingInputFrom, ringInputFor } from '../../../src/features/cycle/ringInput';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { daysLogged, readDay } from '../../fixtures/cycleCache';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../../fixtures/herPhone';
import { theArcsOnTheRing } from '../../fixtures/theRingSheReads';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * The phase rule, contract CYCLE-6, as Today shows it. Her cycle is 28 days and her period 5, so
 * the ovulation day is 16, the ovulation phase is days 14 to 18, and the fertile window, which
 * the calendar marks, is days 11 to 17.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

const herCycleLengthDays = 28;
const herPeriodLengthDays = 5;

/** The first day of the cycle that holds today, when today is that cycle day. */
function theCycleStartedOn(cycleDay: number): string {
  return addDays(today, -(cycleDay - 1));
}

/** The two days her first run writes, so that today is the given day of her cycle. */
function herFirstRunDays(cycleDay: number): ReturnType<typeof aBleedingDay>[] {
  const started = theCycleStartedOn(cycleDay);

  return [aBleedingDay(addDays(started, -herCycleLengthDays)), aBleedingDay(started)];
}

function herReading(cycleDay: number, on: string): RingInputFrom {
  const database = daysLogged(herFirstRunDays(cycleDay), whenSheOpensIt);

  return {
    cycles: listCycles(database).filter((cycle) => cycle.startedOn <= on),
    records: recordedDays(database, readDay),
    today: on,
    statedCycleLengthDays: herCycleLengthDays,
    statedPeriodLengthDays: herPeriodLengthDays,
  };
}

async function sheOpensTodayOn(cycleDay: number): Promise<void> {
  await herPhoneHolds(
    whenSheOpensIt,
    herFirstRunDays(cycleDay),
    herCycleLengthDays,
    herPeriodLengthDays,
  );
  await renderRouter(appDirectory, { initialUrl: '/' });
  await screen.findByTestId(cycleRingTestID);
}

function theRingCentreNames(phase: PhaseName): void {
  expect(within(screen.getByTestId(cycleRingTestID)).getByText(phaseFullName(phase))).toBeTruthy();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  resetExpoSqlite();
  resetExpoSecureStore();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the phase Today names on the ring', () => {
  it.each([
    { cycleDay: 1, phase: 'period' },
    { cycleDay: 5, phase: 'period' },
    { cycleDay: 6, phase: 'follicular' },
    { cycleDay: 11, phase: 'follicular' },
    { cycleDay: 13, phase: 'follicular' },
    { cycleDay: 14, phase: 'ovulation' },
    { cycleDay: 16, phase: 'ovulation' },
    { cycleDay: 18, phase: 'ovulation' },
    { cycleDay: 19, phase: 'luteal' },
    { cycleDay: 28, phase: 'luteal' },
  ] as const)('should name $phase on cycle day $cycleDay', async ({ cycleDay, phase }) => {
    await sheOpensTodayOn(cycleDay);

    if (phase === 'period') {
      theRingCentreNames(phase);
    }
    // Outside her period the middle of the ring counts down to the next one, and the sentence a
    // screen reader hears carries that after the phase.
    expect(
      screen.getByTestId(cycleRingTestID).props.accessibilityLabel.split(', ').slice(0, 2),
    ).toEqual([`Day ${cycleDay} of ${herCycleLengthDays}`, phaseLabel[phase].toLowerCase()]);
  });

  it('should no longer name ovulation on the first day of the fertile window', async () => {
    await sheOpensTodayOn(11);

    expect(
      within(screen.getByTestId(cycleRingTestID)).queryByText(phaseFullName('ovulation')),
    ).toBeNull();
  });
});

describe('the arcs Today draws', () => {
  it('should hand the ring four arcs that do not overlap: 5, 8, 5 and 10 days', () => {
    const ring = ringInputFor(herReading(9, today));

    expect(ring?.phases).toEqual([
      { phase: 'period', days: 5 },
      { phase: 'follicular', days: 8 },
      { phase: 'ovulation', days: 5 },
      { phase: 'luteal', days: 10 },
    ]);
  });

  it('should paint the ovulation arc as long as her five day period, not the window', async () => {
    await sheOpensTodayOn(9);

    const painted = new Map(theArcsOnTheRing().map((arc) => [arc.phase, arc.sweepDegrees]));

    expect(painted.get('ovulation')).toBeCloseTo(painted.get('period') ?? 0, 2);
    expect(painted.get('follicular')).toBeGreaterThan(painted.get('ovulation') ?? 0);
  });
});

describe('the fertile marks of the calendar', () => {
  /** The phase and the fertile mark of one cycle day, as the month reads them. */
  function theMonthOn(cycleDay: number): ReturnType<typeof theDayPhaseOn> {
    const on = addDays(theCycleStartedOn(9), cycleDay - 1);

    return theDayPhaseOn(herReading(9, on), on);
  }

  it('should mark the first day of the fertile window fertile, in the follicular phase', () => {
    expect(theMonthOn(11)).toMatchObject({ fertile: true, phase: 'follicular' });
  });

  it('should mark the last day of the fertile window fertile, in the ovulation phase', () => {
    expect(theMonthOn(17)).toMatchObject({ fertile: true, phase: 'ovulation' });
  });

  it('should not mark the last day of the ovulation phase fertile', () => {
    expect(theMonthOn(18)).toMatchObject({ fertile: false, phase: 'ovulation' });
  });

  it('should not mark a period day fertile', () => {
    expect(theMonthOn(3)).toMatchObject({ fertile: false, phase: 'period' });
  });
});
