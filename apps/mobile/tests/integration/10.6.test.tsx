import { join } from 'node:path';

import { render } from '@testing-library/react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { bytesFromBase64 } from '@emi/crypto';

import type { Database } from '../../src/data/database';
import { listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import { profileRow, readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import {
  SaveAndStart,
  saveButtonTestID,
  saveCoreTestID,
  saveRefusedTestID,
  saveScreenTestID,
} from '../../src/features/onboarding/SaveAndStart';
import { firstRunCopy } from '../../src/features/onboarding/copy';
import { catalogueOf, languages } from '../../src/language';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { expoKeychain } from '../../src/services/vault/keychain';
import { vaultKeyItem } from '../../src/services/vault/vaultKey';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { sheAnswersEveryQuestion as sheWalksTheFirstRun } from '../fixtures/theFirstRun';
import { sheTapsSaveAndStart } from '../fixtures/theSave';
import { theVaultOnHerPhone, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { OnAPhone } from '../fixtures/theSafeArea';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

/** The instant she taps Save and start, which is the instant everything she answered carries. */
const whenSheSaves = whenSheOpensIt;

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

interface OpenApp {
  readonly pathname: () => string;
  readonly close: () => Promise<void>;
}

async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  const view = await app;

  return { pathname: () => app.getPathname(), close: () => view.unmount() };
}

/** Every question of the first run, answered, which leaves her looking at Save and start. */
async function sheAnswersEveryQuestion(): Promise<void> {
  await sheWalksTheFirstRun({
    periodStartedOn: herPeriodStarted,
    cycleLengthDays: herCycleLengthDays,
  });
}

describe('she answers everything, leaves before she taps Save and start, and nothing is written', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('she answers every question and then leaves', () => {
    it('writes no day, no answers and no marker, because the tap is the only write', async () => {
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
      await sheTapsSaveAndStart();

      expect(readDayLog(herDatabase(), herPeriodStarted)?.revision).toBe(1);
    });
  });

  describe('she taps Save and start', () => {
    it('writes her day, her answers and the marker together, and leaves her on her home screen', async () => {
      const app = await sheOpensEmi();
      await sheAnswersEveryQuestion();

      await sheTapsSaveAndStart();

      const row = readDayLog(herDatabase(), herPeriodStarted);
      const vault = await theVaultOnHerPhone();
      expect(row && vault.open(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: whenSheSaves.toISOString(),
      });
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())).toEqual({
        kind: 'profile',
        cycleLengthDays: herCycleLengthDays,
        recordedAt: whenSheSaves.toISOString(),
      });
      // One instant on all three, because one transaction wrote them.
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(whenSheSaves.toISOString());
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId('home-screen')).toBeTruthy();
    });

    it('seals what it writes under the key the keychain holds at that moment', async () => {
      await sheOpensEmi();
      await sheAnswersEveryQuestion();
      // The launch made her a key, and this takes it away again, which is the phone the save is
      // written for: no key yet, and one made at the tap. A write sealed under the key this
      // component started with would be a row the keychain can no longer open.
      await expoKeychain().remove(vaultKeyItem);

      await sheTapsSaveAndStart();

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
    it('leaves nothing behind and says so, so the tap she gives again is her first', async () => {
      const app = await sheOpensEmi();
      await sheAnswersEveryQuestion();
      // The day is written before the answers are, so a profile table that is not there stops the
      // transaction after the day has gone in. Nothing may survive that.
      herDatabase().execute('DROP TABLE profile');

      await sheTapsSaveAndStart();

      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
      expect(app.pathname()).toBe('/onboarding/hold');
      expect(screen.getByTestId(saveRefusedTestID)).toHaveTextContent(firstRunCopy.start.refused);
    });
  });

  describe('the button she taps', () => {
    /** The screen on its own, so the tap is measured without the write under it. */
    async function theLastScreen(onSave: () => Promise<void>) {
      return render(
        <OnAPhone>
          <SaveAndStart onSave={onSave} />
        </OnAPhone>,
      );
    }

    async function sheTaps(): Promise<void> {
      await act(async () => {
        fireEvent.press(screen.getByTestId(saveButtonTestID));
      });
    }

    async function theWriteAnswers(): Promise<void> {
      await act(async () => {
        await Promise.resolve();
      });
    }

    it('saves once on one tap, with no time held', async () => {
      let saved = 0;
      await theLastScreen(() => {
        saved += 1;

        return Promise.resolve();
      });

      await sheTaps();
      await theWriteAnswers();

      expect(saved).toBe(1);
    });

    it('saves once when she taps twice before the first save is done', async () => {
      let saved = 0;
      let finish: () => void = () => undefined;
      await theLastScreen(() => {
        saved += 1;

        return new Promise<void>((resolve) => {
          finish = resolve;
        });
      });

      // Both taps land before the screen draws again, the way two quick taps do on a phone.
      await act(async () => {
        fireEvent.press(screen.getByTestId(saveButtonTestID));
        fireEvent.press(screen.getByTestId(saveButtonTestID));
      });
      await sheTaps();
      finish();
      await theWriteAnswers();

      expect(saved).toBe(1);
    });

    it('can be tapped again after a save that refused, and the second tap saves', async () => {
      const answers = [Promise.reject(new Error('the write refused')), Promise.resolve()];
      answers[0]?.catch(() => undefined);
      let saved = 0;
      await theLastScreen(() => {
        const answer = answers[saved] ?? Promise.resolve();
        saved += 1;

        return answer;
      });

      await sheTaps();
      await theWriteAnswers();

      expect(screen.getByTestId(saveRefusedTestID)).toHaveTextContent(firstRunCopy.start.refused);
      expect(screen.getByTestId(saveButtonTestID)).toBeEnabled();

      await sheTaps();
      await theWriteAnswers();

      expect(saved).toBe(2);
      expect(screen.queryByTestId(saveRefusedTestID)).toBeNull();
    });

    it('offers one control, the button, and the ring above it takes no press', async () => {
      let saved = 0;
      await theLastScreen(() => {
        saved += 1;

        return Promise.resolve();
      });

      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.getByRole('button')).toHaveTextContent(firstRunCopy.start.action);
      expect(screen.getByTestId(saveCoreTestID).props.onResponderGrant).toBeUndefined();
      expect(screen.getByTestId(saveCoreTestID).props.accessibilityRole).toBeUndefined();

      await act(async () => {
        fireEvent.press(screen.getByTestId(saveCoreTestID));
      });

      expect(saved).toBe(0);
    });
  });

  describe('the hold that is gone', () => {
    it('needs no hold: a press that comes and goes at once is enough to save', async () => {
      let saved = 0;
      await render(
        <OnAPhone>
          <SaveAndStart
            onSave={() => {
              saved += 1;

              return Promise.resolve();
            }}
          />
        </OnAPhone>,
      );

      await act(async () => {
        fireEvent(screen.getByTestId(saveButtonTestID), 'pressIn');
        fireEvent(screen.getByTestId(saveButtonTestID), 'pressOut');
        fireEvent.press(screen.getByTestId(saveButtonTestID));
      });

      expect(saved).toBe(1);
    });

    it('never asks her to press and hold, in any of the three languages', async () => {
      await render(
        <OnAPhone>
          <SaveAndStart onSave={() => Promise.resolve()} />
        </OnAPhone>,
      );

      expect(screen.getByTestId(saveScreenTestID)).not.toHaveTextContent(/hold/i);
      for (const language of languages) {
        const keys = Object.keys(catalogueOf(language));
        expect({
          language,
          hold: keys.filter((key) => key.startsWith('onboarding.hold.')),
        }).toEqual({ language, hold: [] });
      }
    });
  });
});
