import { join } from 'node:path';

import { tabTestID } from '@emi/ui';
import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen as routedScreen } from 'expo-router/testing-library';

import { type Language, catalogueOf, languages } from '../../src/language';
import { profileRow } from '../../src/data/profileRepository';
import {
  YourAnswers,
  yourAnswerRowTestID,
  yourAnswersBackTestID,
  yourAnswersScreenTestID,
  yourAnswersTitleTestID,
} from '../../src/features/settings/YourAnswers';
import {
  settingsAnswersTestID,
  settingsScreenTestID,
} from '../../src/features/settings/SettingsScreen';
import { theAnswerSheGave, yourAnswerRows } from '../../src/features/settings/herAnswers';
import { yourAnswersCopy } from '../../src/features/settings/copy';
import {
  type Part,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockup,
  theRowsOfTheMockup,
} from '../fixtures/theMockupScreen';
import { textIn } from '../fixtures/renderedText';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aProfileRecord } from '../fixtures/profileRecord';
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

/** What every row identifier begins with, taken from one of them rather than written out here. */
const theRowPrefix = yourAnswerRowTestID('name').slice(0, -'name'.length);

/** Every answer she gave, which is the phone the drawing was drawn for. */
const sheAnsweredEverything = aProfileRecord({
  name: 'Maria',
  birthYear: 1990,
  cycleLengthDays: 28,
  periodLengthDays: 5,
  regularity: 'moves',
  feeling: 'understand',
  goals: ['forecast', 'symptoms', 'doctorRecord'],
  focus: ['sleep', 'mood', 'pain'],
});

/** The three questions a woman skips here, which are the three the rows must leave empty. */
const theQuestionsSheSkipped = ['birthYear', 'periodLength', 'focus'] as const;

const sheSkippedThree = aProfileRecord({
  name: 'Maria',
  birthYear: undefined,
  periodLengthDays: undefined,
  focus: undefined,
});

/**
 * Where the drawing sends each row, in its own order, beside the answer this screen reads for it.
 *
 * Only the cycle length is sent anywhere, and the screen it opens is built in the next step, so
 * every row here is a row she reads rather than a row she presses.
 */
const theRowsOfTheDrawing = [
  { to: null, row: 'name' },
  { to: null, row: 'birthYear' },
  { to: 'answerCycleLength', row: 'cycleLength' },
  { to: null, row: 'periodLength' },
  { to: null, row: 'regularity' },
  { to: null, row: 'feeling' },
  { to: null, row: 'goals' },
  { to: null, row: 'focus' },
] as const;

function asPart(row: (typeof theRowsOfTheDrawing)[number]): Part {
  return { builtUnder: [yourAnswerRowTestID(row.row)], name: `the row that reads ${row.row}` };
}

/**
 * The heading, the one way back, and the eight rows, as the drawing places them.
 *
 * The drawing puts a way back at each end of the header, a chevron on the left and the word on the
 * right. The screen builds one of the two, the way the export screen built one before it, so the
 * second is named here as the part this screen does not answer for.
 */
function theHeadingTheWayBackAndTheRows(): Part[] {
  const [heading, wayBack, andAnother] = thePartsOfTheMockup('yourAnswers');

  if (heading === undefined || wayBack === undefined || andAnother === undefined) {
    throw new Error('the drawing of her answers places no header at all');
  }

  return [heading, wayBack, ...theRowsOfTheDrawing.map(asPart)];
}

async function sheOpensHerAnswersOnItsOwn(profile = sheAnsweredEverything): Promise<void> {
  await render(
    <OnAPhone>
      <YourAnswers answers={profile} onBack={() => undefined} />
    </OnAPhone>,
  );
}

async function herPhoneIsSetUp(profile = sheAnsweredEverything): Promise<void> {
  await herPhoneHoldsTheseAnswers(whenSheOpensIt, profile, [
    aBleedingDay(dayOf(new Date('2026-05-09T08:00:00.000Z'))),
    aBleedingDay(dayOf(new Date('2026-05-10T08:00:00.000Z'))),
    aBleedingDay(dayOf(new Date('2026-05-11T08:00:00.000Z'))),
  ]);
}

async function sheWalksFromTheDockToHerAnswers(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await fireEvent.press(routedScreen.getByTestId(tabTestID(theColumnThatOpensIt)));
  await fireEvent.press(routedScreen.getByTestId(settingsAnswersTestID));
}

function theRowsSheReads(): string[] {
  return theIdentifiersDrawn().filter((identifier) => identifier.startsWith(theRowPrefix));
}

function theWordsIn(testID: string): string[] {
  return textIn(screen.getByTestId(testID));
}

