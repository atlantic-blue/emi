import { join } from 'node:path';

import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { patternsWaitingSentence } from '../../src/features/cycle/patternsWaiting';
import { homeCyclesTestID } from '../../src/features/home/CycleStrip';
import { cyclesBeforeAPattern } from '../../src/features/home/herPatterns';
import { cyclesBeforeATrend } from '../../src/features/home/herTrend';
import { homeTrendTestID } from '../../src/features/home/CycleTrend';
import { homePatternsTestID } from '../../src/features/home/PatternCard';
import { homeNumbersTestID } from '../../src/features/home/MeasuredRow';
import {
  homeCyclesLineTestID,
  homeFiguresLineTestID,
  homeLogTodayTestID,
  homePatternsLineTestID,
  homeScreenTestID,
  homeTrendCountTestID,
} from '../../src/features/home/HomeScreen';
import {
  sectionWaitingHeadingTestID,
  sectionWaitingTestID,
  waitingSections,
} from '../../src/features/home/SectionWaiting';
import { historyWaitingTestID } from '../../src/features/history/HistoryScreen';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { sizedTextIn, textIn } from '../fixtures/renderedText';
import {
  type Part,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockup,
} from '../fixtures/theMockupScreen';
import {
  theWaitingSectionsOnTheGlass,
  theWaitingSectionsTheDrawingPlaces,
} from '../fixtures/theWaitingSections';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** The length she gave at the first run. It is the only thing her phone holds about her body. */
const sheSaidHerCycleRuns = 29;

/** The drawing this step builds: day one, and the sections her own days cannot fill yet. */
const theDrawing = 'todayEmptyBody';

/**
 * What each waiting section says on a phone that holds nothing, written out by hand. A sentence
 * read off the catalogue it is holding moves with it and catches nothing.
 */
const theWordsOfEachWaitingSection = [
  {
    heading: 'Your cycles',
    needs: 'Your numbers arrive with your second period.',
    read: "So far we've seen 0 complete cycles.",
    section: 'cycles',
  },
  {
    heading: 'Cycle trends',
    needs: 'Your chart appears once 2 cycles are complete.',
    read: 'Emi draws nothing from nothing, and it holds no sample data.',
    section: 'trend',
  },
  {
    heading: 'What comes back',
    needs: 'Emi names a symptom once it has come back in 3 cycles.',
    read: '0 of yours are complete.',
    section: 'patterns',
  },
];

/** Points. Contract SCREEN-2 keeps every word of this screen at this size or under. */
const theLargestAWordMayBeDrawn = 14;

/** Her phone on day one: the answers of her first run, and not one recorded day. */
async function sheOpensEmiOnDayOne(): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, [], sheSaidHerCycleRuns);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

/** How many of her cycles are complete, read out of her phone and never off the screen. */
function herCompleteCycles(): number {
  return listCycles(herDatabase()).filter((cycle) => cycle.lengthDays !== null).length;
}

/** Everything one section says, read off the glass as one sentence. */
function whatOneSectionSays(section: 'cycles' | 'trend' | 'patterns'): string {
  return textIn(screen.getByTestId(sectionWaitingTestID(section))).join(' ');
}

/**
 * What each part of the drawing is built under on the screen she opens, in the drawing's order.
 *
 * A part with nothing under it is a part another step owns, named with the step that owns it. The
 * drawing is a whole page and this step builds the waiting sections of one, so the header and the
 * two ways out of it belong to feature 15.
 */
interface PartOfTheDrawing {
  readonly name: string;
  readonly builtUnder: readonly string[];
  /** Nothing at all where this step builds the part. */
  readonly ownedBy?: string;
}

function theDrawingPlaces(): PartOfTheDrawing[] {
  return [
    { name: 'Text', builtUnder: [], ownedBy: 'the header, feature 15 step 1' },
    { name: 'TextLink', builtUnder: [], ownedBy: 'the way back in the header, feature 15 step 1' },
    {
      name: 'TextLink',
      builtUnder: [],
      ownedBy: 'the word Today in the header, feature 15 step 1',
    },
    ...waitingSections.flatMap((section) => [
      { name: 'Text', builtUnder: [sectionWaitingHeadingTestID(section)] },
      { name: 'SectionWaiting', builtUnder: [sectionWaitingTestID(section)] },
    ]),
    { name: 'PrimaryButton', builtUnder: [homeLogTodayTestID] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('index')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('log/index')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('history')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('settings/index')] },
  ];
}

function asPart(part: PartOfTheDrawing): Part {
  return { builtUnder: part.builtUnder, name: part.name };
}

/** Every part a filled section draws, so a case can say that none of them was drawn from nothing. */
const thePartsOfAFilledSection: readonly string[] = [
  homeNumbersTestID,
  homeFiguresLineTestID,
  homeCyclesTestID,
  homeCyclesLineTestID,
  homeTrendTestID,
  homeTrendCountTestID,
  homePatternsTestID,
  homePatternsLineTestID,
];

