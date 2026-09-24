import { join } from 'node:path';

import { findSymptom } from '@emi/cycle';
import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import type { DayVault } from '../../src/services/vault/dayVault';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { words } from '../../src/language';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { Today, todayIcons, todayTestID } from '../../src/features/onboarding/Today';
import { firstRunCopy, todayLabels } from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  type TodaySymptom,
  FirstRunError,
  completeFirstRun,
  firstRunFlow,
  todaySymptoms,
} from '../../src/features/onboarding/firstRun';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSqlite } from '../data/expoSqlite';
import { OnAPhone } from '../fixtures/theSafeArea';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase } from '../fixtures/herPhone';
import { herProfileVault, herVault, theVaultOnHerPhone } from '../fixtures/herVault';
import { sizedTextIn } from '../fixtures/renderedText';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

const herCycleLengthDays = 28;

/** A day inside the ninety the first run reaches back over, and not today. */
const herPeriodStarted = '2026-05-09';

async function sheOpensEmi(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

/** Past every question before this one, standing on the one the screen cases are about. */
async function sheReachesToday(periodStartedOn: string = herPeriodStarted): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(periodStartedOn));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/** Every day she sealed, opened again with the key her own phone drew at the hold. */
async function herSealedDays() {
  const vault = await theVaultOnHerPhone();

  return listDayLogs(herDatabase()).map((row) => vault.open(row.payload));
}

/** The one day she sealed for a given date, and nothing at all where she sealed none. */
async function herSealedDay(day: string) {
  return (await herSealedDays()).find((record) => record.day === day);
}

/**
 * A vault that seals her first day and then refuses. Nothing in the product behaves this way: it
 * is here to stop the write on today's row, which is the only way to read whether the day she
 * bled and the day she felt travel together.
 */
function aVaultThatFailsOnTheSecondDay(): DayVault {
  const sealed = herVault();
  let count = 0;

  return {
    open: sealed.open,
    seal: (record) => {
      count += 1;

      if (count > 1) {
        throw new Error('this vault seals one day and refuses the next');
      }

      return sealed.seal(record);
    },
  };
}

