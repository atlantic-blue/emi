import { MINIMUM_TAP_TARGET, colour, radius, stroke } from '@emi/tokens';
import { screen } from '@testing-library/react-native';

import { type Language, type Words, catalogueOf, languages } from '../../src/language';
import { rowGroupRuleTestID } from '../../src/components/RowGroup';
import { rowChevronTestID, rowTileTestID } from '../../src/components/SettingsRow';
import {
  exportActionTestID,
  exportBackTestID,
  exportHeldTestID,
  exportLockLineTestID,
  exportMadeTestID,
  exportTileTestID,
  exportWhatTestID,
  theExportTiles,
} from '../../src/features/export/ExportScreen';
import { lockLineIconTestID } from '../../src/components/LockLine';
import {
  answerBackTestID,
  answerLinesTestID,
  answerQuestionTestID,
  answerSaveTestID,
} from '../../src/features/settings/AnswerScreen';
import {
  deleteActionTestID,
  deleteBackTestID,
  deleteEmblemTestID,
  deleteGoesTestID,
  deleteTitleTestID,
  goesMarkTestID,
} from '../../src/features/settings/DeleteEverything';
import { settingsCopy } from '../../src/features/settings/copy';
import {
  settingsAssuranceTestID,
  settingsRowsTestID,
  settingsTitleTestID,
} from '../../src/features/settings/SettingsScreen';
import {
  yourAnswersBackTestID,
  yourAnswersRowsTestID,
  yourAnswerRowTestID,
} from '../../src/features/settings/YourAnswers';
import { theAnswerSheGave, yourAnswerRows } from '../../src/features/settings/herAnswers';
import { promiseCopy } from '../../src/features/onboarding/copy';
import { textIn } from '../fixtures/renderedText';
import {
  herAnswers,
  howManyPartsAreHeldTo,
  privacyDrew,
  sheIsLookingAtPrivacy,
  thePartNamesTheStagePlaces,
  thePartsOfTheReminderDrawing,
  thePartsOfTheSecondDesign,
  thePrivacyDrawings,
  theRowsOfHerAnswers,
  theRowsOfPrivacy,
  theRowsOnTheGlass,
  theScreenOf,
  theSecondDesignOfTheRoute,
  theStyleOf,
  theTextStyleOf,
  theDrawingNothingIsBuiltFor,
  theWashIsAtTheTopOfPrivacy,
  whatPrivacyDoesNotAnswerFor,
  whatTheDrawingAsksFor,
  whatThisStepAnswersFor,
  whatThisStepLeaves,
  wherePrivacyDrew,
  whenSheOpensPrivacy,
} from '../fixtures/thePrivacyLook';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));
jest.mock('expo-file-system', () => jest.requireActual('../fixtures/expoFileSystem'));
jest.mock('expo-sharing', () => jest.requireActual('../fixtures/expoSharing'));

/**
 * The screens she reads, corrects and empties her own record on, in the shapes the approved
 * redesign draws them in.
 *
 * Every case here reads a rendered state against the drawing of that state in the mockups stage.
 * Nothing here decides what Emi holds, what a press writes or what it removes: a case reads what
 * the screen drew and in what order.
 */

/** The two keys the two export tiles read their labels from. */
const theTileLabels = ['export.forADoctor', 'export.forAnApplication'] as const;

