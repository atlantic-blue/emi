import { join } from 'node:path';

import { type DayRecord, addDays, daysBetween } from '@emi/cycle';
import type { PhaseSpan } from '@emi/tokens';
import { render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { CycleRing, cycleRingTestID } from '../../../src/components/CycleRing';
import { listCycles } from '../../../src/data/cycleRepository';
import { recordedDays } from '../../../src/features/cycle/rebuild';
import { ringInputFor } from '../../../src/features/cycle/ringInput';
import { logSymptoms } from '../../../src/features/log/logDay';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { daysLogged, readDay } from '../../fixtures/cycleCache';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';
import { phasesFromCycle } from '../../fixtures/ringPhases';
import { theArcsOnTheRing } from '../../fixtures/theRingSheReads';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

/** Midday, away from any summer time change, so her day reads the same in every zone. */
const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

const herCycleLengthDays = 29;
const herPeriodLengthDays = 5;

/** The two days her first run writes: her last period eleven days ago, and the one before it. */
const herLastPeriodStarted = addDays(today, -11);
const herPeriodBeforeStarted = addDays(herLastPeriodStarted, -herCycleLengthDays);
const theDaysHerFirstRunWrote = [
  aBleedingDay(herPeriodBeforeStarted),
  aBleedingDay(herLastPeriodStarted),
];

/** A day of her cycle, counting from one, as a date. */
function cycleDay(day: number): string {
  return addDays(herLastPeriodStarted, day - 1);
}

function theDaysOfThePeriodArc(phases: readonly PhaseSpan[]): number {
  return phases.find((span) => span.phase === 'period')?.days ?? 0;
}

/** How far round the ring the period arc is painted, read off the glass. */
function thePeriodArcPainted(): number {
  const period = theArcsOnTheRing().find((arc) => arc.phase === 'period');

  if (period === undefined) {
    throw new Error('the ring painted no period arc');
  }

  return period.sweepDegrees;
}

/**
 * The period arc the ring paints for a period of so many days, on the day she opens Today. It is
 * painted by the same ring, so the arc Today paints matches it only when Today hands the ring the
 * same number of days.
 */
async function thePeriodArcPaintedFor(periodDays: number): Promise<number> {
  const day = daysBetween(herLastPeriodStarted, today) + 1;

  await render(
    <CycleRing
      cycleLengthDays={herCycleLengthDays}
      day={day}
      phases={phasesFromCycle(herCycleLengthDays, periodDays)}
    />,
  );
  const painted = thePeriodArcPainted();

  await screen.unmount();

  return painted;
}

/** She picks one symptom on a day, through the write the Symptoms sheet makes. */
function sheLogsOnlyASymptomOn(day: string): void {
  logSymptoms(herDatabase(), herVault(), { day, symptoms: ['low-mood'], now: whenSheOpensIt });
}

describe('the period arc Today draws after a day with symptoms only', () => {
  let fiveDays = 0;
  let oneDay = 0;

  beforeAll(async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    fiveDays = await thePeriodArcPaintedFor(herPeriodLengthDays);
    oneDay = await thePeriodArcPaintedFor(1);
  });

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

  async function sheOpensToday(): Promise<void> {
    await renderRouter(appDirectory, { initialUrl: '/' });
    await screen.findByTestId(cycleRingTestID);
  }

  it('draws the five days she gave straight after the first run', async () => {
    await herPhoneHolds(
      whenSheOpensIt,
      theDaysHerFirstRunWrote,
      herCycleLengthDays,
      herPeriodLengthDays,
    );
    await sheOpensToday();

    expect(thePeriodArcPainted()).toBeCloseTo(fiveDays, 6);
  });

  it('still draws the five days she gave after she logs only a symptom today', async () => {
    await herPhoneHolds(
      whenSheOpensIt,
      theDaysHerFirstRunWrote,
      herCycleLengthDays,
      herPeriodLengthDays,
    );
    sheLogsOnlyASymptomOn(today);
    await sheOpensToday();

    expect(thePeriodArcPainted()).toBeCloseTo(fiveDays, 6);
    expect(thePeriodArcPainted()).not.toBeCloseTo(oneDay, 6);
  });
});

/**
 * The same reading without the screen, for the days around her period. Each case writes her days
 * the way a screen writes them and reads the ring input Today is built from.
 */
function theArcFrom(records: readonly DayRecord[], statedPeriodLengthDays?: number): number {
  const database = daysLogged(records, whenSheOpensIt);
  const ring = ringInputFor({
    cycles: listCycles(database),
    records: recordedDays(database, readDay),
    today,
    statedCycleLengthDays: herCycleLengthDays,
    ...(statedPeriodLengthDays === undefined ? {} : { statedPeriodLengthDays }),
  });

  if (ring === undefined) {
    throw new Error('her first run days drew no ring');
  }

  return theDaysOfThePeriodArc(ring.phases);
}

/** A day she opened only to pick a symptom, so it says nothing about bleeding. */
function aSymptomDay(day: string): DayRecord & { readonly symptoms: readonly string[] } {
  return { day, symptoms: ['low-mood'] };
}

describe('the period arc around a day with symptoms only', () => {
  const firstRun: DayRecord[] = [
    { day: herPeriodBeforeStarted, flow: 'medium' },
    { day: herLastPeriodStarted, flow: 'medium' },
  ];

  it('keeps the length she gave when the symptoms day is day 2 of her period', () => {
    expect(theArcFrom([...firstRun, aSymptomDay(cycleDay(2))], herPeriodLengthDays)).toBe(
      herPeriodLengthDays,
    );
  });

  it('keeps the length she gave when the symptoms day is the day after that length', () => {
    expect(
      theArcFrom(
        [...firstRun, aSymptomDay(cycleDay(herPeriodLengthDays + 1))],
        herPeriodLengthDays,
      ),
    ).toBe(herPeriodLengthDays);
  });

  it('draws the one day she logged when she said she is not sure how long it runs', () => {
    expect(theArcFrom([...firstRun, aSymptomDay(cycleDay(2))])).toBe(1);
  });

  it('draws the days she logged when she closed her period herself', () => {
    const loggedDayByDay: DayRecord[] = [
      ...firstRun,
      { day: cycleDay(2), flow: 'heavy' },
      { day: cycleDay(3), flow: 'light' },
      { day: cycleDay(4), flow: 'none' },
    ];

    expect(theArcFrom(loggedDayByDay, herPeriodLengthDays)).toBe(3);
  });

  it('draws the days she logged when she closed it and then logged a symptom', () => {
    const loggedDayByDay: DayRecord[] = [
      ...firstRun,
      { day: cycleDay(2), flow: 'heavy' },
      { day: cycleDay(3), flow: 'none' },
      aSymptomDay(cycleDay(4)),
    ];

    expect(theArcFrom(loggedDayByDay, herPeriodLengthDays)).toBe(2);
  });

  it('draws the days she bled past the length she gave, with a symptoms day among them', () => {
    const longer: DayRecord[] = [
      ...firstRun,
      ...[2, 3, 4, 5, 6].map((day) => ({ day: cycleDay(day), flow: 'medium' as const })),
      aSymptomDay(cycleDay(7)),
    ];

    expect(theArcFrom(longer, herPeriodLengthDays)).toBe(6);
  });
});
