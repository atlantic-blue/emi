import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import {
  editPeriodFilledTestID,
  editPeriodRowTestID,
  editPeriodSaveTestID,
} from '../../../src/features/calendar/EditPeriodScreen';
import { dayParameter } from '../../../src/features/calendar/askedMonth';
import { whatAPressHolds } from '../../../src/features/calendar/savePeriod';
import { recordedDays } from '../../../src/features/cycle/rebuild';
import { english } from '../../../src/language/english';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { herDatabase } from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';
import {
  herPhoneHoldsAPeriodOfFourDays,
  theChangeLineSheReads,
  theDaysEmiHolds,
  theDaysTheListDrew,
  theDaysTickedOnThePicker,
  theTagOn,
  whenSheOpensEmi,
} from '../../fixtures/thePeriodSheCorrects';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * She chooses the first and the last day of her period, and every day between is marked too. Each
 * day Emi marks takes the middle flow the editor writes for any day she adds, and the note under
 * the list says so.
 */

describe('what one press holds', () => {
  it('ticks the day alone when nothing is ticked yet', () => {
    expect(whatAPressHolds([], '2026-10-25')).toEqual({ filled: [], ticked: ['2026-10-25'] });
  });

  it('fills every day between the first day and a last day she presses after it', () => {
    expect(whatAPressHolds(['2026-10-25'], '2026-10-28')).toEqual({
      filled: ['2026-10-26', '2026-10-27'],
      ticked: ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'],
    });
  });

  it('fills every day between a first day she presses before the last day and that day', () => {
    expect(whatAPressHolds(['2026-10-27', '2026-10-28'], '2026-10-25')).toEqual({
      filled: ['2026-10-26'],
      ticked: ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'],
    });
  });

  it('fills nothing for the day next to the period', () => {
    expect(whatAPressHolds(['2026-10-25'], '2026-10-26')).toEqual({
      filled: [],
      ticked: ['2026-10-25', '2026-10-26'],
    });
  });

  it('ticks a day inside the period alone, so a day she took off stays off', () => {
    expect(whatAPressHolds(['2026-10-25', '2026-10-29'], '2026-10-27')).toEqual({
      filled: [],
      ticked: ['2026-10-25', '2026-10-27', '2026-10-29'],
    });
  });

  it('takes a ticked day off alone', () => {
    expect(whatAPressHolds(['2026-10-25', '2026-10-26', '2026-10-27'], '2026-10-26')).toEqual({
      filled: [],
      ticked: ['2026-10-25', '2026-10-27'],
    });
  });
});

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

async function sheOpensThePickerOn(day: string): Promise<void> {
  const app = renderRouter(appDirectory, {
    initialUrl: `/calendar/period?${dayParameter}=${day}`,
  });

  await app;
}

async function shePresses(day: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(editPeriodRowTestID(day)));
}

function theFlowHerPhoneHoldsOn(day: string): string | undefined {
  return recordedDays(herDatabase(), herVault().open).find((record) => record.day === day)?.flow;
}

/** A day well after the period Emi holds, so the list opens on it with nothing ticked. */
function aDayOutsideHerPeriod(): string {
  return addDays(String(theDaysEmiHolds()[0]), 8);
}

describe('she chooses the first and the last day of a period in Edit my period', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensEmi());
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHoldsAPeriodOfFourDays(whenSheOpensEmi());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks every day between once she presses the last day', async () => {
    await sheOpensThePickerOn(aDayOutsideHerPeriod());
    const [first, between, last] = theDaysTheListDrew();

    await shePresses(String(first));

    expect(theDaysTickedOnThePicker()).toEqual([first]);

    await shePresses(String(last));

    expect(theDaysTickedOnThePicker()).toEqual([first, between, last]);
    expect(theTagOn(String(between))).toBe(english['calendar.editPeriod.addedDay']);
  });

  it('says under the list that Emi marked the days between with a medium flow', async () => {
    await sheOpensThePickerOn(aDayOutsideHerPeriod());
    const [first, , last] = theDaysTheListDrew();

    await shePresses(String(first));

    expect(screen.queryByTestId(editPeriodFilledTestID)).toBeNull();

    await shePresses(String(last));

    expect(screen.getByTestId(editPeriodFilledTestID)).toHaveTextContent(
      english['calendar.editPeriod.filled'],
    );
    expect(theChangeLineSheReads()).toContain('You added');
  });

  it('lets her take one day between off again, and the note goes with the last of them', async () => {
    await sheOpensThePickerOn(aDayOutsideHerPeriod());
    const [first, between, last] = theDaysTheListDrew();

    await shePresses(String(first));
    await shePresses(String(last));
    await shePresses(String(between));

    expect(theDaysTickedOnThePicker()).toEqual([first, last]);
    expect(screen.queryByTestId(editPeriodFilledTestID)).toBeNull();
  });

  it('saves each day between with the middle flow the editor writes for a day she adds', async () => {
    await sheOpensThePickerOn(aDayOutsideHerPeriod());
    const [first, between, last] = theDaysTheListDrew();

    await shePresses(String(first));
    await shePresses(String(last));
    await fireEvent.press(screen.getByTestId(editPeriodSaveTestID));

    for (const day of [first, between, last]) {
      expect(theFlowHerPhoneHoldsOn(String(day))).toBe('medium');
    }
  });

  it('marks the days between the period she has and a later last day she presses', async () => {
    await sheOpensThePickerOn(String(theDaysEmiHolds()[0]));
    const listed = theDaysTheListDrew();
    const lastListed = String(listed.at(-1));

    await shePresses(lastListed);

    expect(theDaysTickedOnThePicker()).toEqual(listed);
    expect(screen.getByTestId(editPeriodFilledTestID)).toBeTruthy();
  });
});
