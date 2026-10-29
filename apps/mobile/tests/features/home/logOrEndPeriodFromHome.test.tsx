import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../../src/data/cycleRepository';
import { readDayLog } from '../../../src/data/dayLogRepository';
import { homePeriodActionTestID, homeScreenTestID } from '../../../src/features/home/HomeScreen';
import {
  periodChipTestID,
  periodDateTestID,
  periodPageTestID,
} from '../../../src/features/period/PeriodPage';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import {
  aBleedingDay,
  dayOf,
  herDatabase,
  herPhoneHoldsTheseAnswers,
} from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';
import { textIn } from '../../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const yesterday = addDays(today, -1);
const theCycle = 28;

const aPeriodLongAgo: DayRecord[] = [
  aBleedingDay(addDays(today, -19 - theCycle)),
  aBleedingDay(addDays(today, -19)),
];

async function sheOpensHome(records: readonly DayRecord[]): Promise<{ pathname: () => string }> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: theCycle,
      periodLengthDays: 5,
      recordedAt: whenSheOpensIt.toISOString(),
    },
    records,
  );
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  await app;
  await screen.findByTestId(homeScreenTestID);

  return { pathname: () => app.getPathname() };
}

function theActionSays(): string {
  return textIn(screen.getByTestId(homePeriodActionTestID)).join('');
}

function isChosen(testID: string): boolean {
  return screen.getByTestId(testID).props.accessibilityState?.selected === true;
}

function theDayOnHerPhone(day: string): DayRecord | undefined {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? undefined : herVault().open(held.payload);
}

function herLastCycle(): { startedOn: string; periodLengthDays: number | null } | undefined {
  return listCycles(herDatabase())
    .filter((cycle) => !cycle.isPredicted)
    .at(-1);
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

describe('Log period on Home, outside her period', () => {
  it('should say Log period and open the Period page of today with Today chosen, in one press', async () => {
    const app = await sheOpensHome(aPeriodLongAgo);

    expect(theActionSays()).toBe('Log period');

    await fireEvent.press(screen.getByTestId(homePeriodActionTestID));

    expect(await screen.findByTestId(periodPageTestID)).toBeTruthy();
    expect(app.pathname()).toBe('/period');
    expect(isChosen(periodDateTestID('today'))).toBe(true);
  });

  it('should say Log period on a phone that holds no period yet', async () => {
    await sheOpensHome([]);

    expect(theActionSays()).toBe('Log period');
  });
});

describe('End period on Home, during her period', () => {
  it('should say End period, and record no bleeding on today in one press', async () => {
    const app = await sheOpensHome([...aPeriodLongAgo, aBleedingDay(yesterday)]);

    expect(theActionSays()).toBe('End period');
    expect(herLastCycle()).toMatchObject({ startedOn: yesterday, periodLengthDays: null });

    await fireEvent.press(screen.getByTestId(homePeriodActionTestID));

    expect(theDayOnHerPhone(today)?.flow).toBe('none');
    expect(herLastCycle()).toMatchObject({ startedOn: yesterday, periodLengthDays: 1 });
    expect(app.pathname()).toBe('/');
    expect(theActionSays()).toBe('Log period');
  });

  it('should keep what else she logged today when it ends the period', async () => {
    await sheOpensHome([
      ...aPeriodLongAgo,
      aBleedingDay(yesterday),
      { day: today, symptoms: ['headache'], recordedAt: `${today}T08:00:00.000Z` },
    ]);

    await fireEvent.press(screen.getByTestId(homePeriodActionTestID));

    expect(theDayOnHerPhone(today)).toMatchObject({ flow: 'none', symptoms: ['headache'] });
  });

  it('should open the Period page of today, and write nothing, where today already holds bleeding', async () => {
    const app = await sheOpensHome([
      ...aPeriodLongAgo,
      aBleedingDay(yesterday),
      aBleedingDay(today),
    ]);

    expect(theActionSays()).toBe('End period');

    await fireEvent.press(screen.getByTestId(homePeriodActionTestID));

    expect(await screen.findByTestId(periodPageTestID)).toBeTruthy();
    expect(app.pathname()).toBe('/period');
    expect(isChosen(periodChipTestID('flow', 'medium'))).toBe(true);
    expect(theDayOnHerPhone(today)?.flow).toBe('medium');
  });
});
