import { join } from 'node:path';

import { tabTestID } from '@emi/ui';
import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen as routedScreen } from 'expo-router/testing-library';

import { type Language, catalogueOf, languages } from '../../src/language';
import { deleteScreenTestID } from '../../src/features/settings/DeleteEverything';
import { exportScreenTestID } from '../../src/features/export/ExportScreen';
import {
  SettingsScreen,
  settingsAnswersTestID,
  settingsDeleteTestID,
  settingsExportTestID,
  settingsLockTestID,
  settingsRowTestID,
  settingsRows,
  settingsScreenTestID,
  settingsTitleTestID,
} from '../../src/features/settings/SettingsScreen';
import { settingsCopy } from '../../src/features/settings/copy';
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
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
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
const theRowPrefix = settingsAnswersTestID.slice(0, -'answers'.length);

/**
 * Which built row answers for each row the drawing places, in the drawing's own order.
 *
 * A row with nothing under `builtUnder` is a row this step leaves out. The reminder is the only
 * one: it is milestone 11 of the design, it waits for a device, and the drawing stays the record
 * of where it goes.
 */
interface DrawnRow {
  /** Where the drawing sends the row, or null where it sends it nowhere. */
  readonly to: string | null;
  readonly builtUnder: readonly string[];
}

const theRowsOfTheDrawing: readonly DrawnRow[] = [
  { to: 'yourAnswers', builtUnder: [settingsAnswersTestID] },
  { to: 'reminderSettings', builtUnder: [] },
  { to: null, builtUnder: [settingsLockTestID] },
  { to: 'export', builtUnder: [settingsExportTestID] },
  { to: 'delete', builtUnder: [settingsDeleteTestID] },
];

const theRowsThisStepBuilds = theRowsOfTheDrawing.filter((row) => row.builtUnder.length > 0);

const theRowsThisStepLeavesOut = theRowsOfTheDrawing.filter((row) => row.builtUnder.length === 0);

function asPart(row: DrawnRow): Part {
  const name = row.to === null ? 'the row it sends nowhere' : `the row it sends to ${row.to}`;

  return { builtUnder: row.builtUnder, name };
}

/**
 * The heading of the drawing and the rows it names as parts, with the reminder taken out.
 *
 * The drawing carries a line of prose and the dock after the rows. Neither is this screen's to
 * draw: the prose is the note the mockups stage wrote about itself, and the dock is drawn by the
 * navigator around the screen rather than by the screen.
 */
function theHeadingAndTheRowsOfTheDrawing(): Part[] {
  const [heading] = thePartsOfTheMockup('privacyNext');

  if (heading === undefined) {
    throw new Error('the drawing of Privacy places no part at all');
  }

  return [heading, ...theRowsThisStepBuilds.map(asPart)];
}

/** Her phone with one period on it, so Privacy is reached from a product that has her data in it. */
async function herPhoneIsSetUp(): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, [
    aBleedingDay(dayOf(new Date('2026-05-09T08:00:00.000Z'))),
    aBleedingDay(dayOf(new Date('2026-05-10T08:00:00.000Z'))),
    aBleedingDay(dayOf(new Date('2026-05-11T08:00:00.000Z'))),
  ]);
}

async function sheOpensPrivacyOnItsOwn(): Promise<void> {
  await render(
    <OnAPhone>
      <SettingsScreen
        onBack={() => undefined}
        onDelete={() => undefined}
        onExport={() => undefined}
      />
    </OnAPhone>,
  );
}

async function sheOpensEmiAndWalksToPrivacy(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await fireEvent.press(routedScreen.getByTestId(tabTestID(theColumnThatOpensIt)));
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(routedScreen.getByTestId(testID));
}

function theRowsSheReads(): string[] {
  return theIdentifiersDrawn().filter((identifier) => identifier.startsWith(theRowPrefix));
}