describe('she reads back the eight answers she gave at the first run', () => {
  describe('the drawing the screen is held to', () => {
    it('places eight rows, and sends only the cycle length anywhere', () => {
      expect(theRowsOfTheMockup('yourAnswers')).toEqual(
        theRowsOfTheDrawing.map(({ to }) => ({ to })),
      );
    });

    it('is the eight answers the first run takes, and the screen declares the same eight', () => {
      expect([...yourAnswerRows]).toEqual(theRowsOfTheDrawing.map(({ row }) => row));
      expect(yourAnswerRows).toHaveLength(8);
    });
  });

  describe('the screen a woman who answered everything reads', () => {
    beforeEach(async () => {
      await sheOpensHerAnswersOnItsOwn();
    });

    it('answers for the heading, the way back and every row of the drawing', () => {
      expect(partsMissing(theHeadingTheWayBackAndTheRows(), theIdentifiersDrawn())).toEqual([]);
    });

    it('draws eight rows and no ninth, in the order the drawing places them', () => {
      expect(theRowsSheReads()).toEqual(yourAnswerRows.map(yourAnswerRowTestID));
    });

    it('names every one of the eight questions', () => {
      for (const row of yourAnswerRows) {
        expect(theWordsIn(yourAnswerRowTestID(row))).toContain(yourAnswersCopy.rows[row]);
      }
    });

    it('reads back under each question the answer she gave', () => {
      for (const row of yourAnswerRows) {
        const answer = theAnswerSheGave(row, sheAnsweredEverything);

        expect(answer).toEqual(expect.any(String));
        expect(theWordsIn(yourAnswerRowTestID(row))).toContain(answer);
      }
    });

    it('says her name and her year back to her, and not a value nobody gave', () => {
      expect(theWordsIn(yourAnswerRowTestID('name'))).toContain('Maria');
      expect(theWordsIn(yourAnswerRowTestID('birthYear'))).toContain('1990');
    });

    it('gives the way back a control a thumb can hit', () => {
      expect(controlsTooSmallToPress([screen.getByTestId(yourAnswersBackTestID)])).toEqual([]);
    });
  });

  describe('the screen a woman who skipped three questions reads', () => {
    beforeEach(async () => {
      await sheOpensHerAnswersOnItsOwn(sheSkippedThree);
    });

    it('still draws all eight rows, because the screen adds none and takes none away', () => {
      expect(theRowsSheReads()).toEqual(yourAnswerRows.map(yourAnswerRowTestID));
    });

    it('leaves the three she skipped with nothing under them, and no invented default', () => {
      for (const row of theQuestionsSheSkipped) {
        expect(theAnswerSheGave(row, sheSkippedThree)).toBeUndefined();
        expect(theWordsIn(yourAnswerRowTestID(row))).toEqual([yourAnswersCopy.rows[row]]);
      }
    });

    it('still reads back the five she did answer', () => {
      const answered = yourAnswerRows.filter(
        (row) => !(theQuestionsSheSkipped as readonly string[]).includes(row),
      );

      expect(answered).toHaveLength(5);

      for (const row of answered) {
        expect(theWordsIn(yourAnswerRowTestID(row))).toContain(
          theAnswerSheGave(row, sheSkippedThree),
        );
      }
    });
  });

  describe('the row the table holds', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      jest.setSystemTime(whenSheOpensIt);
      resetExpoSqlite();
      resetExpoSecureStore();
      await herPhoneIsSetUp();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('carries her answers as an envelope and never as words anybody can read', () => {
      const held = profileRow(herDatabase());

      expect(held).toBeDefined();
      expect(held?.payload[0]).toBe(1);
      expect(Buffer.from(held?.payload ?? new Uint8Array()).toString('utf8')).not.toContain(
        'Maria',
      );
    });

    it('is opened, and its answers are on the screen she reaches from Privacy', async () => {
      await sheWalksFromTheDockToHerAnswers();

      expect(routedScreen.getByTestId(yourAnswersScreenTestID)).toBeTruthy();

      for (const row of yourAnswerRows) {
        expect(textIn(routedScreen.getByTestId(yourAnswerRowTestID(row)))).toContain(
          theAnswerSheGave(row, sheAnsweredEverything),
        );
      }
    });

    it('leaves her back on Privacy when she presses the way back', async () => {
      await sheWalksFromTheDockToHerAnswers();
      await fireEvent.press(routedScreen.getByTestId(yourAnswersBackTestID));

      expect(routedScreen.getByTestId(settingsScreenTestID)).toBeTruthy();
      expect(routedScreen.queryByTestId(yourAnswersScreenTestID)).toBeNull();
    });
  });

  describe('the words of the screen, in each of the three languages', () => {
    const theKeysOfTheScreen = [
      'settings.answers.title',
      'settings.answers.back',
      'settings.answers.name',
      'settings.answers.birthYear',
      'settings.answers.cycleLength',
      'settings.answers.periodLength',
      'settings.answers.regularity',
      'settings.answers.feeling',
      'settings.answers.goals',
      'settings.answers.goalsChosen',
      'settings.answers.focus',
      'settings.settings.answersLine',
    ] as const;

    it.each([...languages])('holds a word for every one of them, in %s', (language: Language) => {
      const catalogue = catalogueOf(language);

      for (const key of theKeysOfTheScreen) {
        expect(catalogue[key]).toEqual(expect.any(String));
        expect(String(catalogue[key]).length).toBeGreaterThan(0);
      }
    });

    /**
     * Regular is spelled the same in English and in Spanish, and the first run already asks the
     * question under that word in both. Saying it differently here would give one answer two names.
     */
    const theWordSpanishSpellsTheSame = 'settings.answers.regularity';

    it.each(['es', 'ru'] as const)(
      'says them in its own words rather than in English, in %s',
      (language) => {
        const ownWords = theKeysOfTheScreen.filter(
          (key) => language === 'ru' || key !== theWordSpanishSpellsTheSame,
        );
        const translated = ownWords.filter(
          (key) => catalogueOf(language)[key] !== catalogueOf('en')[key],
        );

        expect(translated).toEqual(ownWords);
        expect(ownWords.length).toBeGreaterThan(theKeysOfTheScreen.length - 2);
      },
    );
  });

  describe('the heading above the rows', () => {
    beforeEach(async () => {
      await sheOpensHerAnswersOnItsOwn();
    });

    it('names the screen, and stands above every answer', () => {
      const drawn = theIdentifiersDrawn();

      expect(theWordsIn(yourAnswersTitleTestID)).toEqual([yourAnswersCopy.title]);
      expect(drawn.indexOf(yourAnswersTitleTestID)).toBeLessThan(
        drawn.indexOf(yourAnswerRowTestID('name')),
      );
    });
  });
});