/** The refusal a call gives, so a case names the rule rather than the wording of a message. */
function refusalFrom(run: () => void): FirstRunRefusal {
  try {
    run();
  } catch (error) {
    if (error instanceof FirstRunError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the first run accepted an answer it is written to refuse');
}

describe('what she feels today is her first logged day', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the question she is asked after the focus', () => {
    it('is where the focus hands her, whether she answered it or passed it by', async () => {
      const app = await sheOpensEmi();

      await sheReachesToday();

      expect(app.pathname()).toBe('/onboarding/today');
    });

    it('offers the six tiles, with none of them pressed for her', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      for (const slug of todaySymptoms) {
        expect(screen.getByTestId(todayTestID(slug))).toHaveTextContent(todayLabels[slug]);
        expect(screen.getByTestId(todayTestID(slug))).not.toBeSelected();
      }
      expect(todaySymptoms).toHaveLength(6);
    });

    it('offers only tiles the catalogue already holds a symptom for', () => {
      for (const slug of todaySymptoms) {
        expect(findSymptom(slug)?.slug).toBe(slug);
      }
    });

    it('draws cramps, tired, calm and low with the drawings the set already has', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(todayIcons.cramps).toBe('pain');
      expect(todayIcons.headache).toBe('headache');
      expect(todayIcons.bloating).toBe('bloating');
      expect(todayIcons.fatigue).toBe('sleep');
      expect(todayIcons.calm).toBe('mood');
      expect(todayIcons['low-mood']).toBe('mood');
    });

    it('calls the way past it Nothing to add, and the way on Save today', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(screen.getByTestId(onboardingSkipTestID)).toHaveTextContent(
        words('onboarding.today.skip'),
      );
      expect(screen.getByTestId(onboardingActionTestID)).toHaveTextContent(
        words('onboarding.today.action'),
      );
    });

    it('says she can skip it, and that Emi encrypts it on this phone', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(screen.getByText(firstRunCopy.today.title)).toBeTruthy();
      // The two lines are named on their own rather than read off the copy, so a line taken out
      // of the screen fails here instead of leaving a shorter list that agrees with itself.
      expect(screen.getByText(words('onboarding.today.line.skip'))).toBeTruthy();
      expect(screen.getByText(words('onboarding.today.line.encrypted'))).toBeTruthy();
      expect(firstRunCopy.today.lines).toHaveLength(2);
    });

    it('waits for a tile before the way on is hers to press', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();

      await shePresses(todayTestID('cramps'));

      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    it('keeps every tile she presses, because a day is more than one feeling', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));
      await shePresses(todayTestID('fatigue'));

      expect(screen.getByTestId(todayTestID('cramps'))).toBeSelected();
      expect(screen.getByTestId(todayTestID('fatigue'))).toBeSelected();
      expect(screen.getByTestId(todayTestID('calm'))).not.toBeSelected();
    });

    it('takes a tile off again when she presses it a second time', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));
      await shePresses(todayTestID('cramps'));

      expect(screen.getByTestId(todayTestID('cramps'))).not.toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    it('hands her to the hold, whether she saves the day or passes it by', async () => {
      const app = await sheOpensEmi();

      await sheReachesToday();
      await shePresses(onboardingSkipTestID);

      expect(app.pathname()).toBe('/onboarding/hold');
    });

    it('has written nothing at all while she stands on it', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));

      expect(listDayLogs(herDatabase())).toEqual([]);
    });
  });

  describe('her answer, at the hold', () => {
    it('seals today as a day of its own, carrying both the tiles she pressed', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        symptoms: ['cramps', 'fatigue'],
      });
      await sheHoldsTheRing();

      const sealed = await herSealedDay(today);

      expect(sealed?.symptoms).toEqual(['cramps', 'fatigue']);
      expect(sealed?.flow).toBeUndefined();
      expect((await herSealedDays()).map((record) => record.day).sort()).toEqual([
        herPeriodStarted,
        today,
      ]);
    });

    for (const slug of todaySymptoms) {
      it(`seals ${slug} in today's day, under the key her own phone drew`, async () => {
        await sheOpensEmi();

        await sheAnswersEveryQuestion({
          periodStartedOn: herPeriodStarted,
          symptoms: [slug],
        });
        await sheHoldsTheRing();

        expect((await herSealedDay(today))?.symptoms).toEqual([slug]);
      });
    }

    it('keeps the order she pressed them in rather than the order the screen offers', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        symptoms: ['calm', 'cramps'],
      });
      await sheHoldsTheRing();

      expect((await herSealedDay(today))?.symptoms).toEqual(['calm', 'cramps']);
    });

    it('writes one row holding the flow and the tiles where today is the day she bled', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: today,
        symptoms: ['cramps', 'bloating'],
      });
      await sheHoldsTheRing();

      const sealed = await herSealedDays();

      expect(sealed).toHaveLength(1);
      expect(sealed[0]?.day).toBe(today);
      expect(sealed[0]?.flow).toBe(firstRunFlow);
      expect(sealed[0]?.symptoms).toEqual(['cramps', 'bloating']);
    });

    it('writes no row for today where she said there is nothing to add', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      const sealed = await herSealedDays();

      expect(sealed.map((record) => record.day)).toEqual([herPeriodStarted]);
      expect(await herSealedDay(today)).toBeUndefined();
    });

    it('still writes the day she bled where today is it and she added nothing', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: today });
      await sheHoldsTheRing();

      const sealed = await herSealedDays();

      expect(sealed).toHaveLength(1);
      expect(sealed[0]?.flow).toBe(firstRunFlow);
      expect(sealed[0] && 'symptoms' in sealed[0]).toBe(false);
    });

    it('forgets the tiles she pressed before she pressed the way past it', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));
      await shePresses(todayTestID('fatigue'));
      await shePresses(onboardingSkipTestID);
      await sheHoldsTheRing();

      expect((await herSealedDays()).map((record) => record.day)).toEqual([herPeriodStarted]);
    });

    it('writes neither day where today refuses to seal, because the two travel together', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(() =>
        completeFirstRun(
          database,
          { day: aVaultThatFailsOnTheSecondDay(), profile: herProfileVault() },
          {
            periodStartedOn: herPeriodStarted,
            cycleLengthDays: herCycleLengthDays,
            symptoms: ['cramps'],
          },
          whenSheOpensIt,
        ),
      ).toThrow('this vault seals one day and refuses the next');
      expect(listDayLogs(database)).toEqual([]);
      expect(readProfile(database, herProfileVault())).toBeUndefined();
    });

    it('refuses a symptom Emi never offered, so the screen is not the only thing holding it', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            { day: herVault(), profile: herProfileVault() },
            {
              periodStartedOn: herPeriodStarted,
              cycleLengthDays: herCycleLengthDays,
              symptoms: ['nonsense' as TodaySymptom],
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('symptom-is-not-in-the-catalogue');
      expect(listDayLogs(database)).toEqual([]);
    });

    it('refuses the same symptom twice, because a list she built by tapping holds each once', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            { day: herVault(), profile: herProfileVault() },
            {
              periodStartedOn: herPeriodStarted,
              cycleLengthDays: herCycleLengthDays,
              symptoms: ['cramps', 'cramps'],
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('symptom-is-chosen-twice');
      expect(listDayLogs(database)).toEqual([]);
    });
  });

  describe('the day she reopens afterwards', () => {
    it('opens on the tiles she pressed, read back off her own phone', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        symptoms: ['bloating', 'low-mood'],
      });
      await sheHoldsTheRing();

      const sealed = await herSealedDay(today);

      expect(sealed?.symptoms).toEqual(['bloating', 'low-mood']);
      expect(sealed?.recordedAt).toBeTruthy();
    });
  });

  describe('the screen on its own', () => {
    it('presses the tile under her thumb and no other', async () => {
      const pressed: TodaySymptom[] = [];

      await render(
        <OnAPhone>
          <Today
            chosen={[]}
            onBack={() => undefined}
            onPress={(slug) => pressed.push(slug)}
            onSave={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );
      await fireEvent.press(screen.getByTestId(todayTestID('bloating')));

      expect(pressed).toEqual(['bloating']);
    });

    it('writes no second line under a tile, because a tile names a feeling and nothing more', async () => {
      await render(
        <OnAPhone>
          <Today
            chosen={['calm']}
            onBack={() => undefined}
            onPress={() => undefined}
            onSave={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );

      for (const slug of todaySymptoms) {
        expect(sizedTextIn(screen.getByTestId(todayTestID(slug))).map((run) => run.text)).toEqual([
          todayLabels[slug],
        ]);
      }
    });
  });
});
