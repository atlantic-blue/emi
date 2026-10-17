import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { readDayLog } from '../../../src/data/dayLogRepository';
import { hygienePageTestID } from '../../../src/features/hygiene/HygieneProductsPage';
import {
  periodSexProductTestID,
  periodSexSuggestionEyebrowTestID,
  periodSexSuggestionNotNowTestID,
  periodSexSuggestionSeeAllTestID,
  periodSexSuggestionTestID,
} from '../../../src/features/hygiene/PeriodSexSuggestion';
import {
  productPageNameTestID,
  productPageTestID,
} from '../../../src/features/hygiene/ProductPage';
import { sexChipTestID, sexPageSaveTestID, sexPageTestID } from '../../../src/features/sex/SexPage';
import { sexAddress } from '../../../src/features/sex/sexAddress';
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

/**
 * Issue 306, from the sexPeriodSuggestion board: after she saves sex on a day of her period, a
 * sheet over the Sex page names the menstrual disc and the sponge. She can close it, and it shows
 * only on the save that first records sex on that day.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
/** Her period ran for three days, a week ago. */
const periodStart = addDays(today, -7);
const secondPeriodDay = addDays(periodStart, 1);
const herDays: readonly DayRecord[] = [0, 1, 2].map((offset) =>
  aBleedingDay(addDays(periodStart, offset)),
);

async function sheOpensTheSexPageOf(
  day: string,
  records = herDays,
): Promise<{ pathname: () => string }> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: 28,
      periodLengthDays: 5,
      name: 'Maria',
      recordedAt: whenSheOpensIt.toISOString(),
    },
    records,
  );
  const app = renderRouter(appDirectory, { initialUrl: sexAddress(day) });
  await app;
  await screen.findByTestId(sexPageTestID);

  return { pathname: () => app.getPathname() };
}

async function press(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheSavesSex(): Promise<void> {
  await press(sexChipTestID('sex', 'unprotected'));
  await press(sexPageSaveTestID);
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

describe('the suggestion after sex on a period day', () => {
  it('should name the day of her period, the disc and the sponge, in the words of the board', async () => {
    await sheOpensTheSexPageOf(secondPeriodDay);
    await sheSavesSex();

    await screen.findByTestId(periodSexSuggestionTestID);
    expect(textIn(screen.getByTestId(periodSexSuggestionEyebrowTestID))).toEqual(['Period, day 2']);
    expect(screen.getByText('Products for sex on period days')).toBeTruthy();
    expect(
      screen.getByText(
        'Some people use a menstrual disc or a sponge when they have sex during their period. Read about each one to see if it suits you.',
      ),
    ).toBeTruthy();
    expect(textIn(screen.getByTestId(periodSexProductTestID('menstrual-disc')))).toEqual([
      'Menstrual disc',
    ]);
    expect(textIn(screen.getByTestId(periodSexProductTestID('sponge')))).toEqual(['Sponge']);
  });

  it('should have saved the day before the sheet opens', async () => {
    await sheOpensTheSexPageOf(secondPeriodDay);
    await sheSavesSex();
    await screen.findByTestId(periodSexSuggestionTestID);

    const held = readDayLog(herDatabase(), secondPeriodDay);
    expect(held === undefined ? undefined : herVault().open(held.payload).sex).toBe('unprotected');
  });

  it('should close with Not now and leave the Sex page', async () => {
    await sheOpensTheSexPageOf(secondPeriodDay);
    await sheSavesSex();
    await screen.findByTestId(periodSexSuggestionTestID);
    await press(periodSexSuggestionNotNowTestID);

    expect(screen.queryByTestId(periodSexSuggestionTestID)).toBeNull();
    expect(screen.queryByTestId(sexPageTestID)).toBeNull();
  });

  it('should open the page of the disc', async () => {
    await sheOpensTheSexPageOf(secondPeriodDay);
    await sheSavesSex();
    await screen.findByTestId(periodSexSuggestionTestID);
    await press(periodSexProductTestID('menstrual-disc'));

    await screen.findByTestId(productPageTestID);
    expect(textIn(screen.getByTestId(productPageNameTestID))).toEqual(['Menstrual disc']);
  });

  it('should open all products', async () => {
    await sheOpensTheSexPageOf(secondPeriodDay);
    await sheSavesSex();
    await screen.findByTestId(periodSexSuggestionTestID);
    await press(periodSexSuggestionSeeAllTestID);

    expect(await screen.findByTestId(hygienePageTestID)).toBeTruthy();
  });

  it('should not show again on a later save of the same day', async () => {
    const withSex = herDays.map((record) =>
      record.day === secondPeriodDay ? { ...record, sex: 'unprotected' as const } : record,
    );
    await sheOpensTheSexPageOf(secondPeriodDay, withSex);
    await press(sexChipTestID('orgasm', 'yes'));
    await press(sexPageSaveTestID);

    expect(screen.queryByTestId(periodSexSuggestionTestID)).toBeNull();
    expect(screen.queryByTestId(sexPageTestID)).toBeNull();
  });

  it('should not show on a day that is not a period day', async () => {
    await sheOpensTheSexPageOf(today);
    await sheSavesSex();

    expect(screen.queryByTestId(periodSexSuggestionTestID)).toBeNull();
    expect(screen.queryByTestId(sexPageTestID)).toBeNull();
  });

  it('should not show after "No sex" on a period day', async () => {
    await sheOpensTheSexPageOf(secondPeriodDay);
    await press(sexChipTestID('sex', 'none'));
    await press(sexPageSaveTestID);

    expect(screen.queryByTestId(periodSexSuggestionTestID)).toBeNull();
  });
});
