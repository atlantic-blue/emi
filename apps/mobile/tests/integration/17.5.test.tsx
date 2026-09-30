import { join } from 'node:path';

import {
  type Feeling,
  type Focus,
  type Goal,
  type ProfileRecord,
  type Regularity,
  feelingValues,
  focusValues,
  goalValues,
  regularityValues,
} from '@emi/crypto';
import type { SymptomGroup } from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { yearTestID } from '../../src/components/YearWheel';
import {
  type AnswerGivenAgain,
  changeProfileAnswer,
  profileRow,
  readProfile,
} from '../../src/data/profileRepository';
import {
  answerBackTestID,
  answerCancelTestID,
  answerHeldTestID,
  answerQuestionTestID,
  answerSaveTestID,
  answerScreenTestID,
  answerTitleTestID,
} from '../../src/features/settings/AnswerScreen';
import { changeFeelingTestID } from '../../src/features/settings/ChangeFeeling';
import { changeFocusTestID } from '../../src/features/settings/ChangeFocus';
import { changeGoalTestID } from '../../src/features/settings/ChangeGoals';
import { changeNameFieldTestID } from '../../src/features/settings/ChangeName';
import {
  answerFewerDaysTestID,
  answerMoreDaysTestID,
} from '../../src/features/settings/ChangePeriodLength';
import { changeRegularityTestID } from '../../src/features/settings/ChangeRegularity';
import { settingsAnswersTestID } from '../../src/features/settings/SettingsScreen';
import {
  yourAnswerRowTestID,
  yourAnswersBackTestID,
  yourAnswersScreenTestID,
} from '../../src/features/settings/YourAnswers';
import {
  type YourAnswerRow,
  theAnswerSheGave,
  theScreenEachRowOpens,
  yourAnswerRows,
} from '../../src/features/settings/herAnswers';
import { goalsChosenLabel, yourAnswersCopy } from '../../src/features/settings/copy';
import { homeGreetingTestID } from '../../src/features/home/HomeScreen';
import { greeting } from '../../src/features/home/copy';
import { logFlowGroupsTestID } from '../../src/features/log/LogFlow';
import { symptomGroupTestID } from '../../src/features/log/SymptomGroup';
import {
  feelingLabels,
  firstRunCopy,
  focusNamesInASentence,
  periodLengthDaysLabel,
  regularityLabels,
} from '../../src/features/onboarding/copy';
import { textIn } from '../fixtures/renderedText';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aProfileRecord } from '../fixtures/profileRecord';
import { herProfileVault, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { aBleedingDay, dayOf, herDatabase, herPhoneHoldsTheseAnswers } from '../fixtures/herPhone';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** The column of the dock that opens Privacy, named by its route rather than counted to. */
const theColumnThatOpensIt = 'settings/index';

/** The column of the dock that opens the screen she opens. */
const theColumnSheOpens = 'index';

/** The column of the dock that opens the log sheet, which her focus answer puts in order. */
const theColumnThatLogs = 'log/index';

/** Every answer she gave at the first run, which is the phone each walk below starts from. */
const herFirstRun = aProfileRecord({
  name: 'Maria',
  birthYear: 1994,
  cycleLengthDays: 29,
  periodLengthDays: 5,
  regularity: 'moves',
  feeling: 'understand',
  goals: ['forecast', 'symptoms'],
  focus: ['sleep', 'pain'],
});

/** Every answer but the cycle length left out, which is the phone a woman who skipped them has. */
const sheSkippedThemAll = aProfileRecord({
  name: undefined,
  birthYear: undefined,
  periodLengthDays: undefined,
  regularity: undefined,
  feeling: undefined,
  goals: undefined,
  focus: undefined,
});

/** The three days of her last period, so the screen she opens has a cycle to draw. */
const herLastPeriod = [
  aBleedingDay(dayOf(new Date('2026-05-09T08:00:00.000Z'))),
  aBleedingDay(dayOf(new Date('2026-05-10T08:00:00.000Z'))),
  aBleedingDay(dayOf(new Date('2026-05-11T08:00:00.000Z'))),
];

const herNewName = 'Marta';
const herNewBirthYear = 1988;
const herNewPeriodLength = 7;
const herNewRegularity: Regularity = 'regular';
const herNewFeeling: Feeling = 'fine';
const theGoalSheAdds: Goal = 'fertileWindow';
const theGroupSheAdds: Focus = 'energy';

/** The goals she is left with: the two she gave and the one she adds, in the order she pressed. */
const herNewGoals: readonly Goal[] = ['forecast', 'symptoms', theGoalSheAdds];

/**
 * Her groups afterwards. A group she presses goes on the end, because the order is the answer.
 *
 * Energy rather than mood, because the log sheet draws the groups she did not name under the ones
 * she did, in the order of the catalogue, and mood is the first of those. A sheet that never read
 * her new answer would draw sleep, pain and mood, which is what an answer of mood looks like once
 * it is saved, so the case would pass having proved nothing.
 */
const herNewFocus: readonly Focus[] = ['sleep', 'pain', theGroupSheAdds];

/** How many goals the screen offers, which is what the row counts her chosen ones against. */
const theGoalsOffered = 4;

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheTypes(testID: string, typed: string): Promise<void> {
  await fireEvent.changeText(screen.getByTestId(testID), typed);
}

/** How she changes one answer on the screen that asks it again, and what the change is worth. */
interface AnAnswerSheChanges {
  readonly row: Exclude<YourAnswerRow, 'cycleLength'>;
  /** The question the first run asked, which this screen asks in the same words or not at all. */
  readonly question: string;
  /** What she does on the screen the row opens, which is one press unless the answer needs more. */
  readonly change: () => Promise<void>;
  /** What her answers read on that row afterwards, in the words the screen reads them in. */
  readonly reads: string;
  /** The same, for a woman who skipped the question, whose answer starts from nothing. */
  readonly readsWhenSkipped: string;
  /**
   * The controls this screen adds to the three the frame carries, measured against the tap floor.
   * The name screen adds none: its field takes its width from the row it stands in, and the
   * fixture measures a width a control declares for itself.
   */
  readonly controls: readonly string[];
  /** What the sealed row carries for this answer, read off the opened profile. */
  readonly sealed: (profile: ProfileRecord) => unknown;
  /** The one field of the profile her save replaces, which the store merges into the held row. */
  readonly writesAs: AnswerGivenAgain;
  readonly becomes: unknown;
  readonly becomesWhenSkipped: unknown;
}

const theSevenSheChanges: readonly AnAnswerSheChanges[] = [
  {
    row: 'name',
    question: firstRunCopy.name.title,
    change: async () => {
      await sheTypes(changeNameFieldTestID, herNewName);
    },
    reads: herNewName,
    readsWhenSkipped: herNewName,
    controls: [],
    sealed: (profile) => profile.name,
    writesAs: { name: herNewName },
    becomes: herNewName,
    becomesWhenSkipped: herNewName,
  },
  {
    row: 'birthYear',
    question: firstRunCopy.birthYear.title,
    change: async () => {
      await shePresses(yearTestID(herNewBirthYear));
    },
    reads: String(herNewBirthYear),
    readsWhenSkipped: String(herNewBirthYear),
    controls: [yearTestID(herNewBirthYear), yearTestID(1994)],
    sealed: (profile) => profile.birthYear,
    writesAs: { birthYear: herNewBirthYear },
    becomes: herNewBirthYear,
    becomesWhenSkipped: herNewBirthYear,
  },
  {
    row: 'periodLength',
    question: firstRunCopy.periodLength.title,
    change: async () => {
      await shePresses(answerMoreDaysTestID);
      await shePresses(answerMoreDaysTestID);
    },
    reads: periodLengthDaysLabel(herNewPeriodLength),
    readsWhenSkipped: periodLengthDaysLabel(herNewPeriodLength),
    controls: [answerFewerDaysTestID, answerMoreDaysTestID],
    sealed: (profile) => profile.periodLengthDays,
    writesAs: { periodLengthDays: herNewPeriodLength },
    becomes: herNewPeriodLength,
    becomesWhenSkipped: herNewPeriodLength,
  },
  {
    row: 'regularity',
    question: firstRunCopy.regularity.title,
    change: async () => {
      await shePresses(changeRegularityTestID(herNewRegularity));
    },
    reads: regularityLabels[herNewRegularity],
    readsWhenSkipped: regularityLabels[herNewRegularity],
    controls: regularityValues.map(changeRegularityTestID),
    sealed: (profile) => profile.regularity,
    writesAs: { regularity: herNewRegularity },
    becomes: herNewRegularity,
    becomesWhenSkipped: herNewRegularity,
  },
  {
    row: 'feeling',
    question: firstRunCopy.feeling.title,
    change: async () => {
      await shePresses(changeFeelingTestID(herNewFeeling));
    },
    reads: feelingLabels[herNewFeeling],
    readsWhenSkipped: feelingLabels[herNewFeeling],
    controls: feelingValues.map(changeFeelingTestID),
    sealed: (profile) => profile.feeling,
    writesAs: { feeling: herNewFeeling },
    becomes: herNewFeeling,
    becomesWhenSkipped: herNewFeeling,
  },
  {
    row: 'goals',
    question: firstRunCopy.goals.title,
    change: async () => {
      await shePresses(changeGoalTestID(theGoalSheAdds));
    },
    reads: goalsChosenLabel(herNewGoals.length, theGoalsOffered),
    readsWhenSkipped: goalsChosenLabel(1, theGoalsOffered),
    controls: goalValues.map(changeGoalTestID),
    sealed: (profile) => profile.goals,
    writesAs: { goals: herNewGoals },
    becomes: herNewGoals,
    becomesWhenSkipped: [theGoalSheAdds],
  },
  {
    row: 'focus',
    question: firstRunCopy.focus.title,
    change: async () => {
      await shePresses(changeFocusTestID(theGroupSheAdds));
    },
    reads: focusNamesInASentence(herNewFocus),
    readsWhenSkipped: focusNamesInASentence([theGroupSheAdds]),
    controls: focusValues.map(changeFocusTestID),
    sealed: (profile) => profile.focus,
    writesAs: { focus: herNewFocus },
    becomes: herNewFocus,
    becomesWhenSkipped: [theGroupSheAdds],
  },
];

/** The five answers nothing marks for her, which are the ones Save has to wait on. */
const theAnswersThatStartEmpty = ['birthYear', 'regularity', 'feeling', 'goals', 'focus'] as const;

function theAnswer(row: YourAnswerRow): AnAnswerSheChanges {
  const found = theSevenSheChanges.find((answer) => answer.row === row);

  if (found === undefined) {
    throw new Error(`nothing in this file says how she changes ${row}`);
  }

  return found;
}

async function herPhoneIsSetUp(profile: ProfileRecord = herFirstRun): Promise<void> {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  resetExpoSqlite();
  resetExpoSecureStore();
  await herPhoneHoldsTheseAnswers(whenSheOpensIt, profile, herLastPeriod);
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

/** From the screen she opens to her answers, by the dock, which is the way she would find them. */
async function sheOpensHerAnswers(): Promise<void> {
  await shePresses(tabTestID(theColumnThatOpensIt));
  await shePresses(settingsAnswersTestID);
}

async function sheOpensTheRow(row: YourAnswerRow): Promise<void> {
  await sheOpensHerAnswers();
  await shePresses(yourAnswerRowTestID(row));
}

/** The whole walk for one answer: open the row, change the answer, and save. */
async function sheChangesItAndSaves(answer: AnAnswerSheChanges): Promise<void> {
  await sheOpensTheRow(answer.row);
  await answer.change();
  await shePresses(answerSaveTestID);
}

function theRowReads(row: YourAnswerRow): string[] {
  return textIn(screen.getByTestId(yourAnswerRowTestID(row)));
}

async function sheGoesBackToTheScreenSheOpens(): Promise<void> {
  await shePresses(yourAnswersBackTestID);
  await shePresses(tabTestID(theColumnSheOpens));
}

/** Her answers, opened with the key the keychain holds and a handle nothing on screen is using. */
async function theSealedRow(): Promise<ProfileRecord> {
  const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

  if (held === undefined) {
    throw new Error('her phone holds no profile at all');
  }

  return held;
}

/** The groups she reads under the flow picker, in the order they are drawn down the glass. */
function theGroupsUnderTheFlow(): readonly string[] {
  return within(screen.getByTestId(logFlowGroupsTestID))
    .getAllByTestId(/^symptom-group-(?!.*-chips$)/)
    .map((section) => String(section.props.testID));
}

function named(groups: readonly SymptomGroup[]): readonly string[] {
  return groups.map(symptomGroupTestID);
}

/** Every plain row of the setting table, so a second copy of an answer has somewhere to be found. */
function thePlainSettings(): { key: string; value: string }[] {
  return herDatabase().all<{ key: string; value: string }>('SELECT key, value FROM setting');
}

describe('she changes any answer she gave and the screen that reads it follows', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('every row of her answers opens the question it names', () => {
    it('sends each of the eight to a screen of its own', () => {
      const addresses = yourAnswerRows.map((row) => theScreenEachRowOpens[row]);

      expect(addresses).toHaveLength(8);
      expect(new Set(addresses).size).toBe(8);
      expect(addresses.every((address) => address.startsWith('/settings/answers/'))).toBe(true);
    });

    it('says how she changes all seven that step 4 left, and no eighth', () => {
      expect(theSevenSheChanges.map((answer) => answer.row)).toEqual(
        yourAnswerRows.filter((row) => row !== 'cycleLength'),
      );
    });

    it.each(theSevenSheChanges)(
      'names the answer at the top and asks the question the first run asked, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp();
        await sheOpensTheApplication();
        await sheOpensTheRow(answer.row);

        expect(screen.getByTestId(answerScreenTestID)).toBeTruthy();
        expect(textIn(screen.getByTestId(answerTitleTestID))).toEqual([
          yourAnswersCopy.rows[answer.row],
        ]);
        expect(textIn(screen.getByTestId(answerQuestionTestID))).toEqual([answer.question]);
      },
    );

    /**
     * What the line says is held against the reading her answers give the same answer, so the two
     * screens cannot say her first run differently. The line is read here while she stands on the
     * screen, because the row she came from is left mounted and hidden behind it.
     */
    it.each(theSevenSheChanges)(
      'reads her own answer back to her before she changes it, for $row',
      async (answer: AnAnswerSheChanges) => {
        const gave = theAnswerSheGave(answer.row, herFirstRun);

        await herPhoneIsSetUp();
        await sheOpensTheApplication();
        await sheOpensHerAnswers();

        expect(theRowReads(answer.row)).toEqual([yourAnswersCopy.rows[answer.row], gave]);

        await shePresses(yourAnswerRowTestID(answer.row));

        expect(gave).toEqual(expect.any(String));
        expect(textIn(screen.getByTestId(answerHeldTestID)).join('')).toContain(String(gave));
      },
    );

    it.each(theSevenSheChanges)(
      'gives every control a thumb can hit the room a thumb needs, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp();
        await sheOpensTheApplication();
        await sheOpensTheRow(answer.row);

        const pressed = [
          answerBackTestID,
          answerCancelTestID,
          answerSaveTestID,
          ...answer.controls,
        ].map((testID) => screen.getByTestId(testID));

        expect(controlsTooSmallToPress(pressed)).toEqual([]);
      },
    );
  });

  describe('the walk she takes for each of the seven', () => {
    it.each(theSevenSheChanges)(
      'leaves her answers reading what she saved, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp();
        await sheOpensTheApplication();
        await sheChangesItAndSaves(answer);

        expect(screen.getByTestId(yourAnswersScreenTestID)).toBeTruthy();
        expect(screen.queryByTestId(answerScreenTestID)).toBeNull();
        expect(theRowReads(answer.row)).toEqual([yourAnswersCopy.rows[answer.row], answer.reads]);
      },
    );

    /**
     * Read with the key the keychain holds and a handle taken fresh, so nothing the screens are
     * still holding can answer for the row. This is the whole of what a save is worth: an answer
     * kept in the component would pass every case above it and be gone at the next launch.
     */
    it.each(theSevenSheChanges)(
      'leaves it in the sealed row rather than in anything the screen holds, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp();
        await sheOpensTheApplication();
        await sheChangesItAndSaves(answer);

        expect(answer.sealed(await theSealedRow())).toEqual(answer.becomes);
      },
    );

    it.each(theSevenSheChanges)(
      'raises the revision by one and keeps every other answer, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp();

        const before = profileRow(herDatabase());

        await sheOpensTheApplication();
        await sheChangesItAndSaves(answer);

        const after = profileRow(herDatabase());
        const held = await theSealedRow();

        expect(before?.revision).toBe(1);
        expect(after?.revision).toBe(2);
        expect(after?.id).toBe(before?.id);
        expect(held.cycleLengthDays).toBe(herFirstRun.cycleLengthDays);

        for (const other of theSevenSheChanges.filter((each) => each.row !== answer.row)) {
          expect(other.sealed(held)).toEqual(other.sealed(herFirstRun));
        }
      },
    );

    it.each(theSevenSheChanges)(
      'saves nothing when she takes the way out of the header, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp();
        await sheOpensTheApplication();
        await sheOpensTheRow(answer.row);
        await answer.change();
        await shePresses(answerCancelTestID);

        expect(screen.getByTestId(yourAnswersScreenTestID)).toBeTruthy();
        expect(profileRow(herDatabase())?.revision).toBe(1);
        expect(answer.sealed(await theSealedRow())).toEqual(answer.sealed(herFirstRun));
      },
    );
  });

  describe('the greeting on the screen she opens', () => {
    it('reads her new name, having read the old one before she changed it', async () => {
      await herPhoneIsSetUp();
      await sheOpensTheApplication();

      expect(textIn(screen.getByTestId(homeGreetingTestID))).toEqual([greeting('Maria')]);

      await sheChangesItAndSaves(theAnswer('name'));
      await sheGoesBackToTheScreenSheOpens();

      expect(textIn(screen.getByTestId(homeGreetingTestID))).toEqual([greeting(herNewName)]);
    });

    it('goes away for a woman who clears the field, because that is the answer she gave', async () => {
      await herPhoneIsSetUp();
      await sheOpensTheApplication();
      await sheOpensTheRow('name');
      await sheTypes(changeNameFieldTestID, '');
      await shePresses(answerSaveTestID);
      await sheGoesBackToTheScreenSheOpens();

      expect(screen.queryByTestId(homeGreetingTestID)).toBeNull();
      expect((await theSealedRow()).name).toBeUndefined();
    });
  });

  describe('the order of the log sheet, which her focus answer sets', () => {
    it('puts the group she added where she pressed it, under the two she had', async () => {
      await herPhoneIsSetUp();
      await sheOpensTheApplication();
      await shePresses(tabTestID(theColumnThatLogs));

      expect(theGroupsUnderTheFlow().slice(0, 2)).toEqual(
        named(herFirstRun.focus as readonly SymptomGroup[]),
      );

      await sheChangesItAndSaves(theAnswer('focus'));
      await shePresses(yourAnswersBackTestID);
      await shePresses(tabTestID(theColumnThatLogs));

      expect(theGroupsUnderTheFlow().slice(0, 3)).toEqual(
        named(herNewFocus as readonly SymptomGroup[]),
      );
    });
  });

  describe('a question she skipped at the first run', () => {
    it.each(theSevenSheChanges)(
      'is asked with nothing claimed and nothing marked, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp(sheSkippedThemAll);
        await sheOpensTheApplication();
        await sheOpensHerAnswers();

        expect(theRowReads(answer.row)).toEqual([yourAnswersCopy.rows[answer.row]]);

        await shePresses(yourAnswerRowTestID(answer.row));

        expect(screen.queryByTestId(answerHeldTestID)).toBeNull();
      },
    );

    it.each(theSevenSheChanges)(
      'can be given here for the first time, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp(sheSkippedThemAll);
        await sheOpensTheApplication();

        expect(answer.sealed(await theSealedRow())).toBeUndefined();

        await sheChangesItAndSaves(answer);

        expect(theRowReads(answer.row)).toEqual([
          yourAnswersCopy.rows[answer.row],
          answer.readsWhenSkipped,
        ]);
        expect(answer.sealed(await theSealedRow())).toEqual(answer.becomesWhenSkipped);
      },
    );

    /**
     * Five of the seven arrive with nothing marked, because nothing is chosen for her. Save waits
     * until she gives an answer, so a press cannot take the row from empty to a value she never
     * chose.
     */
    it.each(theAnswersThatStartEmpty)(
      'writes nothing when she saves without answering, for %s',
      async (row: YourAnswerRow) => {
        await herPhoneIsSetUp(sheSkippedThemAll);
        await sheOpensTheApplication();
        await sheOpensTheRow(row);
        await shePresses(answerSaveTestID);

        expect(screen.getByTestId(answerScreenTestID)).toBeTruthy();
        expect(profileRow(herDatabase())?.revision).toBe(1);
        expect(theAnswer(row).sealed(await theSealedRow())).toBeUndefined();
      },
    );
  });

  /**
   * The sealed row is the only place an answer lives, so the forecast and every screen read one
   * source. A plain copy in the setting table would be a second, and the two would disagree the
   * moment she changed one of them.
   */
  describe('the one row her answers live in', () => {
    it.each(theSevenSheChanges)(
      'is the only source, because the setting table holds no copy of it, for $row',
      async (answer: AnAnswerSheChanges) => {
        await herPhoneIsSetUp();
        await sheOpensTheApplication();
        await sheChangesItAndSaves(answer);

        const plain = thePlainSettings();
        const wrote = String(answer.becomes);

        expect(plain.length).toBeGreaterThan(0);
        expect(plain.map((row) => row.key)).not.toContain(answer.row);
        expect(plain.map((row) => row.value)).not.toContain(wrote);
        expect(plain.some((row) => row.value.includes(wrote))).toBe(false);
      },
    );

    it('carries her new name as an envelope and never as letters anybody can read', async () => {
      await herPhoneIsSetUp();
      await sheOpensTheApplication();
      await sheChangesItAndSaves(theAnswer('name'));

      const held = profileRow(herDatabase());

      expect(held?.payload[0]).toBe(1);
      expect(Buffer.from(held?.payload ?? new Uint8Array()).toString('utf8')).not.toContain(
        herNewName,
      );
    });
  });

  describe('all seven changed in one visit to her answers', () => {
    it('reads every one of them back, off one row whose revision rose seven times', async () => {
      await herPhoneIsSetUp();
      await sheOpensTheApplication();
      await sheOpensHerAnswers();

      for (const answer of theSevenSheChanges) {
        await shePresses(yourAnswerRowTestID(answer.row));
        await answer.change();
        await shePresses(answerSaveTestID);
      }

      const held = await theSealedRow();

      for (const answer of theSevenSheChanges) {
        expect(answer.sealed(held)).toEqual(answer.becomes);
        expect(theRowReads(answer.row)).toEqual([yourAnswersCopy.rows[answer.row], answer.reads]);
      }

      expect(profileRow(herDatabase())?.revision).toBe(1 + theSevenSheChanges.length);
      expect(held.cycleLengthDays).toBe(herFirstRun.cycleLengthDays);
    });
  });

  /**
   * A launch after the one she saved on. The changes are made through the one path a screen writes
   * by and the application is then started from nothing, so every row here is read off the phone
   * rather than out of anything a save left behind in the process.
   */
  describe('the launch after the one she changed them on', () => {
    it('reads every changed answer back on her answers', async () => {
      await herPhoneIsSetUp();

      for (const answer of theSevenSheChanges) {
        changeProfileAnswer(herDatabase(), herProfileVault(), {
          answer: answer.writesAs,
          now: whenSheOpensIt,
        });
      }

      await sheOpensTheApplication();
      await sheOpensHerAnswers();

      for (const answer of theSevenSheChanges) {
        expect(theRowReads(answer.row)).toEqual([yourAnswersCopy.rows[answer.row], answer.reads]);
      }
    });
  });
});