function theWordsIn(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

describe('every row of Privacy is at least 44 points and each one opens what it names', () => {
  describe('the drawing the screen is held to', () => {
    it('places five rows, and sends each of them where this test says it does', () => {
      expect(theRowsOfTheMockup('privacyNext')).toEqual(
        theRowsOfTheDrawing.map(({ to }) => ({ to })),
      );
    });

    it('leaves one row for this step to skip, and it is the reminder', () => {
      expect(theRowsThisStepLeavesOut.map(({ to }) => to)).toEqual(['reminderSettings']);
    });

    it('leaves four rows for this step to build, which is what the screen declares', () => {
      expect(theRowsThisStepBuilds).toHaveLength(4);
      expect([...settingsRows]).toEqual(['answers', 'lock', 'export', 'delete']);
    });
  });

  describe('the screen she reads', () => {
    beforeEach(async () => {
      await sheOpensPrivacyOnItsOwn();
    });

    it('answers for the heading and for every row of the drawing but the reminder', () => {
      expect(partsMissing(theHeadingAndTheRowsOfTheDrawing(), theIdentifiersDrawn())).toEqual([]);
    });

    it('draws those four rows and no fifth, in the order the drawing places them', () => {
      expect(theRowsSheReads()).toEqual(settingsRows.map(settingsRowTestID));
    });

    it('says under the lock, the export and the delete what each of them does', () => {
      expect(theWordsIn(settingsLockTestID)).toContain(settingsCopy.settings.rows.lock.line);
      expect(theWordsIn(settingsExportTestID)).toContain(settingsCopy.settings.rows.export.line);
      expect(theWordsIn(settingsDeleteTestID)).toContain(settingsCopy.settings.rows.delete.line);
    });

    it('says nothing under her answers, because the screen behind it is not built', () => {
      expect(theWordsIn(settingsAnswersTestID)).toBe(settingsCopy.settings.rows.answers.lead);
    });

    it('draws her answers as a row that is there and cannot be used yet', () => {
      expect(screen.getByTestId(settingsAnswersTestID).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('keeps the heading above every row', () => {
      const drawn = theIdentifiersDrawn();

      expect(drawn.indexOf(settingsTitleTestID)).toBeLessThan(drawn.indexOf(settingsAnswersTestID));
    });
  });

  describe('the size of every row', () => {
    beforeEach(async () => {
      await sheOpensPrivacyOnItsOwn();
    });

    it('is at least 44 points on both axes, and the failure names any that is not', () => {
      const rows = settingsRows.map((row) => screen.getByTestId(settingsRowTestID(row)));

      expect(rows).toHaveLength(4);
      expect(controlsTooSmallToPress(rows)).toEqual([]);
    });
  });

  describe('what each row opens', () => {
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

    it('is reached from the fourth column of the dock', async () => {
      await sheOpensEmiAndWalksToPrivacy();

      expect(routedScreen.getByTestId(settingsScreenTestID)).toBeTruthy();
    });

    it('leaves her on the screen that makes the two files when she presses Export', async () => {
      await sheOpensEmiAndWalksToPrivacy();
      await shePresses(settingsExportTestID);

      expect(routedScreen.getByTestId(exportScreenTestID)).toBeTruthy();
    });

    it('leaves her on the screen that deletes everything when she presses it', async () => {
      await sheOpensEmiAndWalksToPrivacy();
      await shePresses(settingsDeleteTestID);

      expect(routedScreen.getByTestId(deleteScreenTestID)).toBeTruthy();
    });

    it('leaves her where she is when she presses her answers, and opens nothing', async () => {
      await sheOpensEmiAndWalksToPrivacy();
      await shePresses(settingsAnswersTestID);

      expect(routedScreen.getByTestId(settingsScreenTestID)).toBeTruthy();
      expect(routedScreen.queryByTestId(exportScreenTestID)).toBeNull();
      expect(routedScreen.queryByTestId(deleteScreenTestID)).toBeNull();
    });
  });

  describe('the words of the four rows, in each of the three languages', () => {
    const theKeysOfTheRows = [
      'settings.settings.answers',
      'settings.settings.lock',
      'settings.settings.lockLine',
      'settings.settings.export',
      'settings.settings.exportLine',
      'settings.settings.delete',
      'settings.settings.deleteLine',
    ] as const;

    it.each([...languages])('holds a word for every one of them, in %s', (language: Language) => {
      const catalogue = catalogueOf(language);

      for (const key of theKeysOfTheRows) {
        expect(catalogue[key]).toEqual(expect.any(String));
        expect(String(catalogue[key]).length).toBeGreaterThan(0);
      }
    });

    it.each(['es', 'ru'] as const)(
      'says them in its own words rather than in English, in %s',
      (language) => {
        const translated = theKeysOfTheRows.filter(
          (key) => catalogueOf(language)[key] !== catalogueOf('en')[key],
        );

        expect(translated).toEqual([...theKeysOfTheRows]);
      },
    );
  });
});
