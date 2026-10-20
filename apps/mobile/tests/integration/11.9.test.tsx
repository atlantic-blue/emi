import { join } from 'node:path';

import { findSymptom } from '@emi/cycle';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { sheGivesAPeriod } from '../fixtures/thePastPeriods';

import type { DayVault } from '../../src/services/vault/dayVault';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { catalogueOf, languages } from '../../src/language';
import { firstForecastActionTestID } from '../../src/features/onboarding/FirstForecast';
import {
  onboardingActionTestID,
  onboardingQuestionTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  Today,
  todayAllSymptomsTestID,
  todayCellTestID,
  todayIcons,
  todayTestID,
} from '../../src/features/onboarding/Today';
import { todayLabels } from '../../src/features/onboarding/copy';
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
import {
  sheAnswersEveryQuestion,
  sheAnswersTheReminder,
  sheReadsWhatEmiDoesWithIt,
} from '../fixtures/theFirstRun';
import {
  logSymptomsDoneTestID,
  logSymptomsSaveTestID,
  logSymptomsTestID,
  logSymptomsTitleTestID,
} from '../../src/features/log/LogSymptoms';
import { symptomChipTestID } from '../../src/features/log/SymptomGroup';
import { sheTapsSaveAndStart } from '../fixtures/theSave';
import { cycleLengthDaysTestID } from '../../src/features/onboarding/CycleLength';
import { locksDrawnIn } from '../fixtures/drawnLocks';

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
  await sheGivesAPeriod(0, periodStartedOn);
  await shePresses(onboardingActionTestID);
  await shePresses(cycleLengthDaysTestID(28));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingWayPastTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/**
 * The test ids on the screen she stands on, in the order it draws them from top to bottom. The
 * questions behind it stay mounted in the stack, so the walk reads only the today screen.
 */
