import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { type Language, type Words, catalogueOf, languages } from '../../src/language';
import { dayTestID } from '../../src/features/calendar/CycleMonth';
import { ordinal } from '../../src/features/forecast/copy';
import { editPeriodChangeTestID } from '../../src/features/calendar/PeriodRangePicker';
import { dayParameter } from '../../src/features/calendar/askedMonth';
import { dayRefusedLineTestID, dayRefusedTitleTestID } from '../../src/features/log/DayRefused';
import { flowOptionTestID } from '../../src/features/log/FlowPicker';
import { LogSheet } from '../../src/features/log/LogSheet';
import { logFlowSavedTestID } from '../../src/features/log/LogFlow';
import {
  unexpectedBleedingLineTestID,
  unexpectedBleedingMarkTestID,
} from '../../src/features/log/UnexpectedBleeding';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { textIn } from '../fixtures/renderedText';
import {
  herPhoneHoldsAPeriodOfFourDays,
  theDaySheStopped,
  theDaysEmiHolds,
  theDaysHerPhoneHoldsIn,
  theLeadSheReads,
  theMonthSheCorrects,
  whenSheOpensEmi,
} from '../fixtures/thePeriodSheCorrects';

import type { DayRecord } from '@emi/crypto';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The log and the period editor, in the voice `docs/design/voice.md` sets. They ask her how her
 * day was, they say what a mark does rather than reassuring her about it, and they talk about what
 * she has rather than about what Emi holds.
 *
 * Every sentence is written out here rather than read off the catalogue it checks, because a
 * sentence read off the thing it is holding moves with it and catches nothing.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The length she gave at the first run, which is all the forecast has before a cycle completes. */
const sheSaidHerCycleRuns = 28;

/** What the flow screen says, before and after she marks a bleed as not her period. */
const theFlowScreenSays = {
  title: "How's your flow today?",
  saved: 'Saved on your phone.',
  invitation: "Bleeding that isn't your period? Log it here, and we'll keep an eye on the pattern.",
  marked: "Saved to your record. It won't count as the start of a cycle.",
};

/** What the sheet of symptoms and measurements says. */
const theSheetSays = {
  energy: "How's your energy?",
  okay: 'Okay',
  temperature: 'Take it before you get up.',
  weight: 'Once a day is plenty.',
  noMatch: (query: string): string => `No symptoms match ${query}`,
};

/** What she reads where a day cannot be logged at all. */
const theRefusalSays = {
  notADay: { title: "That's not a day", line: "That date isn't in the calendar." },
  notYet: {
    title: 'Not yet',
    line: "That day hasn't happened yet. You can log today or any day before it.",
  },
};

/** What the period editor says above and below the month. */
const theEditorSays = {
  lead: (days: number, date: string): string =>
    `Tap the days you bled. You have ${days} days marked, from the ${date}.`,
  leadWithNoDay: 'Tap the days you bled. Nothing is marked this month yet.',
  noDayLeft: 'A period needs at least one day. Tap a day you bled.',
  added: (days: string): string => `Added ${days}.`,
  removed: (days: string): string => `Removed ${days}.`,
};

/** Every key this step rewrites, with the English it holds, so the catalogue is read whole. */
const theWordsUnderTheirKeys: Readonly<Record<string, string>> = {
  'calendar.editPeriod.added': 'Added {days}.',
  'calendar.editPeriod.leadWithNoDay': theEditorSays.leadWithNoDay,
  'calendar.editPeriod.noDayLeft': theEditorSays.noDayLeft,
  'calendar.editPeriod.removed': 'Removed {days}.',
  'log.day.notADay.line': theRefusalSays.notADay.line,
  'log.day.notADay.title': theRefusalSays.notADay.title,
  'log.day.notYet.line': theRefusalSays.notYet.line,
  'log.day.notYet.title': theRefusalSays.notYet.title,
  'log.energy.heading': theSheetSays.energy,
  'log.energy.name.3': theSheetSays.okay,
  'log.flow.saved': theFlowScreenSays.saved,
  'log.flow.title': theFlowScreenSays.title,
  'log.sheet.noMatch': 'No symptoms match {query}',
  'log.temperature.hint': theSheetSays.temperature,
  'log.unexpected.invitation': theFlowScreenSays.invitation,
  'log.unexpected.marked': theFlowScreenSays.marked,
  'log.weight.hint': theSheetSays.weight,
};

/** The one line of these screens that counts, and both forms English writes it in. */
const theLeadUnderItsKey: Readonly<Record<string, readonly string[]>> = {
  'calendar.editPeriod.lead': [
    'Tap the days you bled. You have {count} day marked, from {date}.',
    'Tap the days you bled. You have {count} days marked, from {date}.',
  ],
};

