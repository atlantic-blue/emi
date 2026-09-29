import { join } from 'node:path';

import { tabTestID } from '@emi/ui';
import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen as routedScreen } from 'expo-router/testing-library';

import { type Language, catalogueOf, languages } from '../../src/language';
import { changeProfileAnswer, profileRow, readProfile } from '../../src/data/profileRepository';
import {
  answerBackTestID,
  answerCancelTestID,
  answerHeldTestID,
  answerSaveTestID,
  answerScreenTestID,
  answerTitleTestID,
} from '../../src/features/settings/AnswerScreen';
import {
  ChangeCycleLength,
  answerCycleLengthReadingTestID,
  answerLongerTestID,
  answerShorterTestID,
} from '../../src/features/settings/ChangeCycleLength';
import { settingsAnswersTestID } from '../../src/features/settings/SettingsScreen';
import {
  yourAnswerRowTestID,
  yourAnswersBackTestID,
  yourAnswersScreenTestID,
} from '../../src/features/settings/YourAnswers';
import { learningStatedLengthTestID } from '../../src/features/forecast/Learning';
import { cycleLengthDaysLabel } from '../../src/features/onboarding/copy';
import {
  defaultCycleLengthDays,
  maximumCycleLengthDays,
  minimumCycleLengthDays,
} from '../../src/features/onboarding/firstRun';
import { partsMissingFromTheScreen } from '../fixtures/theMockupScreen';
import { textIn } from '../fixtures/renderedText';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aProfileRecord } from '../fixtures/profileRecord';
import { herProfileVault, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { aBleedingDay, dayOf, herDatabase, herPhoneHoldsTheseAnswers } from '../fixtures/herPhone';
import { OnAPhone } from '../fixtures/theSafeArea';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** The column of the dock that opens Privacy, named by its route rather than counted to. */
const theColumnThatOpensIt = 'settings/index';

/** The column of the dock that opens the screen the forecast is read on. */
const theColumnSheOpens = 'index';

/** The length she gave at the first run, which is the number this walk changes. */
const sheGave = 28;

/** The length she says it is now, three days on, which is three presses of the longer knob. */
const sheSaysItIsNow = 31;

const herFirstRun = aProfileRecord({ cycleLengthDays: sheGave });

/** The three days of her last period, so the screen she opens has a cycle to forecast from. */
const herLastPeriod = [
  aBleedingDay(dayOf(new Date('2026-05-09T08:00:00.000Z'))),
  aBleedingDay(dayOf(new Date('2026-05-10T08:00:00.000Z'))),
  aBleedingDay(dayOf(new Date('2026-05-11T08:00:00.000Z'))),
];

async function herPhoneIsSetUp(profile = herFirstRun): Promise<void> {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  resetExpoSqlite();
  resetExpoSecureStore();
  await herPhoneHoldsTheseAnswers(whenSheOpensIt, profile, herLastPeriod);
}

/** The screen on its own, with nothing behind it, which is what the drawing is held against. */
async function sheOpensTheScreenOnItsOwn(
  gave: number | undefined,
  onSave: (days: number) => void = () => undefined,
  onCancel: () => void = () => undefined,
): Promise<void> {
  await render(
    <OnAPhone>
      <ChangeCycleLength gave={gave} onCancel={onCancel} onSave={onSave} />
    </OnAPhone>,
  );
}

function theReading(): string {
  return textIn(screen.getByTestId(answerCycleLengthReadingTestID)).join('');
}

/**
 * The application, opened once.
 *
 * Once, and never twice in one case: a second tree mounted beside the first leaves the router
 * dispatching into the one nobody is looking at, and unmounting the first leaves every later
 * render in this file drawing nothing at all.
 */
async function sheOpensTheApplication(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
}

/** From the screen she opens to the number, which is the way she would actually find it. */
async function sheWalksToTheNumber(): Promise<void> {
  await fireEvent.press(routedScreen.getByTestId(tabTestID(theColumnThatOpensIt)));
  await fireEvent.press(routedScreen.getByTestId(settingsAnswersTestID));
  await fireEvent.press(routedScreen.getByTestId(yourAnswerRowTestID('cycleLength')));
}

async function shePresses(testID: string, times: number): Promise<void> {
  for (let done = 0; done < times; done += 1) {
    await fireEvent.press(routedScreen.getByTestId(testID));
  }
}

/** The whole walk: open the row, move the number by three days, and save. */
async function sheChangesItAndSaves(): Promise<void> {
  await sheWalksToTheNumber();
  await shePresses(answerLongerTestID, sheSaysItIsNow - sheGave);
  await fireEvent.press(routedScreen.getByTestId(answerSaveTestID));
}

/** What the screen she opens says it is counting a cycle from. */
function theLengthTheForecastCountsFrom(): string {
  return textIn(routedScreen.getByTestId(learningStatedLengthTestID)).join('');
}

async function sheGoesBackToTheScreenSheOpens(): Promise<void> {
  await fireEvent.press(routedScreen.getByTestId(yourAnswersBackTestID));
  await fireEvent.press(routedScreen.getByTestId(tabTestID(theColumnSheOpens)));
}

describe('she changes her cycle length and the forecast on the screen she opens moves', () => {
  describe('the screen she reaches from the row', () => {
    beforeEach(async () => {
      await sheOpensTheScreenOnItsOwn(sheGave);
    });

    it('answers for every part of the drawing it names', () => {
      expect(partsMissingFromTheScreen('answerCycleLength')).toEqual([]);
    });

    it('opens on the answer she already gave, and not on a number nobody chose', () => {
      expect(theReading()).toBe(cycleLengthDaysLabel(sheGave));
      expect(cycleLengthDaysLabel(sheGave)).toContain(String(sheGave));
    });

    it('says under the control what she gave at the first run', () => {
      expect(textIn(screen.getByTestId(answerHeldTestID)).join('')).toContain(
        cycleLengthDaysLabel(sheGave),
      );
    });

    it('names the answer it changes at the top, in the words her answers name it with', () => {
      expect(textIn(screen.getByTestId(answerTitleTestID))).toEqual(['Cycle length']);
    });

    it('moves a day at a time in each direction', async () => {
      await fireEvent.press(screen.getByTestId(answerLongerTestID));

      expect(theReading()).toBe(cycleLengthDaysLabel(sheGave + 1));

      await fireEvent.press(screen.getByTestId(answerShorterTestID));
      await fireEvent.press(screen.getByTestId(answerShorterTestID));

      expect(theReading()).toBe(cycleLengthDaysLabel(sheGave - 1));
    });

    it('gives every control a thumb can hit the room a thumb needs', () => {
      const controls = [
        answerBackTestID,
        answerCancelTestID,
        answerShorterTestID,
        answerLongerTestID,
        answerSaveTestID,
      ].map((testID) => screen.getByTestId(testID));

      expect(controlsTooSmallToPress(controls)).toEqual([]);
    });
  });

  describe('the ends of the stepper', () => {
    it('goes no shorter than the shortest cycle the first run offers', async () => {
      await sheOpensTheScreenOnItsOwn(minimumCycleLengthDays);
      await fireEvent.press(screen.getByTestId(answerShorterTestID));

      expect(theReading()).toBe(cycleLengthDaysLabel(minimumCycleLengthDays));
    });

    it('goes no longer than the longest cycle the first run offers', async () => {
      await sheOpensTheScreenOnItsOwn(maximumCycleLengthDays);
      await fireEvent.press(screen.getByTestId(answerLongerTestID));

      expect(theReading()).toBe(cycleLengthDaysLabel(maximumCycleLengthDays));
    });
  });

  describe('a woman who gave no length at the first run', () => {
    beforeEach(async () => {
      await sheOpensTheScreenOnItsOwn(undefined);
    });

    it('opens on the number the first run opens on', () => {
      expect(theReading()).toBe(cycleLengthDaysLabel(defaultCycleLengthDays));
    });

    it('is told nothing she did not say', () => {
      expect(screen.queryByTestId(answerHeldTestID)).toBeNull();
    });
  });

  describe('what she saves, and what she leaves', () => {
    it('hands out the number she is left on, and not the one she opened on', async () => {
      const saved: number[] = [];

      await sheOpensTheScreenOnItsOwn(sheGave, (days) => saved.push(days));
      await fireEvent.press(screen.getByTestId(answerLongerTestID));
      await fireEvent.press(screen.getByTestId(answerLongerTestID));
      await fireEvent.press(screen.getByTestId(answerSaveTestID));

      expect(saved).toEqual([sheGave + 2]);
    });

    it('saves nothing when she takes either way out of the header', async () => {
      const saved: number[] = [];
      const left: string[] = [];

      await sheOpensTheScreenOnItsOwn(
        sheGave,
        (days) => saved.push(days),
        () => left.push('left'),
      );
      await fireEvent.press(screen.getByTestId(answerLongerTestID));
      await fireEvent.press(screen.getByTestId(answerCancelTestID));
      await fireEvent.press(screen.getByTestId(answerBackTestID));

      expect(left).toEqual(['left', 'left']);
      expect(saved).toEqual([]);
    });
  });

  describe('the walk she takes, from the dock to the number and back', () => {
    beforeEach(async () => {
      await herPhoneIsSetUp();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('leaves her answers reading the number she saved', async () => {
      await sheOpensTheApplication();
      await sheChangesItAndSaves();

      expect(routedScreen.getByTestId(yourAnswersScreenTestID)).toBeTruthy();
      expect(routedScreen.queryByTestId(answerScreenTestID)).toBeNull();
      expect(textIn(routedScreen.getByTestId(yourAnswerRowTestID('cycleLength')))).toContain(
        cycleLengthDaysLabel(sheSaysItIsNow),
      );
    });

    it('moves the forecast on the screen she opens, which counted from the old number', async () => {
      await sheOpensTheApplication();
      await sheWalksToTheNumber();
      await fireEvent.press(routedScreen.getByTestId(answerCancelTestID));
      await sheGoesBackToTheScreenSheOpens();

      expect(theLengthTheForecastCountsFrom()).toContain(String(sheGave));

      await sheChangesItAndSaves();
      await sheGoesBackToTheScreenSheOpens();

      expect(theLengthTheForecastCountsFrom()).toContain(String(sheSaysItIsNow));
      expect(theLengthTheForecastCountsFrom()).not.toContain(String(sheGave));
    });

    /**
     * Read with the key the keychain holds and a handle taken fresh, so nothing the screens are
     * still holding can answer for the row. This is the whole of what the save is worth: a number
     * kept in the component would pass every case above it and be gone at the next launch.
     */
    it('leaves the number in the sealed row rather than in anything the screen holds', async () => {
      await sheOpensTheApplication();
      await sheChangesItAndSaves();

      const sealed = await theProfileVaultOnHerPhone();

      expect(readProfile(herDatabase(), sealed)?.cycleLengthDays).toBe(sheSaysItIsNow);
    });
  });

  /**
   * A launch after the one she saved on. The change is made the way the screen makes it and the
   * application is then started from nothing, so every screen here is reading the row off the
   * phone rather than anything the save left behind in the process.
   */
  describe('the launch after the one she changed it on', () => {
    beforeEach(async () => {
      await herPhoneIsSetUp();
      changeProfileAnswer(herDatabase(), herProfileVault(), {
        answer: { cycleLengthDays: sheSaysItIsNow },
        now: whenSheOpensIt,
      });
      await sheOpensTheApplication();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('counts the forecast on the screen she opens from the number she saved', () => {
      expect(theLengthTheForecastCountsFrom()).toContain(String(sheSaysItIsNow));
    });

    it('reads the number she saved back on her answers', async () => {
      await fireEvent.press(routedScreen.getByTestId(tabTestID(theColumnThatOpensIt)));
      await fireEvent.press(routedScreen.getByTestId(settingsAnswersTestID));

      expect(textIn(routedScreen.getByTestId(yourAnswerRowTestID('cycleLength')))).toContain(
        cycleLengthDaysLabel(sheSaysItIsNow),
      );
    });
  });

  describe('the one row the answer lives in', () => {
    beforeEach(async () => {
      await herPhoneIsSetUp();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('rises by one revision on the save, and keeps the identifier the first run gave it', async () => {
      const before = profileRow(herDatabase());

      await sheOpensTheApplication();
      await sheChangesItAndSaves();

      const after = profileRow(herDatabase());

      expect(before?.revision).toBe(1);
      expect(after?.revision).toBe(2);
      expect(after?.id).toBe(before?.id);
    });

    it('keeps her every other answer, because one question was asked and not eight', async () => {
      await sheOpensTheApplication();
      await sheChangesItAndSaves();

      expect(readProfile(herDatabase(), herProfileVault())).toMatchObject({
        birthYear: herFirstRun.birthYear,
        cycleLengthDays: sheSaysItIsNow,
        feeling: herFirstRun.feeling,
        name: herFirstRun.name,
        periodLengthDays: herFirstRun.periodLengthDays,
      });
    });

    it('carries the new number as an envelope, and never as digits anybody can read', async () => {
      await sheOpensTheApplication();
      await sheChangesItAndSaves();

      const held = profileRow(herDatabase());

      expect(held?.payload[0]).toBe(1);
      expect(Buffer.from(held?.payload ?? new Uint8Array()).toString('utf8')).not.toContain(
        'Maria',
      );
    });

    /**
     * The revision is what orders her writes for the server, so the table refuses a write that
     * leaves it where it was rather than trusting whoever wrote it. This is the case that goes red
     * when the raise is taken out of the write.
     */
    it('refuses a write that leaves the revision where it was', () => {
      const database = herDatabase();
      const held = profileRow(database);
      const again = (): void => {
        database.run('UPDATE profile SET payload = ?, updated_at = ? WHERE only_one = 1', [
          held?.payload ?? new Uint8Array(),
          whenSheOpensIt.toISOString(),
        ]);
      };

      expect(again).toThrow(/revision must rise/);
      expect(profileRow(database)?.revision).toBe(held?.revision);
    });
  });

  describe('the words of the screen, in each of the three languages', () => {
    const theKeysOfTheScreen = [
      'settings.answer.back',
      'settings.answer.cancel',
      'settings.answer.save',
      'settings.answer.gaveAtFirstRun',
    ] as const;

    it.each([...languages])('holds a word for every one of them, in %s', (language: Language) => {
      const catalogue = catalogueOf(language);

      for (const key of theKeysOfTheScreen) {
        expect(catalogue[key]).toEqual(expect.any(String));
        expect(String(catalogue[key]).length).toBeGreaterThan(0);
      }
    });

    it.each(['es', 'ru'] as const)(
      'says them in its own words rather than in English, in %s',
      (language) => {
        const translated = theKeysOfTheScreen.filter(
          (key) => catalogueOf(language)[key] !== catalogueOf('en')[key],
        );

        expect(translated).toEqual([...theKeysOfTheScreen]);
      },
    );

    /**
     * The question, the two lines under it and the labels of the two knobs are the first run's own
     * words. A second wording here would make it a second question, and she would be reading two
     * screens that ask the same thing differently.
     */
    it.each([...languages])("borrows the first run's own question, in %s", (language: Language) => {
      const catalogue = catalogueOf(language);

      for (const key of [
        'onboarding.cycleLength.title',
        'onboarding.cycleLength.line.count',
        'onboarding.cycleLength.line.corrects',
        'onboarding.cycleLength.shorter',
        'onboarding.cycleLength.longer',
      ] as const) {
        expect(catalogue[key]).toEqual(expect.any(String));
      }
    });
  });
});
