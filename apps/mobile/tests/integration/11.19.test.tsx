import { join } from 'node:path';

import { MINIMUM_TAP_TARGET, space, stroke } from '@emi/tokens';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import {
  earlierMonthTestID,
  laterMonthTestID,
  monthHeadingTestID,
  monthTestID,
} from '../../src/features/onboarding/Calendar';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { monthLabel } from '../../src/features/onboarding/days';
import { english } from '../../src/language/english';
import { type Language, languages } from '../../src/language/language';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import type { Catalogue, WordKey } from '../../src/language/words';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herDatabase } from '../fixtures/herPhone';
import { type Control, controlsTooSmallToPress } from '../fixtures/tapTargets';
import {
  type Box,
  type MeasuredWordRow,
  type WordCell,
  type Phone,
  aSmallIPhone,
  anIPhone16,
  theRowOfWords,
  toATenthOfAPoint,
} from '../fixtures/theWidthOfARow';
import { theLettersWithNoGlyph, theWidthOfWords } from '../fixtures/theWidthOfWords';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** The phone the pill was seen touching the title on, and the narrowest glass Emi is built for. */
const bothPhones: readonly Phone[] = [anIPhone16, aSmallIPhone];

/** Points. What a pill puts round its own words: the padding each side and the line it carries. */
const thePillAroundTheWords = 2 * space.spaceMd + 2 * stroke.hairline;

/** The year the calendar draws beside the month, which is part of the title and of its width. */
const theYearBeside = '2026';

const theCatalogueOf: Readonly<Record<Language, Catalogue>> = {
  en: english,
  es: spanish,
  ru: russian,
};

const theMonthKeys: readonly WordKey[] = [
  'calendar.month.january',
  'calendar.month.february',
  'calendar.month.march',
  'calendar.month.april',
  'calendar.month.may',
  'calendar.month.june',
  'calendar.month.july',
  'calendar.month.august',
  'calendar.month.september',
  'calendar.month.october',
  'calendar.month.november',
  'calendar.month.december',
];

/**
 * The languages whose letters the shipped cuts carry, so a title in them is measured rather than
 * swept. Russian is the third language Emi ships and the faces hold no Cyrillic, so a phone draws
 * those words in a face of its own and their width is nobody's to state here.
 */
const theLanguagesTheFacesDraw: readonly Language[] = ['en', 'es'];

/**
 * Points. Every width the title could arrive at, from nothing to far wider than any glass. The
 * rule is held at each of them, which is what covers a language the faces cannot measure and every
 * language Emi has not shipped yet.
 */
const everyWidthATitleCouldTake: readonly number[] = [0, 20, 60, 120, 200, 400, 1000];

/** Points. The same sweep for a pill, whose words change with the language as the title's do. */
const everyWidthAPillCouldTake: readonly number[] = [0, 40, 80, 160];

function theWordFor(key: WordKey, language: Language): string {
  const held = theCatalogueOf[language][key];

  if (typeof held !== 'string') {
    throw new Error(`${key} is written differently for each count, so it names no single word`);
  }

  return held;
}

/**
 * The title that draws widest in a language, which is the one the header has least room for. The
 * twelve are measured rather than guessed at, so a catalogue that gains a longer word is read here
 * on the day it lands.
 */
function theWidestTitleIn(language: Language): string {
  const titles = theMonthKeys.map((key) => `${theWordFor(key, language)} ${theYearBeside}`);

  return titles.reduce((widest, title) =>
    theWidthOfWords(title, 'headline-md') > theWidthOfWords(widest, 'headline-md') ? title : widest,
  );
}

