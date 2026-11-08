import { join } from 'node:path';

import { screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { readDayLog } from '../../../src/data/dayLogRepository';
import { dateDiscTestID, dayTestID } from '../../../src/features/calendar/CycleMonth';
import {
  daySheetLineTestID,
  daySheetOpenTestID,
  daySheetRemovePeriodDayTestID,
} from '../../../src/features/calendar/DaySheet';
import { english } from '../../../src/language/english';
import { russian } from '../../../src/language/russian';
import { spanish } from '../../../src/language/spanish';
import { colour } from '@emi/tokens';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, herDatabase, herPhoneHolds } from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';
import { textIn } from '../../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * Issue 379, step 3: the card under the month says when Emi filled a day in, and a day she lived
 * that Emi filled in carries Remove period day.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date(2026, 9, 8, 12, 0);
const herCycleRuns = 28;
const herPeriodRuns = 5;

async function sheOpensTheMonthWith(firstDay: string): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, [aBleedingDay(firstDay)], herCycleRuns, herPeriodRuns);
  await renderRouter(appDirectory, { initialUrl: '/calendar' });
  await screen.findByTestId(dayTestID(firstDay));
}

async function shePresses(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(await screen.findByTestId(testID));
  });
}

function theCardLine(): string {
  return textIn(screen.getByTestId(daySheetLineTestID)).join('');
}

function theFillOf(day: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(dateDiscTestID(day)).props.style).backgroundColor;
}

describe('the card of a day Emi filled in', () => {
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

  it('says that Emi filled in a day she lived, and offers Remove period day', async () => {
    await sheOpensTheMonthWith('2026-10-01');

    await shePresses(dayTestID('2026-10-03'));

    expect(theCardLine()).toMatch(/^Day 3, /);
    expect(theCardLine()).toContain(english['calendar.daySheet.filledIn']);
    expect(screen.getByTestId(daySheetRemovePeriodDayTestID)).toHaveTextContent(
      'Remove period day',
    );
  });

  it('ends her period the day before when she removes a day Emi filled in, and the later days go', async () => {
    await sheOpensTheMonthWith('2026-10-01');
    await shePresses(dayTestID('2026-10-03'));

    await shePresses(daySheetRemovePeriodDayTestID);

    const held = readDayLog(herDatabase(), '2026-10-03');
    expect(held === undefined ? undefined : herVault().open(held.payload).flow).toBe('none');
    expect(theFillOf('2026-10-02')).toBe(colour.accentSoft);
    expect(theFillOf('2026-10-03')).toBeUndefined();
    expect(theFillOf('2026-10-04')).toBeUndefined();
    expect(theFillOf('2026-10-05')).toBeUndefined();
    expect(screen.queryByTestId(daySheetRemovePeriodDayTestID)).toBeNull();
    expect(theCardLine()).not.toContain(english['calendar.daySheet.filledIn']);
  });

  it('says that Emi expects her period on a day ahead, with no Remove period day', async () => {
    await sheOpensTheMonthWith('2026-10-07');

    await shePresses(dayTestID('2026-10-10'));

    expect(theCardLine()).toBe(english['calendar.daySheet.expectedAhead']);
    expect(screen.queryByTestId(daySheetRemovePeriodDayTestID)).toBeNull();
    expect(screen.queryByTestId(daySheetOpenTestID)).toBeNull();
  });

  it('keeps the card of a day she logged herself as it was', async () => {
    await sheOpensTheMonthWith('2026-10-01');

    await shePresses(dayTestID('2026-10-01'));

    expect(theCardLine()).not.toContain(english['calendar.daySheet.filledIn']);
    expect(screen.getByTestId(daySheetRemovePeriodDayTestID)).toBeTruthy();
  });
});

describe('the words of the card', () => {
  it('are written in English, Spanish and Russian', () => {
    expect(english['calendar.daySheet.filledIn']).toBe(
      'Emi filled in this day from your usual period length.',
    );
    expect(spanish['calendar.daySheet.filledIn']).toBe(
      'Emi completó este día según la duración habitual de tu periodo.',
    );
    expect(russian['calendar.daySheet.filledIn']).toBe(
      'Emi отметила этот день по обычной длительности ваших месячных.',
    );
    expect(english['calendar.daySheet.expectedAhead']).toBe('Emi expects your period on this day.');
    expect(spanish['calendar.daySheet.expectedAhead']).toBe('Emi espera tu periodo este día.');
    expect(russian['calendar.daySheet.expectedAhead']).toBe('Emi ожидает месячные в этот день.');
  });
});
