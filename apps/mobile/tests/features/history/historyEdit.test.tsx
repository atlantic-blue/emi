import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { listCycles } from '../../../src/data/cycleRepository';
import {
  editPeriodAddBeforeTestID,
  editPeriodSaveTestID,
  editPeriodScreenTestID,
} from '../../../src/features/calendar/EditPeriodScreen';
import {
  historyCycleTestID,
  historyEditTestID,
  historyScreenTestID,
} from '../../../src/features/history/HistoryScreen';
import { logFlowTestID } from '../../../src/features/log/LogFlow';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { dayOf, herDatabase, herPhoneHolds } from '../../fixtures/herPhone';
import { daysOfHerThreeCycles } from '../../fixtures/herThreeCycles';
import { textIn } from '../../fixtures/renderedText';
import { theDaysTickedOnThePicker } from '../../fixtures/thePeriodSheCorrects';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * Edit on a row of History opens the period editor on the period of that row, and a save brings
 * her back to History, which reads her cycles again and shows the new dates.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const sheSaidHerCycleRuns = 29;
const herDays = daysOfHerThreeCycles(today);

/** The days she bled from the start of one cycle, read off the days her phone holds. */
function theBleedingDaysFrom(start: string): string[] {
  const bled = new Set(
    herDays
      .filter((record) => record.flow !== undefined && record.flow !== 'none')
      .map((each) => each.day),
  );
  const days: string[] = [];
  for (let day = start; bled.has(day); day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

/** The oldest cycle her phone holds, so the editor must open on it and not on the newest. */
function theOldestCycleStart(): string {
  const starts = listCycles(herDatabase())
    .map((cycle) => cycle.startedOn)
    .sort();
  const oldest = starts[0];
  if (oldest === undefined) {
    throw new Error('her phone holds no cycle');
  }
  return oldest;
}

describe('History rows open the period editor', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHolds(whenSheOpensIt, herDays, sheSaidHerCycleRuns);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('gives every cycle row an Edit', async () => {
    await renderRouter(appDirectory, { initialUrl: '/history' });

    const starts = listCycles(herDatabase()).map((cycle) => cycle.startedOn);
    expect(starts.length).toBeGreaterThan(1);
    for (const start of starts) {
      expect(textIn(screen.getByTestId(historyEditTestID(start)))).toEqual(['Edit']);
    }
  });

  it('opens the editor on the period of the row she pressed, with its days ticked', async () => {
    const start = theOldestCycleStart();
    const app = renderRouter(appDirectory, { initialUrl: '/history' });
    await app;

    await fireEvent.press(await screen.findByTestId(historyEditTestID(start)));

    expect(await screen.findByTestId(editPeriodScreenTestID)).toBeTruthy();
    expect(app.getPathname()).toBe('/calendar/period');
    expect(theDaysTickedOnThePicker()).toEqual(theBleedingDaysFrom(start));
  });

  it('comes back to History after a save, and the row carries the new start', async () => {
    const start = theOldestCycleStart();
    const aDayEarlier = addDays(start, -1);
    const app = renderRouter(appDirectory, { initialUrl: '/history' });
    await app;

    await fireEvent.press(await screen.findByTestId(historyEditTestID(start)));
    await screen.findByTestId(editPeriodScreenTestID);
    await fireEvent.press(screen.getByTestId(editPeriodAddBeforeTestID));
    await fireEvent.press(screen.getByTestId(editPeriodSaveTestID));

    expect(await screen.findByTestId(historyScreenTestID)).toBeTruthy();
    expect(app.getPathname()).toBe('/history');
    expect(screen.getByTestId(historyCycleTestID(aDayEarlier))).toBeTruthy();
    expect(screen.queryByTestId(historyCycleTestID(start))).toBeNull();
    expect(listCycles(herDatabase()).map((cycle) => cycle.startedOn)).toContain(aDayEarlier);
  });

  it('still opens the day itself when she presses the rest of the row', async () => {
    const start = theOldestCycleStart();
    await renderRouter(appDirectory, { initialUrl: '/history' });

    await fireEvent.press(await screen.findByTestId(historyCycleTestID(start)));

    expect(await screen.findByTestId(logFlowTestID)).toBeTruthy();
    expect(screen.queryByTestId(editPeriodScreenTestID)).toBeNull();
  });
});