describe('a section her data cannot fill carries one sentence and no chart', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement belongs to step 2.4. Here it arrives already open, so what a case
    // reads off the screen is the section and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the screen she opens on a phone that holds nothing', () => {
    beforeEach(async () => {
      await sheOpensEmiOnDayOne();
    });

    it('draws a waiting section for every section her days cannot fill, in the drawing order', () => {
      expect(theWaitingSectionsOnTheGlass(waitingSections).map((said) => said.section)).toEqual([
        ...waitingSections,
      ]);
    });

    it('says what each section needs and how far off she is, in the shape the drawing carries', () => {
      const drawing = theWaitingSectionsTheDrawingPlaces(theDrawing);
      const glass = theWaitingSectionsOnTheGlass(waitingSections);

      // The drawing settles the shape: three sections, in its order, each under its own heading,
      // and which of them carries a second line about how far off she is. The words are the
      // catalogue’s, written out below, because the drawing was made before the copy of
      // https://github.com/atlantic-blue/emi/issues/248 settled them.
      expect(drawing).toHaveLength(3);
      expect(glass.map((said) => said.section)).toEqual([...waitingSections]);
      expect(glass.map((said) => said.heading)).toEqual(drawing.map((said) => said.heading));
      expect(glass.map((said) => said.read !== undefined)).toEqual(
        drawing.map((said) => said.read !== undefined),
      );
      expect(glass).toEqual(theWordsOfEachWaitingSection);
    });

    it('names the count it read out of her phone, and the thresholds the arithmetic holds', () => {
      const complete = herCompleteCycles();

      expect(complete).toBe(0);
      expect(whatOneSectionSays('cycles')).toContain(`${String(complete)} complete cycles`);
      expect(whatOneSectionSays('patterns')).toContain(`${String(complete)} of yours`);
      expect(whatOneSectionSays('trend')).toContain(String(cyclesBeforeATrend));
      expect(whatOneSectionSays('patterns')).toContain(String(cyclesBeforeAPattern));
    });

    it('draws no chart, no strip, no row and no card in any of the three', () => {
      for (const part of thePartsOfAFilledSection) {
        expect(screen.queryByTestId(part)).toBeNull();
      }

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    it('keeps every word of them at 14 points or less, which is what SCREEN-2 holds', () => {
      const drawn = waitingSections.flatMap((section) =>
        sizedTextIn(screen.getByTestId(sectionWaitingTestID(section))),
      );
      const over = drawn.filter(
        (run) => run.points === undefined || run.points > theLargestAWordMayBeDrawn,
      );

      expect(over).toEqual([]);
      expect(drawn.length).toBeGreaterThan(0);
    });
  });

  describe('what comes back, which the Insights screen says too', () => {
    it('says the same sentence on both screens, because both read it from one place', async () => {
      await sheOpensEmiOnDayOne();

      const onTheScreenSheOpens = whatOneSectionSays('patterns');

      await fireEvent.press(screen.getByTestId(tabTestID('history')));

      expect(textIn(screen.getByTestId(historyWaitingTestID)).join(' ')).toBe(onTheScreenSheOpens);
      expect(onTheScreenSheOpens).toContain(patternsWaitingSentence(0));
    });
  });

  describe('the screen she opens, held against the drawing of what arrives later', () => {
    beforeEach(async () => {
      await sheOpensEmiOnDayOne();
    });

    it('is held to the parts the drawing places, in the drawing order, and to no other list', () => {
      expect(thePartsOfTheMockup('todayEmptyBody').map((part) => part.name)).toEqual(
        theDrawingPlaces().map((part) => part.name),
      );
    });

    it('draws every part of the drawing this step builds, in the order the drawing places them', () => {
      const mine = theDrawingPlaces()
        .filter((part) => part.ownedBy === undefined)
        .map(asPart);

      expect(partsMissing(mine, theIdentifiersDrawn())).toEqual([]);
      expect(mine).toHaveLength(11);
    });

    it('answers for nothing else of the drawing yet, and names each part it leaves to another step', () => {
      const unbuilt = theDrawingPlaces().filter((part) => part.ownedBy !== undefined);

      expect(partsMissing(theDrawingPlaces().map(asPart), theIdentifiersDrawn())).toEqual(
        unbuilt.map(
          (part) =>
            `the drawing names ${part.name}, and nothing says which test identifier it is built under`,
        ),
      );
      expect(unbuilt.map((part) => part.ownedBy)).toEqual([
        'the header, feature 15 step 1',
        'the way back in the header, feature 15 step 1',
        'the word Today in the header, feature 15 step 1',
      ]);
    });
  });
});