/** One word of one catalogue, read by its key, because the key is new in this step. */
function theWordFor(language: Language, key: string): string | undefined {
  const catalogue = catalogueOf(language) as Readonly<Record<string, Words | undefined>>;
  const held = catalogue[key];

  return typeof held === 'string' ? held : undefined;
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

describe('the Privacy screens match the redesign prototype', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensPrivacy);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('every screen of the set', () => {
    for (const drawing of thePrivacyDrawings) {
      it(`carries the wash at the top of ${drawing}`, async () => {
        await sheIsLookingAtPrivacy(drawing);

        expect(theWashIsAtTheTopOfPrivacy()).toBe(true);
      });
    }

    for (const drawing of thePrivacyDrawings) {
      it(`is held to the parts the stage places for ${drawing}, and to no other list`, async () => {
        await sheIsLookingAtPrivacy(drawing);

        expect(whatTheDrawingAsksFor(drawing).map((part) => part.name)).toEqual(
          thePartNamesTheStagePlaces(drawing),
        );
      });
    }

    for (const drawing of thePrivacyDrawings) {
      it(`answers for every part of ${drawing} this step builds, in the drawing order`, async () => {
        await sheIsLookingAtPrivacy(drawing);

        expect(whatThisStepAnswersFor(drawing).length).toBeGreaterThan(1);
        expect(whatPrivacyDoesNotAnswerFor(drawing)).toEqual([]);
      });
    }

    it('is held to every part of every drawing, and the count is the check', async () => {
      await sheIsLookingAtPrivacy('privacyNext');

      expect(thePrivacyDrawings).toHaveLength(5);
      expect(howManyPartsAreHeldTo()).toBeGreaterThan(25);
    });

    it('names every part it leaves to another step, which screen it is on, and why', async () => {
      await sheIsLookingAtPrivacy('privacyNext');

      const left = thePrivacyDrawings.flatMap((drawing) => whatThisStepLeaves(drawing));

      expect(left).toHaveLength(4);

      for (const part of left) {
        expect(part.builtUnder).toEqual([]);
        expect(part.ownedBy?.length ?? 0).toBeGreaterThan(40);
      }
    });

    it('names a part another screen of the set does not draw, so a silent gap cannot hide', async () => {
      await sheIsLookingAtPrivacy('delete');

      const missing = whatPrivacyDoesNotAnswerFor('export').join(' ');

      expect(missing).toContain('FileTile');
      expect(missing).toContain('LockLine');
    });
  });

  describe('Privacy, the screen the fourth column of the dock opens', () => {
    beforeEach(async () => {
      await sheIsLookingAtPrivacy('privacyNext');
    });

    it('stands all four rows in one white card, with no line drawn around it', () => {
      const card = theStyleOf(settingsRowsTestID);

      expect(card.backgroundColor).toBe(colour.card);
      expect(card.borderRadius).toBe(radius.xl);
      expect(card.borderWidth ?? 0).toBe(0);
      expect(theRowsOnTheGlass(theRowsOfPrivacy)).toEqual([...theRowsOfPrivacy]);
    });

    it('puts a hairline between two rows, and none under the last of them', () => {
      for (let at = 1; at < theRowsOfPrivacy.length; at += 1) {
        const rule = theStyleOf(rowGroupRuleTestID(settingsRowsTestID, at));

        expect(rule.backgroundColor).toBe(colour.line);
        expect(rule.height).toBe(stroke.hairline);
      }

      expect(privacyDrew(rowGroupRuleTestID(settingsRowsTestID, theRowsOfPrivacy.length))).toBe(
        false,
      );
    });

    it('gives every row its own drawing, in a tile, at the start of the row', () => {
      for (const row of theRowsOfPrivacy) {
        const tile = theStyleOf(rowTileTestID(row));

        expect(tile.backgroundColor).toBe(colour.field);
        expect(wherePrivacyDrew(rowTileTestID(row), row)).toBeGreaterThan(
          wherePrivacyDrew(row, theScreenOf('privacyNext')),
        );
      }
    });

    it('says above the rows that only she can read her days, on the one card that reverses', () => {
      const card = theStyleOf(settingsAssuranceTestID);

      expect(card.backgroundColor).toBe(colour.darkCard);
      expect(card.borderRadius).toBe(radius.xl);
      expect(whatItSays(settingsAssuranceTestID)).toContain(promiseCopy.title);
      expect(whatItSays(settingsAssuranceTestID)).toContain(promiseCopy.lines.encrypted.title);
    });

    it('keeps the heading above that card, and the card above the rows', () => {
      const from = theScreenOf('privacyNext');

      expect(wherePrivacyDrew(settingsTitleTestID, from)).toBeLessThan(
        wherePrivacyDrew(settingsAssuranceTestID, from),
      );
      expect(wherePrivacyDrew(settingsAssuranceTestID, from)).toBeLessThan(
        wherePrivacyDrew(settingsRowsTestID, from),
      );
    });

    it('still says under each row what that row holds, in her own words', () => {
      expect(whatItSays(theRowsOfPrivacy[0] ?? '')).toContain(
        settingsCopy.settings.rows.answers.line,
      );
      expect(whatItSays(theRowsOfPrivacy[1] ?? '')).toContain(settingsCopy.settings.rows.lock.line);
    });
  });

  describe('her answers, read back to her', () => {
    beforeEach(async () => {
      await sheIsLookingAtPrivacy('yourAnswers');
    });

    it('stands all eight rows in one white card, with a hairline between two of them', () => {
      const card = theStyleOf(yourAnswersRowsTestID);

      expect(card.backgroundColor).toBe(colour.card);
      expect(card.borderRadius).toBe(radius.xl);
      expect(theRowsOnTheGlass(theRowsOfHerAnswers)).toEqual([...theRowsOfHerAnswers]);

      for (let at = 1; at < theRowsOfHerAnswers.length; at += 1) {
        expect(theStyleOf(rowGroupRuleTestID(yourAnswersRowsTestID, at)).backgroundColor).toBe(
          colour.line,
        );
      }
    });

    it('reads her own answer at the end of every row, and points the way on', () => {
      for (const row of yourAnswerRows) {
        const answer = theAnswerSheGave(row, herAnswers);

        expect(answer).toEqual(expect.any(String));
        expect(whatItSays(yourAnswerRowTestID(row))).toContain(answer);
        expect(privacyDrew(rowChevronTestID(yourAnswerRowTestID(row)))).toBe(true);
      }
    });

    it('draws no tile on these rows, because the prototype draws a symbol on none of them', () => {
      for (const row of theRowsOfHerAnswers) {
        expect(privacyDrew(rowTileTestID(row))).toBe(false);
      }
    });

    it('offers the way back as the round white button in the header', () => {
      const back = theStyleOf(yourAnswersBackTestID);

      expect(back.backgroundColor).toBe(colour.card);
      expect(back.borderRadius).toBe(radius.full);
      expect(Number(back.height)).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });
  });

  describe('the cycle length she came to change', () => {
    beforeEach(async () => {
      await sheIsLookingAtPrivacy('answerCycleLength');
    });

    it('offers the way back as the round white button in the header', () => {
      const back = theStyleOf(answerBackTestID);

      expect(back.backgroundColor).toBe(colour.card);
      expect(back.borderRadius).toBe(radius.full);
    });

    it('stands the lines under the control on one white card', () => {
      const card = theStyleOf(answerLinesTestID);

      expect(card.backgroundColor).toBe(colour.card);
      expect(card.borderRadius).toBe(radius.xl);
    });

    it('centres the question, which is how the prototype asks it', () => {
      expect(theTextStyleOf(answerQuestionTestID).textAlign).toBe('center');
      expect(whatItSays(answerQuestionTestID).length).toBeGreaterThan(0);
    });

    it('keeps the save as the wide pill in the colour that acts, at the foot of the screen', () => {
      const save = theStyleOf(answerSaveTestID);
      const from = theScreenOf('answerCycleLength');

      expect(save.backgroundColor).toBe(colour.accent);
      expect(save.borderRadius).toBe(radius.full);
      expect(wherePrivacyDrew(answerLinesTestID, from)).toBeLessThan(
        wherePrivacyDrew(answerSaveTestID, from),
      );
    });
  });

  describe('the two files she can take away', () => {
    beforeEach(async () => {
      await sheIsLookingAtPrivacy('export');
    });

    it('draws a white tile for each file, each one saying which file it is', () => {
      expect(theExportTiles).toHaveLength(2);

      for (const tile of theExportTiles) {
        const drawn = theStyleOf(exportTileTestID(tile));

        expect(drawn.backgroundColor).toBe(colour.card);
        expect(drawn.borderRadius).toBe(radius.xl);
      }

      expect(whatItSays(exportTileTestID('doctor'))).toContain(
        theWordFor('en', 'export.forADoctor'),
      );
      expect(whatItSays(exportTileTestID('application'))).toContain(
        theWordFor('en', 'export.forAnApplication'),
      );
    });

    it('says what the files hold on the card ground, under the two tiles', () => {
      const card = theStyleOf(exportMadeTestID);
      const from = theScreenOf('export');

      expect(card.backgroundColor).toBe(colour.card);
      expect(card.borderRadius).toBe(radius.xl);
      expect(wherePrivacyDrew(exportTileTestID('application'), from)).toBeLessThan(
        wherePrivacyDrew(exportHeldTestID, from),
      );
    });

    it('puts the lock beside the line that says nothing is sent anywhere', () => {
      expect(privacyDrew(lockLineIconTestID(exportLockLineTestID))).toBe(true);
      expect(whatItSays(exportLockLineTestID).length).toBeGreaterThan(0);
    });

    it('holds the one action at the foot, as the wide pill in the colour that acts', () => {
      const action = theStyleOf(exportActionTestID);
      const from = theScreenOf('export');

      expect(action.backgroundColor).toBe(colour.accent);
      expect(action.borderRadius).toBe(radius.full);
      expect(wherePrivacyDrew(exportLockLineTestID, from)).toBeLessThan(
        wherePrivacyDrew(exportActionTestID, from),
      );
    });

    it('opens with the way back in the header and the line about the two files under it', () => {
      const from = theScreenOf('export');

      expect(theStyleOf(exportBackTestID).borderRadius).toBe(radius.full);
      expect(wherePrivacyDrew(exportBackTestID, from)).toBeLessThan(
        wherePrivacyDrew(exportWhatTestID, from),
      );
    });
  });

  describe('delete everything', () => {
    beforeEach(async () => {
      await sheIsLookingAtPrivacy('delete');
    });

    it('stands its drawing in a white square over the heading', () => {
      const emblem = theStyleOf(deleteEmblemTestID);
      const from = theScreenOf('delete');

      expect(emblem.backgroundColor).toBe(colour.card);
      expect(emblem.borderRadius).toBe(radius.xxl);
      expect(wherePrivacyDrew(deleteEmblemTestID, from)).toBeLessThan(
        wherePrivacyDrew(deleteTitleTestID, from),
      );
    });

    it('stands the five things that go on one white card, each with its own mark', () => {
      const card = theStyleOf(deleteGoesTestID);

      expect(card.backgroundColor).toBe(colour.card);
      expect(card.borderRadius).toBe(radius.xl);
      expect(settingsCopy.delete.goes).toHaveLength(5);

      for (let at = 0; at < settingsCopy.delete.goes.length; at += 1) {
        expect(privacyDrew(goesMarkTestID(at))).toBe(true);
      }
    });

    it('holds the one action at the foot, with the way back quiet under it', () => {
      const action = theStyleOf(deleteActionTestID);
      const back = theStyleOf(deleteBackTestID);
      const from = theScreenOf('delete');

      expect(action.backgroundColor).toBe(colour.accent);
      expect(action.borderRadius).toBe(radius.full);
      expect(back.backgroundColor).toBeUndefined();
      expect(wherePrivacyDrew(deleteActionTestID, from)).toBeLessThan(
        wherePrivacyDrew(deleteBackTestID, from),
      );
    });
  });

  describe('the two drawings nothing on the glass answers', () => {
    it('keeps the earlier design of the same route in the stage and holds no screen to it', () => {
      const second = thePartsOfTheSecondDesign();

      expect(theSecondDesignOfTheRoute).toBe('settings');
      expect(second.filter((name) => name === 'Pressable')).toHaveLength(1);
      expect(thePrivacyDrawings).not.toContain(theSecondDesignOfTheRoute);
    });

    it('keeps the reminder in the stage, and nothing is built for the two parts it alone draws', () => {
      const reminder = thePartsOfTheReminderDrawing();
      const itsOwn = reminder.filter((part) =>
        ['SingleChoiceRow', 'ReminderPreview'].includes(part.name),
      );

      expect(theDrawingNothingIsBuiltFor).toBe('reminderSettings');
      expect(itsOwn.map((part) => part.name)).toEqual(['SingleChoiceRow', 'ReminderPreview']);
      expect(itsOwn.every((part) => part.builtUnder.length === 0)).toBe(true);
      expect(thePrivacyDrawings).not.toContain(theDrawingNothingIsBuiltFor);
    });
  });

  describe('the words of the two tiles', () => {
    it.each([...languages])('are written in %s, and never left empty', (language: Language) => {
      for (const key of theTileLabels) {
        expect(theWordFor(language, key)).toEqual(expect.any(String));
        expect((theWordFor(language, key) ?? '').length).toBeGreaterThan(0);
      }
    });

    it.each(['es', 'ru'] as const)(
      'say them in their own words rather than in English, in %s',
      (language) => {
        for (const key of theTileLabels) {
          expect(theWordFor(language, key)).not.toBe(theWordFor('en', key));
        }
      },
    );
  });
});
