import { join } from 'node:path';

import { screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../../src/data/cycleRepository';
import { readDayLog } from '../../../src/data/dayLogRepository';
import { editPeriodRowTestID } from '../../../src/features/calendar/EditPeriodScreen';
import { homeScreenTestID } from '../../../src/features/home/HomeScreen';
import { theDaysToKeep } from '../../../src/features/cycle/expectedDays';
import { recordedDays } from '../../../src/features/cycle/rebuild';
import {
  keepFilledInChangeTestID,
  keepFilledInKeepTestID,
  keepFilledInLineTestID,
  keepFilledInTestID,
  keepFilledInTitleTestID,
} from '../../../src/features/home/KeepFilledInDays';
import { logFlow } from '../../../src/features/log/logDay';
import { english } from '../../../src/language/english';
import { russian } from '../../../src/language/russian';
import { spanish } from '../../../src/language/spanish';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, herDatabase, herPhoneHolds } from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * Issue 379, step 5: once the days Emi filled in are behind her, Today asks her to keep them.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const herCycleRuns = 28;
const herPeriodRuns = 5;
const theFirstDay = '2026-10-01';
const theFilledDays = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];

async function herPhoneHoldsTheFirstDay(on: Date, periodLengthDays?: number): Promise<void> {
  jest.setSystemTime(on);
  await herPhoneHolds(on, [aBleedingDay(theFirstDay)], herCycleRuns, periodLengthDays);
}

function theFlowOn(day: string): string {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? 'no record' : String(herVault().open(held.payload).flow);
}

async function shePresses(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(await screen.findByTestId(testID));
  });
}

describe('the days she is asked to keep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function theDaysOn(today: string): string[] {
    const database = herDatabase();

    return theDaysToKeep({
      cycles: listCycles(database),
      records: recordedDays(database, (payload) => herVault().open(payload)),
      statedPeriodLengthDays: herPeriodRuns,
      today,
    });
  }

  it('are none while a day Emi filled in is still today or ahead', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 5, 12, 0), herPeriodRuns);

    expect(theDaysOn('2026-10-05')).toEqual([]);
  });

  it('are the days Emi filled in, from the day after the last of them', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 6, 12, 0), herPeriodRuns);

    expect(theDaysOn('2026-10-06')).toEqual(theFilledDays);
  });

  it('leave out a day she logged herself', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 6, 12, 0), herPeriodRuns);
    logFlow(herDatabase(), herVault(), {
      day: '2026-10-03',
      flow: 'heavy',
      now: new Date(2026, 9, 6, 12, 0),
    });

    expect(theDaysOn('2026-10-06')).toEqual(['2026-10-02', '2026-10-04', '2026-10-05']);
  });
});

describe('the card on Today', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('asks her to keep the four days Emi filled in, once they are behind her', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 8, 12, 0), herPeriodRuns);
    await renderRouter(appDirectory, { initialUrl: '/' });

    expect(await screen.findByTestId(keepFilledInTitleTestID)).toHaveTextContent(
      english['home.keepFilledIn.title'],
    );
    expect(screen.getByTestId(keepFilledInLineTestID)).toHaveTextContent(
      'Emi filled in 4 days of this period.',
    );
  });

  it('is not there while a day Emi filled in is still ahead of her', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 4, 12, 0), herPeriodRuns);
    await renderRouter(appDirectory, { initialUrl: '/' });
    await screen.findByTestId(homeScreenTestID);

    expect(screen.queryByTestId(keepFilledInTestID)).toBeNull();
  });

  it('is not there when she said she is not sure how long her period runs', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 8, 12, 0));
    await renderRouter(appDirectory, { initialUrl: '/' });
    await screen.findByTestId(homeScreenTestID);

    expect(screen.queryByTestId(keepFilledInTestID)).toBeNull();
  });

  it('writes the days with one press of Keep them, and the card goes', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 8, 12, 0), herPeriodRuns);
    await renderRouter(appDirectory, { initialUrl: '/' });

    await shePresses(keepFilledInKeepTestID);

    for (const day of theFilledDays) {
      expect(theFlowOn(day)).toBe('medium');
    }
    expect(screen.queryByTestId(keepFilledInTestID)).toBeNull();
  });

  it('counts the kept days as her last period once the next one starts', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 8, 12, 0), herPeriodRuns);
    await renderRouter(appDirectory, { initialUrl: '/' });
    await shePresses(keepFilledInKeepTestID);

    logFlow(herDatabase(), herVault(), {
      day: '2026-10-29',
      flow: 'medium',
      now: new Date(2026, 9, 29, 12, 0),
    });

    expect(listCycles(herDatabase())[0]?.periodLengthDays).toBe(herPeriodRuns);
  });

  it('opens Edit my period with the days ticked when she presses Change them', async () => {
    await herPhoneHoldsTheFirstDay(new Date(2026, 9, 8, 12, 0), herPeriodRuns);
    const app = renderRouter(appDirectory, { initialUrl: '/' });
    await app;

    await shePresses(keepFilledInChangeTestID);

    expect(app.getPathname()).toBe('/calendar/period');
    const row = await screen.findByTestId(editPeriodRowTestID('2026-10-03'));
    expect(row.props.accessibilityState?.checked).toBe(true);
  });
});

describe('the words of the card', () => {
  it('are written in English, Spanish and Russian, with the count in each form', () => {
    expect(english['home.keepFilledIn.title']).toBe('Keep the days Emi filled in?');
    expect(spanish['home.keepFilledIn.title']).toBe('¿Conservar los días que Emi completó?');
    expect(russian['home.keepFilledIn.title']).toBe('Оставить дни, которые отметила Emi?');
    expect(english['home.keepFilledIn.line']).toEqual({
      one: 'Emi filled in {count} day of this period.',
      other: 'Emi filled in {count} days of this period.',
    });
    expect(spanish['home.keepFilledIn.line']).toEqual({
      one: 'Emi completó {count} día de este periodo.',
      other: 'Emi completó {count} días de este periodo.',
    });
    expect(russian['home.keepFilledIn.line']).toEqual({
      one: 'Emi отметила {count} день этих месячных.',
      few: 'Emi отметила {count} дня этих месячных.',
      many: 'Emi отметила {count} дней этих месячных.',
    });
    expect([english, spanish, russian].map((each) => each['home.keepFilledIn.keep'])).toEqual([
      'Keep them',
      'Conservarlos',
      'Оставить',
    ]);
    expect([english, spanish, russian].map((each) => each['home.keepFilledIn.change'])).toEqual([
      'Change them',
      'Cambiarlos',
      'Изменить',
    ]);
  });
});