const theKeysOfTheseScreens: readonly string[] = [
  ...Object.keys(theWordsUnderTheirKeys),
  ...Object.keys(theLeadUnderItsKey),
];

/** How each language writes the second person, which is who these two screens are talking to. */
const howEachLanguageSaysYou: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(you|your)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(tu|tus|tú|te|ti)(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(вы|ваш|ваши|вас|вам)/iu,
};

/** How many forms of a counted line each language writes, which is its own plural rule. */
const theFormsEachLanguageCounts: Readonly<Record<Language, number>> = { en: 2, es: 2, ru: 3 };

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

/** One language's catalogue, read by key rather than by type, so a new key needs no cast. */
function theCatalogueOf(language: Language): Readonly<Record<string, Words>> {
  return Object.fromEntries(Object.entries(catalogueOf(language)));
}

function theWordsOfTheseScreensIn(
  language: Language,
  keys: readonly string[] = theKeysOfTheseScreens,
): string[] {
  const catalogue = theCatalogueOf(language);

  return keys.flatMap((key) => formsOf(catalogue[key] ?? ''));
}

/** One date as she reads it in English, which is the form the editor writes into its lines. */
function theDateOfTheMonth(day: string): string {
  return ordinal(Number(day.slice(8, 10)));
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** Her month, with six cycles behind her, so today is the middle of it and not near a period. */
function herSixCyclesAndThisOne(): DayRecord[] {
  const thisCycleStarted = addDays(today, -13);
  const records: DayRecord[] = [];

  for (let back = 6; back >= 0; back -= 1) {
    const started = addDays(thisCycleStarted, -back * sheSaidHerCycleRuns);

    for (let day = 0; day < 4; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  return records;
}

async function sheOpens(at: string): Promise<{ readonly pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: at });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

const thePickerAt = (month: string): string =>
  `/calendar/period?${dayParameter}=${encodeURIComponent(month)}`;

/** A month she recorded nothing in, so the editor opens it holding no day of hers. */
const theMonthWithNoneOfHerDays = '2026-06-01';

describe('she logs bleeding that is not her period in plain words', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the flow she opens the log on', () => {
    beforeEach(async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCyclesAndThisOne());
    });

    it('asks her how her flow is today, rather than labelling the picker', async () => {
      await sheOpens('/log');

      expect(screen.getByText(theFlowScreenSays.title)).toBeTruthy();
      expect(screen.queryByText('Your flow')).toBeNull();
    });

    it('tells her the flow she picked is saved on her own phone', async () => {
      await sheOpens('/log');

      await shePresses(flowOptionTestID('light'));

      expect(whatItSays(logFlowSavedTestID)).toBe(theFlowScreenSays.saved);
    });

    it('asks her about bleeding that is not her period, in words she would use', async () => {
      await sheOpens('/log');

      await shePresses(flowOptionTestID('spotting'));

      expect(whatItSays(unexpectedBleedingLineTestID)).toBe(theFlowScreenSays.invitation);
    });

    it('tells her the mark is in her record, and that no cycle starts from it', async () => {
      await sheOpens('/log');
      await shePresses(flowOptionTestID('light'));

      await shePresses(unexpectedBleedingMarkTestID);

      expect(whatItSays(unexpectedBleedingLineTestID)).toBe(theFlowScreenSays.marked);
    });

    it('still reads the mark back to her when she opens the day again', async () => {
      await sheOpens('/log');
      await shePresses(flowOptionTestID('light'));
      await shePresses(unexpectedBleedingMarkTestID);

      await sheOpens(`/day/${today}`);

      expect(whatItSays(unexpectedBleedingLineTestID)).toBe(theFlowScreenSays.marked);
    });
  });

  describe('the sheet she picks her symptoms and her measurements on', () => {
    /** The sheet on its own, which is how every test of it stands it up: no route reaches it yet. */
    async function sheOpensTheSheet(): Promise<void> {
      await render(<LogSheet day={today} onSave={() => undefined} />);
    }

    it('asks her how her energy is, and calls the middle of the scale okay', async () => {
      await sheOpensTheSheet();

      expect(
        within(screen.getByTestId('energy-scale')).getByText(theSheetSays.energy),
      ).toBeTruthy();

      await shePresses('energy-step-3');

      expect(whatItSays('energy-chosen')).toBe(theSheetSays.okay);
    });

    it('tells her when to take her temperature, and how often to weigh herself', async () => {
      await sheOpensTheSheet();

      expect(whatItSays('temperature-hint')).toBe(theSheetSays.temperature);
      expect(whatItSays('weight-hint')).toBe(theSheetSays.weight);
    });

    it('says no symptoms match what she typed, in the plural she typed it in', async () => {
      await sheOpensTheSheet();

      await fireEvent.changeText(screen.getByTestId('symptom-search'), 'hangover');

      expect(whatItSays('no-symptom-found')).toBe(theSheetSays.noMatch('hangover'));
    });
  });

  describe('a day the log cannot take', () => {
    beforeEach(async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCyclesAndThisOne());
    });

    it('tells her an address that is not a date is not a day', async () => {
      await sheOpens('/day/2026-02-30');

      expect(whatItSays(dayRefusedTitleTestID)).toBe(theRefusalSays.notADay.title);
      expect(whatItSays(dayRefusedLineTestID)).toBe(theRefusalSays.notADay.line);
    });

    it('tells her a day ahead of her has not happened yet, and what she can log instead', async () => {
      await sheOpens(`/day/${addDays(today, 2)}`);

      expect(whatItSays(dayRefusedTitleTestID)).toBe(theRefusalSays.notYet.title);
      expect(whatItSays(dayRefusedLineTestID)).toBe(theRefusalSays.notYet.line);
    });
  });

  describe('the period she corrects on the calendar', () => {
    beforeEach(async () => {
      jest.setSystemTime(whenSheOpensEmi());
      await herPhoneHoldsAPeriodOfFourDays(whenSheOpensEmi());
    });

    it('asks her to tap the days she bled, and says how many of them she has', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      const held = theDaysEmiHolds();

      expect(theLeadSheReads()).toBe(
        theEditorSays.lead(held.length, theDateOfTheMonth(String(held[0]))),
      );
    });

    it('tells her nothing is marked in a month she recorded nothing in', async () => {
      expect(theDaysHerPhoneHoldsIn(theMonthWithNoneOfHerDays)).toEqual([]);

      await sheOpens(thePickerAt(theMonthWithNoneOfHerDays));

      expect(theLeadSheReads()).toBe(theEditorSays.leadWithNoDay);
    });

    it('asks her for at least one day when she takes the last of them off', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));

      for (const day of theDaysEmiHolds()) {
        await shePresses(dayTestID(day));
      }

      expect(whatItSays(editPeriodChangeTestID)).toBe(theEditorSays.noDayLeft);
    });

    it('names the day she added, and the day she took off, without telling her she did it', async () => {
      await sheOpens(thePickerAt(theMonthSheCorrects));
      const [first] = theDaysEmiHolds();

      await shePresses(dayTestID(theDaySheStopped()));

      expect(whatItSays(editPeriodChangeTestID)).toBe(
        theEditorSays.added(`the ${theDateOfTheMonth(theDaySheStopped())}`),
      );

      await shePresses(dayTestID(String(first)));

      expect(whatItSays(editPeriodChangeTestID)).toContain(
        theEditorSays.removed(`the ${theDateOfTheMonth(String(first))}`),
      );
    });
  });

  describe('every word of these two screens', () => {
    it('is the word the catalogue holds under its key, in English', () => {
      for (const [key, said] of Object.entries(theWordsUnderTheirKeys)) {
        expect({ key, said: theCatalogueOf('en')[key] }).toEqual({ key, said });
      }

      for (const [key, forms] of Object.entries(theLeadUnderItsKey)) {
        expect({ key, forms: theWordsOfTheseScreensIn('en', [key]) }).toEqual({
          key,
          forms: [...forms],
        });
      }
    });

    it('is written in all three languages, and each one talks to her as you', () => {
      for (const language of languages) {
        const missing = theKeysOfTheseScreens.filter(
          (key) => theWordsOfTheseScreensIn(language, [key]).join('').length === 0,
        );

        expect({ language, missing }).toEqual({ language, missing: [] });
        expect({
          language,
          asYou: howEachLanguageSaysYou[language].test(
            theWordsOfTheseScreensIn(language).join('\n'),
          ),
        }).toEqual({ language, asYou: true });
      }

      expect(languages.length).toBe(3);
    });

    it('counts the days of her period in the forms each language needs', () => {
      for (const language of languages) {
        expect({
          language,
          forms: theWordsOfTheseScreensIn(language, ['calendar.editPeriod.lead']).length,
        }).toEqual({ language, forms: theFormsEachLanguageCounts[language] });
      }
    });

    it('names Emi nowhere, because the log talks to her and not about itself', () => {
      for (const language of languages) {
        const naming = theKeysOfTheseScreens.filter((key) =>
          theWordsOfTheseScreensIn(language, [key]).join('\n').includes('Emi'),
        );

        expect({ language, naming }).toEqual({ language, naming: [] });
      }
    });
  });
});