function theOrderOnTheScreen(): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== 'object') {
      return;
    }
    const drawn = node as { props?: { testID?: unknown }; children?: unknown };
    if (typeof drawn.props?.testID === 'string') {
      found.push(drawn.props.testID);
    }
    walk(drawn.children ?? null);
  };

  walk(screen.getByTestId('onboarding-today'));

  return found;
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

    it('draws cramps, tired, breast tenderness and low with the drawings the set already has', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(todayIcons.cramps).toBe('pain');
      expect(todayIcons.headache).toBe('headache');
      expect(todayIcons.bloating).toBe('bloating');
      expect(todayIcons.fatigue).toBe('sleep');
      expect(todayIcons['breast-tenderness']).toBe('pain');
      expect(todayIcons['low-mood']).toBe('mood');
    });

    it('calls the way past Skip at the top and Nothing to add, and the way on Save today', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(screen.getByTestId(onboardingSkipTestID)).toHaveTextContent('Skip');
      expect(screen.getByTestId(onboardingWayPastTestID)).toHaveTextContent('Nothing to add');
      expect(screen.getByTestId(onboardingActionTestID)).toHaveTextContent('Save today');
      expect(screen.queryByText('Nothing today')).toBeNull();
      expect(screen.queryByText('Save')).toBeNull();
    });

    it('asks how she is today, and says under the title that she can skip it', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(screen.getByText('How are you today?')).toBeTruthy();
      expect(screen.getByTestId(onboardingQuestionTestID)).toHaveTextContent('You can skip this.');
      expect(screen.queryByText('How are you feeling today?')).toBeNull();
      expect(screen.queryByText('Pick anything that fits, or skip it.')).toBeNull();
    });

    it('carries none of the old words in any of the three languages', () => {
      for (const language of languages) {
        const held = Object.keys(catalogueOf(language));

        for (const key of [
          'onboarding.today.skip',
          'onboarding.today.line.skip',
          'onboarding.today.titleNamed',
        ]) {
          expect({ language, key, held: held.includes(key) }).toEqual({
            language,
            key,
            held: false,
          });
        }
      }

      expect(languages).toHaveLength(3);
    });

    it('draws no padlock line under the tiles', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(locksDrawnIn(screen.root)).toBe(0);
      expect(screen.queryByText('Emi encrypts it on this phone.')).toBeNull();
    });

    it('draws Nothing to add under Save today, as the redesign draws it', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      const order = theOrderOnTheScreen();

      expect(order.indexOf(onboardingActionTestID)).toBeGreaterThan(-1);
      expect(order.indexOf(onboardingWayPastTestID)).toBeGreaterThan(
        order.indexOf(onboardingActionTestID),
      );
    });

    it('stands the six tiles three to a row, as the redesign draws them', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      for (const slug of todaySymptoms) {
        const cell = screen.getByTestId(todayCellTestID(slug));
        const basis = Number.parseFloat(
          String((StyleSheet.flatten(cell.props.style) as { flexBasis?: string }).flexBasis),
        );

        // Three fit on a row and a fourth does not.
        expect({ slug, three: basis * 3 <= 100, four: basis * 4 > 100 }).toEqual({
          slug,
          three: true,
          four: true,
        });
      }
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
      expect(screen.getByTestId(todayTestID('breast-tenderness'))).not.toBeSelected();
    });

    it('takes a tile off again when she presses it a second time', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));
      await shePresses(todayTestID('cramps'));

      expect(screen.getByTestId(todayTestID('cramps'))).not.toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    it('hands her to the reminder, whether she saves the day or passes it by', async () => {
      const app = await sheOpensEmi();

      await sheReachesToday();
      await shePresses(onboardingSkipTestID);

      expect(app.pathname()).toBe('/onboarding/reminder');
    });

    it('hands her to the reminder from Nothing to add too', async () => {
      const app = await sheOpensEmi();

      await sheReachesToday();
      await shePresses(onboardingWayPastTestID);

      expect(app.pathname()).toBe('/onboarding/reminder');
    });

    it('hands her to the reminder from Save today, once she picks a tile', async () => {
      const app = await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('headache'));
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/reminder');
    });

    it('has written nothing at all while she stands on it', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));

      expect(listDayLogs(herDatabase())).toEqual([]);
    });
  });

  describe('breast tenderness in the quick six, and the link to all symptoms', () => {
    it('offers breast tenderness in place of calm, in the order the board draws them', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      expect(todaySymptoms).toEqual([
        'cramps',
        'headache',
        'bloating',
        'fatigue',
        'breast-tenderness',
        'low-mood',
      ]);
      expect(screen.getByTestId(todayTestID('breast-tenderness'))).toHaveTextContent(
        'Breast tenderness',
      );
      expect(screen.queryByTestId('today-calm')).toBeNull();
      expect(screen.queryByText('Calm')).toBeNull();
    });

    it('names each tile with the word of the symptom list, in all three languages', () => {
      for (const language of languages) {
        const held = catalogueOf(language);

        for (const slug of todaySymptoms) {
          expect(held[`symptom.${slug}`]).toBeTruthy();
        }
        expect(held['onboarding.today.allSymptoms']).toBe(held['phase.diary.allSymptoms']);
      }
      expect(todayLabels['breast-tenderness']).toBe('Breast tenderness');
    });

    it('draws All symptoms under the six and over Save today', async () => {
      await sheOpensEmi();

      await sheReachesToday();

      const order = theOrderOnTheScreen();

      expect(screen.getByTestId(todayAllSymptomsTestID)).toHaveTextContent('All symptoms');
      expect(order.indexOf(todayAllSymptomsTestID)).toBeGreaterThan(
        order.indexOf(todayTestID('low-mood')),
      );
      expect(order.indexOf(onboardingActionTestID)).toBeGreaterThan(
        order.indexOf(todayAllSymptomsTestID),
      );
    });

    it('opens every symptom on the link, holding the tiles she already pressed', async () => {
      const app = await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));
      await shePresses(todayAllSymptomsTestID);

      expect(app.pathname()).toBe('/onboarding/all-symptoms');
      expect(screen.getByTestId(logSymptomsTestID)).toBeTruthy();
      expect(screen.getByTestId(logSymptomsTitleTestID)).toHaveTextContent('Today');
      expect(screen.getByTestId(symptomChipTestID('cramps'))).toBeChecked();
    });

    it('brings her back to the six with what she picked, and Save today ready', async () => {
      const app = await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayAllSymptomsTestID);
      await shePresses(symptomChipTestID('irritable'));
      await shePresses(logSymptomsSaveTestID);

      expect(app.pathname()).toBe('/onboarding/today');
      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
      expect(listDayLogs(herDatabase())).toEqual([]);
    });

    it('seals the tiles and what she picked from all symptoms at Save and start, and nothing before', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('breast-tenderness'));
      await shePresses(todayAllSymptomsTestID);
      await shePresses(symptomChipTestID('irritable'));
      await shePresses(logSymptomsDoneTestID);
      await shePresses(onboardingActionTestID);
      await sheAnswersTheReminder(undefined);
      await fireEvent.press(await screen.findByTestId(firstForecastActionTestID));
      await sheReadsWhatEmiDoesWithIt();

      expect(listDayLogs(herDatabase())).toEqual([]);

      await sheTapsSaveAndStart();

      expect((await herSealedDay(today))?.symptoms).toEqual(['breast-tenderness', 'irritable']);
    });

    it('takes a tile off on all symptoms, and the tile on the six reads it', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));
      await shePresses(todayAllSymptomsTestID);
      await shePresses(symptomChipTestID('cramps'));
      await shePresses(logSymptomsSaveTestID);

      expect(screen.getByTestId(todayTestID('cramps'))).not.toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });
  });

  describe('her answer, at the hold', () => {
    it('seals today as a day of its own, carrying both the tiles she pressed', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        symptoms: ['cramps', 'fatigue'],
      });
      await sheTapsSaveAndStart();

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
        await sheTapsSaveAndStart();

        expect((await herSealedDay(today))?.symptoms).toEqual([slug]);
      });
    }

    it('keeps the order she pressed them in rather than the order the screen offers', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        symptoms: ['breast-tenderness', 'cramps'],
      });
      await sheTapsSaveAndStart();

      expect((await herSealedDay(today))?.symptoms).toEqual(['breast-tenderness', 'cramps']);
    });

    it('writes one row holding the flow and the tiles where today is the day she bled', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: today,
        symptoms: ['cramps', 'bloating'],
      });
      await sheTapsSaveAndStart();

      const sealed = await herSealedDays();

      expect(sealed).toHaveLength(1);
      expect(sealed[0]?.day).toBe(today);
      expect(sealed[0]?.flow).toBe(firstRunFlow);
      expect(sealed[0]?.symptoms).toEqual(['cramps', 'bloating']);
    });

    it('writes no row for today where she said there is nothing to add', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheTapsSaveAndStart();

      const sealed = await herSealedDays();

      expect(sealed.map((record) => record.day)).toEqual([herPeriodStarted]);
      expect(await herSealedDay(today)).toBeUndefined();
    });

    it('still writes the day she bled where today is it and she added nothing', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: today });
      await sheTapsSaveAndStart();

      const sealed = await herSealedDays();

      expect(sealed).toHaveLength(1);
      expect(sealed[0]?.flow).toBe(firstRunFlow);
      expect(sealed[0] && 'symptoms' in sealed[0]).toBe(false);
    });

    it('forgets the tiles she pressed before she pressed Nothing to add', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));
      await shePresses(todayTestID('fatigue'));
      await shePresses(onboardingWayPastTestID);
      // The reminder stands after the last question, and "Not now" passes it.
      await shePresses(onboardingSkipTestID);
      await shePresses(firstForecastActionTestID);
      await sheReadsWhatEmiDoesWithIt();
      await sheTapsSaveAndStart();

      expect((await herSealedDays()).map((record) => record.day)).toEqual([herPeriodStarted]);
    });

    it('forgets the tiles she pressed before she pressed the way past it', async () => {
      await sheOpensEmi();

      await sheReachesToday();
      await shePresses(todayTestID('cramps'));
      await shePresses(todayTestID('fatigue'));
      await shePresses(onboardingSkipTestID);
      // The reminder stands after the last question, and "Not now" passes it.
      await shePresses(onboardingSkipTestID);
      await shePresses(firstForecastActionTestID);
      await sheReadsWhatEmiDoesWithIt();
      await sheTapsSaveAndStart();

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
            periods: [{ startedOn: herPeriodStarted, lengthDays: 1 }],
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
              periods: [{ startedOn: herPeriodStarted, lengthDays: 1 }],
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
              periods: [{ startedOn: herPeriodStarted, lengthDays: 1 }],
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
      await sheTapsSaveAndStart();

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
            onAllSymptoms={() => undefined}
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
            chosen={['breast-tenderness']}
            onAllSymptoms={() => undefined}
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
