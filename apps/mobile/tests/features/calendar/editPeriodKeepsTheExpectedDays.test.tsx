import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { colour } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { readDayLog } from '../../../src/data/dayLogRepository';
import { calendarEditPeriodTestID } from '../../../src/features/calendar/CalendarScreen';
import { dateDiscTestID, dayTestID } from '../../../src/features/calendar/CycleMonth';
import {
  editPeriodChangeTestID,
  editPeriodRowTestID,
  editPeriodSaveTestID,
  editPeriodTagTestID,
} from '../../../src/features/calendar/EditPeriodScreen';
import { whatSheChanged } from '../../../src/features/calendar/savePeriod';
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
 * Issue 379, step 4: Edit my period opens with the days Emi filled in ticked, and Save keeps them.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date(2026, 9, 8, 12, 0);
const herCycleRuns = 28;
const herPeriodRuns = 5;
const theFirstDay = '2026-10-01';
const theFilledDays = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];

async function sheOpensTheEditorFrom(day: string, periodLengthDays?: number): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, [aBleedingDay(theFirstDay)], herCycleRuns, periodLengthDays);
  await renderRouter(appDirectory, { initialUrl: '/calendar' });
  await shePresses(dayTestID(day));
  await shePresses(calendarEditPeriodTestID);
  await screen.findByTestId(editPeriodSaveTestID);
}

async function shePresses(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(await screen.findByTestId(testID));
  });
}

function isTicked(day: string): boolean {
  return screen.getByTestId(editPeriodRowTestID(day)).props.accessibilityState?.checked === true;
}

function saveIsReady(): boolean {
  return screen.getByTestId(editPeriodSaveTestID).props.accessibilityState?.disabled !== true;
}

function theFlowOn(day: string): DayRecord['flow'] | 'no record' {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? 'no record' : herVault().open(held.payload).flow;
}

describe('Edit my period on a period Emi filled in', () => {
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

  it('opens from a day Emi filled in with those days ticked and labelled, and Save ready', async () => {
    await sheOpensTheEditorFrom('2026-10-03', herPeriodRuns);

    expect(isTicked(theFirstDay)).toBe(true);
    for (const day of theFilledDays) {
      expect(isTicked(day)).toBe(true);
      expect(screen.getByTestId(editPeriodTagTestID(day))).toHaveTextContent(
        english['calendar.editPeriod.filledIn'],
      );
    }
    expect(screen.queryByTestId(editPeriodTagTestID(theFirstDay))).toBeNull();
    expect(screen.getByTestId(editPeriodChangeTestID)).toHaveTextContent(
      english['calendar.editPeriod.keepFilledIn'],
    );
    expect(saveIsReady()).toBe(true);
  });

  it('writes the days Emi filled in as bleeding days when she saves, and the month fills them', async () => {
    await sheOpensTheEditorFrom(theFirstDay, herPeriodRuns);

    await shePresses(editPeriodSaveTestID);
    await screen.findByTestId(dayTestID(theFirstDay));

    for (const day of theFilledDays) {
      expect(theFlowOn(day)).toBe('medium');
      expect(StyleSheet.flatten(screen.getByTestId(dateDiscTestID(day)).props.style)).toMatchObject(
        { backgroundColor: colour.period },
      );
    }
  });

  it('writes no bleeding on a day Emi filled in that she unticks', async () => {
    await sheOpensTheEditorFrom(theFirstDay, herPeriodRuns);

    await shePresses(editPeriodRowTestID('2026-10-05'));

    expect(screen.getByTestId(editPeriodChangeTestID)).not.toHaveTextContent(
      english['calendar.editPeriod.keepFilledIn'],
    );
    await shePresses(editPeriodSaveTestID);
    await screen.findByTestId(dayTestID(theFirstDay));

    expect(theFlowOn('2026-10-04')).toBe('medium');
    expect(theFlowOn('2026-10-05')).toBe('none');
  });

  it('opens as on main where Emi filled in no day', async () => {
    await sheOpensTheEditorFrom(theFirstDay);

    expect(isTicked(theFirstDay)).toBe(true);
    expect(isTicked('2026-10-02')).toBe(false);
    expect(saveIsReady()).toBe(false);
  });
});

describe('what a save of a filled in period changes', () => {
  it('adds the days Emi filled in that stay ticked, and takes off the ones she unticked', () => {
    expect(
      whatSheChanged({
        expected: ['2026-10-02', '2026-10-03'],
        held: ['2026-10-01'],
        ticked: ['2026-10-01', '2026-10-02'],
      }),
    ).toEqual({ added: ['2026-10-02'], removed: ['2026-10-03'] });
  });
});

describe('the words of the editor for the days Emi filled in', () => {
  it('are written in English, Spanish and Russian', () => {
    expect(english['calendar.editPeriod.filledIn']).toBe('Filled in');
    expect(spanish['calendar.editPeriod.filledIn']).toBe('Completado');
    expect(russian['calendar.editPeriod.filledIn']).toBe('Заполнено');
    expect(english['calendar.editPeriod.keepFilledIn']).toBe(
      'Save to keep the days Emi filled in.',
    );
    expect(spanish['calendar.editPeriod.keepFilledIn']).toBe(
      'Guarda para conservar los días que Emi completó.',
    );
    expect(russian['calendar.editPeriod.keepFilledIn']).toBe(
      'Сохраните, чтобы оставить дни, которые отметила Emi.',
    );
  });
});