function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Past the welcome and past the two questions she may skip, on the question about her last one. */
async function sheReachesHerLastPeriod(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/**
 * The header of the month laid out on one phone: the two pills and the title between them, in the
 * boxes the screen drew, each holding words of the width it is handed.
 *
 * A style is the same in every language and only the words change, so one render carries every
 * case and the language arrives as three widths.
 */
function theHeader(
  phone: Phone,
  words: { readonly earlier: number; readonly title: number; readonly later: number },
): MeasuredWordRow {
  const cells = [
    { box: screen.getByTestId(earlierMonthTestID) as unknown as Box, words: words.earlier },
    { box: screen.getByTestId(monthTestID) as unknown as Box, words: words.title },
    { box: screen.getByTestId(laterMonthTestID) as unknown as Box, words: words.later },
  ];

  return theRowOfWords(
    screen.getByTestId(monthHeadingTestID) as unknown as Box,
    cells,
    phone.width,
  );
}

/** The header as a woman reading one of the two languages the shipped faces draw is shown it. */
function theHeaderIn(phone: Phone, language: Language): MeasuredWordRow {
  return theHeader(phone, {
    earlier: theWidthOfWords(theWordFor('onboarding.lastPeriod.earlier', language), 'body-sm'),
    later: theWidthOfWords(theWordFor('onboarding.lastPeriod.later', language), 'body-sm'),
    title: theWidthOfWords(theWidestTitleIn(language), 'headline-md'),
  });
}

/** Both phones against each language the faces draw, so a failure names the phone and the words. */
const everyPhoneAndLanguage = bothPhones.flatMap((phone) =>
  theLanguagesTheFacesDraw.map((language) => ({ language, phone })),
);

/** Both phones against every width the words could arrive at. */
const everyPhoneAndWidth = bothPhones.flatMap((phone) =>
  everyWidthATitleCouldTake.flatMap((title) =>
    everyWidthAPillCouldTake.map((pill) => ({ phone, pill, title })),
  ),
);

describe('the month title never touches the way to another month', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the longest month of a language the shipped faces draw', () => {
    it.each(everyPhoneAndLanguage)(
      'stands a gap from each pill on $phone.name reading $language',
      async ({ phone, language }) => {
        await sheReachesHerLastPeriod();

        for (const separation of theHeaderIn(phone, language).separations) {
          expect(separation).toBeGreaterThanOrEqual(space.spaceSm);
        }
      },
    );

    it.each(everyPhoneAndLanguage)(
      'ends inside the header on $phone.name reading $language',
      async ({ phone, language }) => {
        await sheReachesHerLastPeriod();

        const header = theHeaderIn(phone, language);

        expect(header.rightEdge).toBeLessThanOrEqual(header.width);
      },
    );

    it.each(everyPhoneAndLanguage)(
      'gives up its own width and leaves both pills theirs on $phone.name reading $language',
      async ({ phone, language }) => {
        await sheReachesHerLastPeriod();

        const [earlier, title, later] = theHeaderIn(phone, language).cellWidths;
        const pill = (key: WordKey): number =>
          toATenthOfAPoint(
            theWidthOfWords(theWordFor(key, language), 'body-sm') + thePillAroundTheWords,
          );

        expect(title).toBeLessThan(theWidthOfWords(theWidestTitleIn(language), 'headline-md'));
        expect(earlier).toBe(pill('onboarding.lastPeriod.earlier'));
        expect(later).toBe(pill('onboarding.lastPeriod.later'));
      },
    );

    it('is September in English, septiembre in Spanish, and the calendar draws it that way', async () => {
      await sheReachesHerLastPeriod();

      expect(theWidestTitleIn('en')).toBe(monthLabel('2026-09-01'));
      expect(theWidestTitleIn('es')).toBe('septiembre 2026');
      expect(screen.getByTestId(monthTestID)).toHaveTextContent(monthLabel('2026-05-01'));
    });
  });

  describe('a title of any width at all, which is how Russian is covered', () => {
    it('is written in letters the shipped faces carry no glyph for', () => {
      expect(
        theLettersWithNoGlyph(theWordFor('calendar.month.september', 'ru'), 'headline-md'),
      ).toEqual(['с', 'е', 'н', 'т', 'я', 'б', 'р', 'я']);
      expect(theLettersWithNoGlyph('September', 'headline-md')).toEqual([]);
      expect(() => theWidthOfWords('сентября 2026', 'headline-md')).toThrow(
        'a face this repository does not hold',
      );
    });

    it.each(everyPhoneAndWidth)(
      'stands a gap from each pill on $phone.name at a title of $title and pills of $pill',
      async ({ phone, pill, title }) => {
        await sheReachesHerLastPeriod();

        const header = theHeader(phone, { earlier: pill, later: pill, title });

        expect(header.separations).toHaveLength(2);

        for (const separation of header.separations) {
          expect(separation).toBeGreaterThanOrEqual(space.spaceSm);
        }
      },
    );

    it('never takes a point off a pill, whatever the title asks for', async () => {
      await sheReachesHerLastPeriod();

      const widths = everyWidthATitleCouldTake.map(
        (title) => theHeader(anIPhone16, { earlier: 40, later: 40, title }).cellWidths,
      );

      for (const [earlier, , later] of widths) {
        expect(earlier).toBe(toATenthOfAPoint(40 + thePillAroundTheWords));
        expect(later).toBe(toATenthOfAPoint(40 + thePillAroundTheWords));
      }
    });
  });

  describe('the two pills and the title the header is drawn from', () => {
    it('draws the title on one line, so shrinking it never makes the header taller', async () => {
      await sheReachesHerLastPeriod();

      expect(screen.getByTestId(monthTestID).props.numberOfLines).toBe(1);
    });

    it('keeps both pills as big as a thumb needs on both axes', async () => {
      await sheReachesHerLastPeriod();

      const pills = [
        screen.getByTestId(earlierMonthTestID),
        screen.getByTestId(laterMonthTestID),
      ] as unknown as Control[];

      expect(controlsTooSmallToPress(pills)).toEqual([]);
      expect(screen.getByTestId(earlierMonthTestID)).toHaveStyle({
        minHeight: MINIMUM_TAP_TARGET,
        minWidth: MINIMUM_TAP_TARGET,
      });
    });

    it('keeps the pill she can press filled and the spent one faded', async () => {
      await sheReachesHerLastPeriod();

      expect(screen.getByTestId(earlierMonthTestID)).not.toHaveStyle({ opacity: 0.4 });
      expect(screen.getByTestId(laterMonthTestID)).toHaveStyle({ opacity: 0.4 });
    });
  });

  describe('a row whose cells are as wide as the words inside them', () => {
    const aRow = (style: Record<string, unknown>): Box => ({
      parent: null,
      props: { style },
      type: 'RCTView',
    });
    const aCell = (style: Record<string, unknown>, row: Box, words: number): WordCell => ({
      box: { parent: row, props: { style }, type: 'RCTView' },
      words,
    });

    it('spreads what is left over between the cells, on top of the gap the row declares', () => {
      const row = aRow({
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
        width: 200,
      });

      expect(theRowOfWords(row, [aCell({}, row, 40), aCell({}, row, 40)], 200).separations).toEqual(
        [120],
      );
    });

    it('takes the overrun off the cell that shrinks and leaves the gap standing', () => {
      const row = aRow({ flexDirection: 'row', gap: 8, justifyContent: 'space-between' });
      const measured = theRowOfWords(
        row,
        [aCell({}, row, 60), aCell({ flexShrink: 1 }, row, 300), aCell({}, row, 60)],
        200,
      );

      expect(measured.cellWidths).toEqual([60, 64, 60]);
      expect(measured.separations).toEqual([8, 8]);
      expect(measured.rightEdge).toBe(measured.width);
    });

    it('never shrinks a cell below the floor it declares, and says so by overrunning', () => {
      const row = aRow({ flexDirection: 'row', gap: 8, justifyContent: 'space-between' });
      const measured = theRowOfWords(
        row,
        [aCell({}, row, 60), aCell({ flexShrink: 1, minWidth: 120 }, row, 300), aCell({}, row, 60)],
        200,
      );

      expect(measured.cellWidths).toEqual([60, 120, 60]);
      expect(measured.rightEdge).toBeGreaterThan(measured.width);
    });

    it('leaves every cell its width where none of them shrinks, which is how a row overruns', () => {
      const row = aRow({ flexDirection: 'row', gap: 8, justifyContent: 'space-between' });
      const measured = theRowOfWords(row, [aCell({}, row, 150), aCell({}, row, 150)], 200);

      expect(measured.cellWidths).toEqual([150, 150]);
      expect(measured.separations).toEqual([8]);
      expect(measured.rightEdge).toBe(308);
    });

    it('lifts a cell to the floor it declares, and counts what it keeps outside itself', () => {
      const row = aRow({ flexDirection: 'row', justifyContent: 'space-between' });
      const measured = theRowOfWords(
        row,
        [aCell({ marginRight: 6, minWidth: 44 }, row, 10), aCell({ padding: 12 }, row, 40)],
        200,
      );

      expect(measured.cellWidths).toEqual([50, 64]);
    });

    it('moves what a cell held at its floor cannot give onto the cell that still can', () => {
      const row = aRow({ flexDirection: 'row', justifyContent: 'space-between' });
      const measured = theRowOfWords(
        row,
        [aCell({ flexShrink: 1, minWidth: 90 }, row, 100), aCell({ flexShrink: 1 }, row, 100)],
        140,
      );

      expect(measured.cellWidths).toEqual([90, 50]);
      expect(measured.rightEdge).toBe(measured.width);
    });

    it('refuses a row it cannot answer for rather than answering it wrongly', () => {
      const row = aRow({ flexDirection: 'row', justifyContent: 'space-between' });
      const centred = aRow({ flexDirection: 'row', justifyContent: 'center' });

      expect(() => theRowOfWords(row, [aCell({}, row, 40)], 200)).toThrow(
        'nothing between its cells to measure',
      );
      expect(() =>
        theRowOfWords(centred, [aCell({}, centred, 40), aCell({}, centred, 40)], 200),
      ).toThrow('a row spread with center is refused');
    });
  });

  describe('the width a run of words is measured at', () => {
    it('comes off the font file the application ships', () => {
      expect(theWidthOfWords('September 2026', 'headline-md')).toBeCloseTo(168.276, 3);
      expect(theWidthOfWords('Earlier', 'body-sm')).toBeCloseTo(41.062, 3);
      expect(theWidthOfWords('', 'headline-md')).toBe(0);
    });

    it('gives a glyph past the end of the metrics the last advance the table holds', () => {
      // Plus Jakarta Sans writes 1,187 advances for 1,188 glyphs, and the ogonek is the glyph it
      // stops before, so its width is the one the table ends on rather than nothing at all.
      expect(theWidthOfWords('\u02db', 'body-sm')).toBeCloseTo(5.348, 3);
      expect(theWidthOfWords('\u00b8', 'body-sm')).toBeCloseTo(5.348, 3);
    });

    it('is refused for a role drawn with tracking, because nothing here places the last of it', () => {
      expect(() => theWidthOfWords('Later', 'label-sm')).toThrow('tracking');
    });

    it('holds every language Emi writes in to one of the two answers', () => {
      for (const language of languages) {
        const title = `${theWordFor('calendar.month.september', language)} ${theYearBeside}`;
        const measured = theLettersWithNoGlyph(title, 'headline-md').length === 0;

        expect(measured).toBe(theLanguagesTheFacesDraw.includes(language));
      }
    });
  });
});
