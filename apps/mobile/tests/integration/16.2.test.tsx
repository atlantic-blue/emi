import { join } from 'node:path';

import { renderRouter } from 'expo-router/testing-library';

import { dayParameter, theMonthAskedFor } from '../../src/features/calendar/askedMonth';
import { addMonths, monthLabel, startOfMonth } from '../../src/features/onboarding/days';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  herPhoneHoldsThreeRecordedCycles,
  theDaySheOpensTheMonth,
  theMonthSheReads,
} from '../fixtures/theMonthSheOpens';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the day the drawing of the month rings, so the month reads the same in any zone. */
const whenSheOpensIt = (): Date => new Date(`${theDaySheOpensTheMonth()}T12:00:00.000Z`);

/** The month today falls in, which is the month she lands on when the address names no day. */
const theMonthSheIsIn = (): string => startOfMonth(theDaySheOpensTheMonth());

/** A day of the month before, which is the day of her week no single week can also be in. */
const aDayOfTheMonthBefore = (): string => `${addMonths(theMonthSheIsIn(), -1).slice(0, 7)}-20`;

async function sheOpens(at: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: at });
}

describe('she reaches a month from the screen she opens by pressing her week', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt());
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHoldsThreeRecordedCycles(whenSheOpensIt());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the month a day of her week opens', () => {
    it('opens the month that day falls in, when the day is in the month before', async () => {
      await sheOpens(`/calendar?${dayParameter}=${aDayOfTheMonthBefore()}`);

      expect(theMonthSheReads()).toBe(monthLabel(addMonths(theMonthSheIsIn(), -1)));
      expect(theMonthSheReads()).not.toBe(monthLabel(theMonthSheIsIn()));
    });

    it('opens the month that day falls in, when the day is in the month after', async () => {
      await sheOpens(`/calendar?${dayParameter}=${addMonths(theMonthSheIsIn(), 1).slice(0, 7)}-03`);

      expect(theMonthSheReads()).toBe(monthLabel(addMonths(theMonthSheIsIn(), 1)));
    });

    it('opens the month today falls in when the address names no day', async () => {
      await sheOpens('/calendar');

      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheIsIn()));
    });

    it('opens the month today falls in when the address names something that is not a day', async () => {
      await sheOpens(`/calendar?${dayParameter}=2026-02-30`);

      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheIsIn()));
    });
  });

  describe('the month the address asks for', () => {
    it('is the first of the month the day falls in', () => {
      expect(theMonthAskedFor('2026-08-20')).toBe('2026-08-01');
      expect(theMonthAskedFor('2026-01-01')).toBe('2026-01-01');
      expect(theMonthAskedFor('2026-12-31')).toBe('2026-12-01');
    });

    it('is nothing at all where the address names no day', () => {
      expect(theMonthAskedFor(undefined)).toBeUndefined();
      expect(theMonthAskedFor('')).toBeUndefined();
    });

    it('is nothing at all where what the address names is not a day', () => {
      expect(theMonthAskedFor('2026-02-30')).toBeUndefined();
      expect(theMonthAskedFor('the twentieth')).toBeUndefined();
      expect(theMonthAskedFor('2026-8-20')).toBeUndefined();
    });
  });
});
