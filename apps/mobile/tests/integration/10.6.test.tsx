import { join } from 'node:path';

import { render } from '@testing-library/react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { bytesFromBase64 } from '@emi/crypto';

import type { Database } from '../../src/data/database';
import { listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import { profileRow, readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import {
  HOLD_MILLISECONDS,
  HOLD_TICK_MILLISECONDS,
  HoldToBegin,
  holdCoreTestID,
  holdProgressTestID,
  holdRefusedTestID,
} from '../../src/features/onboarding/HoldToBegin';
import { longerTestID } from '../../src/features/onboarding/CycleLength';
import { dayTestID } from '../../src/features/onboarding/LastPeriod';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy } from '../../src/features/onboarding/copy';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { expoKeychain } from '../../src/services/vault/keychain';
import { vaultKeyItem } from '../../src/services/vault/vaultKey';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { sheHoldsTheRing } from '../fixtures/theHold';
import { theVaultOnHerPhone, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { OnAPhone } from '../fixtures/theSafeArea';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

/** The instant the hold ends, which is the instant everything she answered carries. */
const whenSheFinishesTheHold = new Date(whenSheOpensIt.getTime() + HOLD_MILLISECONDS);

/** Not the number the screen offers, so a length that reads back as 30 is a length she gave. */
const herCycleLengthDays = defaultCycleLengthDays + 2;

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

function reduceMotion(asked: boolean): void {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(asked);
}

interface OpenApp {
  readonly pathname: () => string;
  readonly close: () => Promise<void>;
}

async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  const view = await app;

  return { pathname: () => app.getPathname(), close: () => view.unmount() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Every question of the first run, answered, which leaves her looking at the hold. */
async function sheAnswersEveryQuestion(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  for (let pressed = defaultCycleLengthDays; pressed < herCycleLengthDays; pressed += 1) {
    await shePresses(longerTestID);
  }
  await shePresses(onboardingActionTestID);
}

describe('she answers everything, leaves before the hold, and nothing is written', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
    reduceMotion(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('she answers every question and then leaves', () => {
    it('writes no day, no answers and no marker, because the hold is the only write', async () => {
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestion();

      expect(app.pathname()).toBe('/onboarding/hold');
      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(profileRow(herDatabase())).toBeUndefined();
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
    });

    it('asks her the same questions again the next time she opens Emi', async () => {
      const first = await sheOpensEmi();
      await sheAnswersEveryQuestion();
      await first.close();

      const again = await sheOpensEmi();

      expect(again.pathname()).toBe('/onboarding/welcome');
      expect(listDayLogs(herDatabase())).toEqual([]);
    });

    it('keeps nothing of the day she picked, so she picks it again rather than being refused', async () => {
      const first = await sheOpensEmi();
      await sheAnswersEveryQuestion();
      await first.close();

      await sheOpensEmi();
      await sheAnswersEveryQuestion();
      await sheHoldsTheRing();

      expect(readDayLog(herDatabase(), herPeriodStarted)?.revision).toBe(1);
    });
  });

  describe('she presses and holds the ring', () => {
    it('writes her day, her answers and the marker together, and leaves her on her home screen', async () => {
      const app = await sheOpensEmi();
      await sheAnswersEveryQuestion();

      await sheHoldsTheRing();

      const row = readDayLog(herDatabase(), herPeriodStarted);
      const vault = await theVaultOnHerPhone();
      expect(row && vault.open(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: whenSheFinishesTheHold.toISOString(),
      });
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())).toEqual({
        kind: 'profile',
        cycleLengthDays: herCycleLengthDays,
        recordedAt: whenSheFinishesTheHold.toISOString(),
      });
      // One instant on all three, because one transaction wrote them.
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(
        whenSheFinishesTheHold.toISOString(),
      );
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId('home-screen')).toBeTruthy();
    });

    it('seals what it writes under the key the keychain holds at that moment', async () => {
      await sheOpensEmi();
      await sheAnswersEveryQuestion();
      // The launch made her a key, and this takes it away again, which is the phone the hold is
      // written for: no key yet, and one made at the hold. A write sealed under the key this
      // component started with would be a row the keychain can no longer open.
      await expoKeychain().remove(vaultKeyItem);

      await sheHoldsTheRing();

      const held = await expoKeychain().read(vaultKeyItem);
      expect(held).not.toBeNull();
      expect(bytesFromBase64(String(held))).toHaveLength(32);
      const row = readDayLog(herDatabase(), herPeriodStarted);
      const vault = await theVaultOnHerPhone();
      expect(row && vault.open(row.payload).day).toBe(herPeriodStarted);
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        herCycleLengthDays,
      );
    });
  });

  describe('a write that fails half way', () => {
    it('leaves nothing behind and says so, so the hold she gives again is her first', async () => {
      const app = await sheOpensEmi();
      await sheAnswersEveryQuestion();
      // The day is written before the answers are, so a profile table that is not there stops the
      // transaction after the day has gone in. Nothing may survive that.
      herDatabase().execute('DROP TABLE profile');

      await sheHoldsTheRing();

      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
      expect(app.pathname()).toBe('/onboarding/hold');
      expect(screen.getByTestId(holdRefusedTestID)).toHaveTextContent(firstRunCopy.hold.refused);
    });
  });

  describe('the ring she holds', () => {
    /** The screen on its own, so the hold is measured without the write under it. */
    async function theRing(onHeld: () => Promise<void> = () => Promise.resolve()) {
      const view = await render(
        <OnAPhone>
          <HoldToBegin onHeld={onHeld} />
        </OnAPhone>,
      );
      // The reduced motion answer arrives from the phone as a promise, so it is in hand before
      // her thumb goes down rather than after it.
      await act(async () => {
        await Promise.resolve();
      });

      return view;
    }

    async function herThumbGoesDown(): Promise<void> {
      await act(async () => {
        fireEvent(screen.getByTestId(holdCoreTestID), 'pressIn');
      });
    }

    async function herThumbComesUp(): Promise<void> {
      await act(async () => {
        fireEvent(screen.getByTestId(holdCoreTestID), 'pressOut');
      });
    }

    it('fills as she holds, and says she is holding', async () => {
      await theRing();
      await herThumbGoesDown();

      expect(screen.getByTestId(holdCoreTestID)).toHaveTextContent(firstRunCopy.hold.held);
      await act(async () => {
        jest.advanceTimersByTime(HOLD_MILLISECONDS / 2);
      });
      const half = String(screen.getByTestId(holdProgressTestID).props.d);

      await act(async () => {
        jest.advanceTimersByTime(HOLD_TICK_MILLISECONDS * 4);
      });

      expect(half).not.toBe('');
      expect(String(screen.getByTestId(holdProgressTestID).props.d)).not.toBe(half);
    });

    it('does not move at all when her phone asks for less motion, and still writes', async () => {
      reduceMotion(true);
      let held = 0;
      await theRing(() => {
        held += 1;

        return Promise.resolve();
      });

      await herThumbGoesDown();
      await act(async () => {
        jest.advanceTimersByTime(HOLD_MILLISECONDS / 2);
      });

      expect(screen.queryByTestId(holdProgressTestID)).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(HOLD_MILLISECONDS / 2);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.queryByTestId(holdProgressTestID)).toBeNull();
      expect(held).toBe(1);
    });

    it('writes nothing when she lets go early, and gives the ring back', async () => {
      let held = 0;
      await theRing(() => {
        held += 1;

        return Promise.resolve();
      });

      await herThumbGoesDown();
      await act(async () => {
        jest.advanceTimersByTime(HOLD_MILLISECONDS - HOLD_TICK_MILLISECONDS);
      });
      await herThumbComesUp();
      await act(async () => {
        jest.advanceTimersByTime(HOLD_MILLISECONDS * 2);
      });

      expect(held).toBe(0);
      expect(screen.queryByTestId(holdProgressTestID)).toBeNull();
      expect(screen.getByTestId(holdCoreTestID)).toHaveTextContent(firstRunCopy.hold.action);
    });

    it('writes once when her thumb comes back down on a hold it already gave', async () => {
      let held = 0;
      await theRing(() => {
        held += 1;

        return Promise.resolve();
      });

      await herThumbGoesDown();
      await act(async () => {
        jest.advanceTimersByTime(HOLD_MILLISECONDS);
      });
      await herThumbComesUp();
      await herThumbGoesDown();
      await act(async () => {
        jest.advanceTimersByTime(HOLD_MILLISECONDS);
      });

      expect(held).toBe(1);
    });
  });
});
