import { join } from 'node:path';

import { CYCLES_BEFORE_A_FORECAST, addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import {
  approvedDenials as theDenialsOfAClaim,
  describeClaim,
} from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { approvedDenials as theDenialsOfASample } from '../../../../tools/pipeline/sampleWording';
import { type Language, type Words, catalogueOf, languages } from '../../src/language';
import { cyclesBeforeAPattern } from '../../src/features/home/herPatterns';
import { cyclesBeforeATrend } from '../../src/features/home/herTrend';
import { trendCaptionTestID } from '../../src/features/home/CycleTrend';
import { homeGreetingTestID } from '../../src/features/home/HomeHeader';
import {
  homeCyclesLineTestID,
  homeDoctorRecordTestID,
  homeFertileWindowTestID,
  homeForecastTestID,
  homeNoRingLineTestID,
  homeNoRingTitleTestID,
  homePainLineTestID,
  homePatternsLineTestID,
  homeScreenTestID,
  homeTrendCountTestID,
} from '../../src/features/home/HomeScreen';
import { sectionWaitingTestID } from '../../src/features/home/SectionWaiting';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHoldsTheseAnswers } from '../fixtures/herPhone';
import { herCyclesOutsideTheBand } from '../fixtures/herSixCycles';
import { daysOfHerRepeatingSymptoms } from '../fixtures/herRepeatingSymptoms';
import { textIn } from '../fixtures/renderedText';

import type { DayRecord, Feeling, Goal, Regularity } from '@emi/crypto';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The screen she opens, in the voice `docs/design/voice.md` sets. It greets her by the name she
 * gave, it says what it is waiting for as we rather than as Emi, and the two denials it carries
 * travel word for word.
 *
 * Every sentence is written out here rather than read off the catalogue it checks, because a
 * sentence read off the thing it is holding moves with it and catches nothing.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

const theNameSheGave = 'Ada';

/** The length she gave at the first run, which the learning state is the only thing to count by. */
const sheSaidHerCycleRuns = 29;

/** How many complete cycles the six cycle phone carries, which every sentence below counts. */
const theCyclesSheHasBehindHer = 6;

/** What the header says, with the name she gave and without it. */
const theGreeting = { named: `Hi, ${theNameSheGave}`, plain: 'Hi' };

/** What a woman who has recorded nothing reads where the ring would be. */
const theRingSheHasNotDrawnYet = {
  title: 'Your ring is waiting',
  line: 'Log a day you bled and your cycle appears here.',
};

/** The forecast, once her own cycles carry it. */
const theForecastSays = {
  heading: 'Your next period',
  confidence: `confidence, based on your last ${theCyclesSheHasBehindHer} cycles`,
  moves: 'Your cycle moves around, so the range is wider.',
};

/** The forecast before two cycles are complete, which says what it is waiting for. */
const theForecastStillLearningSays = {
  title: 'Still getting to know you',
  wants: `We need ${CYCLES_BEFORE_A_FORECAST} more full cycles before we can say how sure we are.`,
  counts: `Until then, we're using the ${sheSaidHerCycleRuns} day cycle you told us about.`,
};

/** The window she asked for, and the denial that travels with it word for word. */
const theFertileWindowSays = {
  estimate: `An estimate based on your last ${theCyclesSheHasBehindHer} cycles.`,
  denial: 'Emi never says a day is safe, because no day is.',
};

/** The two lines she reads because of an answer she gave at her first run. */
const herOwnAnswersRead = {
  pain: 'You told us these days can be hard. Start with how much it hurts.',
  doctor: "You wanted a record for your doctor. It's ready whenever you are, in Export.",
};

/** What her cycles and her chart say, once there are enough of them, and while there are not. */
const herCyclesRead = {
  strips: 'Each strip is one of your cycles, starting with this one. Tap one to see it in full.',
  waitingNeeds: 'Your numbers arrive with your second period.',
  waitingRead: "So far we've seen 0 complete cycles.",
};

const herTrendReads = {
  caption: `Your last ${theCyclesSheHasBehindHer} complete cycles. The shaded band is the published range.`,
  outside: `${herCyclesOutsideTheBand.length} of your last ${theCyclesSheHasBehindHer} complete cycles fell outside the band.`,
  waitingNeeds: `Your chart appears once ${cyclesBeforeATrend} cycles are complete.`,
  waitingRead: 'Emi draws nothing from nothing, and it holds no sample data.',
};

const whatComesBackReads = {
  line: "A symptom you logged once or twice isn't a pattern, so we won't call it one.",
  waitingNeeds: `We'll point out a symptom once it's come back in ${cyclesBeforeAPattern} cycles.`,
};

/** Every key the screen she opens says, so the voice below is read over all of them at once. */
const theKeysOfTheScreenSheOpens: readonly string[] = [
  'cycle.noRing.line',
  'cycle.noRing.title',
  'forecast.confidence.sentence',
  'forecast.cycleMoves',
  'forecast.cyclesWanted',
  'forecast.fertileWindow.sentence',
  'forecast.nextPeriod',
  'forecast.statedLength',
  'forecast.stillLearning',
  'home.cycles.line',
  'home.doctorRecord',
  'home.greeting',
  'home.greeting.noName',
  'home.painLine',
  'home.patterns.line',
  'home.trend.allInside',
  'home.trend.caption',
  'home.trend.outside',
  'home.waiting.cycles.needs',
  'home.waiting.cycles.read',
  'home.waiting.trend.needs',
  'home.waiting.trend.read',
];

/** The two lines that name Emi on purpose, because each one denies a claim rather than making it. */
const theTwoLinesThatNameEmi: readonly string[] = [
  'forecast.fertileWindow.sentence',
  'home.waiting.trend.read',
];

/** How each language writes the second person, which is who this screen is talking to. */
const howEachLanguageSaysYou: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(you|your)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(tu|tus|tú|te|ti)(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(вы|ваш|ваши|вас|вам)/iu,
};

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

/** One language's catalogue, read by key rather than by type, so a new key needs no cast. */
function theCatalogueOf(language: Language): Readonly<Record<string, Words>> {
  return Object.fromEntries(Object.entries(catalogueOf(language)));
}

/** Every word this screen says in one language, out of that language's own catalogue. */
function theWordsOfTheScreenIn(
  language: Language,
  keys: readonly string[] = theKeysOfTheScreenSheOpens,
): string[] {
  const catalogue = theCatalogueOf(language);

  return keys.flatMap((key) => formsOf(catalogue[key] ?? ''));
}

interface HerPhone {
  /** Nothing at all where she skipped the name question, which is a woman Emi cannot greet. */
  readonly name?: string;
  readonly days?: readonly DayRecord[];
  readonly regularity?: Regularity;
  readonly feeling?: Feeling;
  readonly goals?: readonly Goal[];
}

/** The four days of the first period she ever logged, the last of them today. */
function theOnePeriodSheLogged(): DayRecord[] {
  return [3, 2, 1, 0].map((back) => aBleedingDay(addDays(today, -back)));
}

async function sheOpensEmi(her: HerPhone = {}): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: sheSaidHerCycleRuns,
      ...(her.name === undefined ? {} : { name: her.name }),
      ...(her.regularity === undefined ? {} : { regularity: her.regularity }),
      ...(her.feeling === undefined ? {} : { feeling: her.feeling }),
      ...(her.goals === undefined ? {} : { goals: her.goals }),
      recordedAt: whenSheOpensIt.toISOString(),
    },
    her.days ?? [],
  );
  await renderRouter(appDirectory, { initialUrl: '/' });
}

/**
 * Her six cycles, and the symptoms she logged across them, which is the fullest this screen
 * gets. The fixture carries her bleeding days as well, so this is every day she ever wrote.
 */
function herSixCyclesAndWhatSheLogged(): DayRecord[] {
  return daysOfHerRepeatingSymptoms(today);
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** What one waiting section says, both of its lines, read off the screen she is looking at. */
function whatTheWaitingSectionSays(section: 'cycles' | 'trend' | 'patterns'): string {
  return whatItSays(sectionWaitingTestID(section));
}

describe('the home screen says hi to her by name', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the greeting at the top of it', () => {
    it('says hi to her by the name she gave', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged(), name: theNameSheGave });

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatItSays(homeGreetingTestID)).toBe(theGreeting.named);
    });

    it('says hi on its own to a woman who gave no name, and leaves no gap for one', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged() });

      expect(whatItSays(homeGreetingTestID)).toBe(theGreeting.plain);
      expect(whatItSays(homeGreetingTestID)).not.toContain(',');
      expect(screen.queryByText(theGreeting.named)).toBeNull();
    });

    it('greets her by the name her sealed profile holds, and by nothing else', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged(), name: theNameSheGave });

      // A blank name never reaches this screen: the profile refuses to seal one, so the two
      // forms of the greeting are the only two a woman can read.
      expect(whatItSays(homeGreetingTestID)).toBe(theGreeting.named);
      expect(theGreeting.named).toContain(theNameSheGave);
    });
  });

  describe('the ring she has not drawn yet', () => {
    it('tells her the ring is waiting, and what makes her cycle appear', async () => {
      await sheOpensEmi();

      expect(whatItSays(homeNoRingTitleTestID)).toBe(theRingSheHasNotDrawnYet.title);
      expect(whatItSays(homeNoRingLineTestID)).toBe(theRingSheHasNotDrawnYet.line);
    });
  });

  describe('the forecast she reads under the ring', () => {
    it('heads the range as hers, and says how sure they are from her own cycles', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged(), name: theNameSheGave });
      const said = whatItSays(homeForecastTestID);

      expect(said).toContain(theForecastSays.heading);
      expect(said).toContain(theForecastSays.confidence);
    });

    it('says a cycle that moves around is why the range is wider', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged(), regularity: 'moves' });

      expect(whatItSays(homeForecastTestID)).toContain(theForecastSays.moves);
    });

    it('says it is still getting to know her before two cycles are complete', async () => {
      await sheOpensEmi({ days: theOnePeriodSheLogged() });
      const said = whatItSays(homeForecastTestID);

      expect(said).toContain(theForecastStillLearningSays.title);
      expect(said).toContain(theForecastStillLearningSays.wants);
      expect(said).toContain(theForecastStillLearningSays.counts);
      expect(said).not.toContain('confidence');
    });
  });

  describe('the window she asked to see', () => {
    it('calls it an estimate from her own cycles, and carries the denial word for word', async () => {
      await sheOpensEmi({
        days: herSixCyclesAndWhatSheLogged(),
        goals: ['fertileWindow'],
      });
      const said = whatItSays(homeFertileWindowTestID);

      expect(said).toContain(theFertileWindowSays.estimate);
      expect(said).toContain(theFertileWindowSays.denial);
      expect([...theDenialsOfAClaim]).toContain(theFertileWindowSays.denial);
    });

    it('says no word a screen refuses, with the denial read as a denial', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged(), goals: ['fertileWindow'] });

      expect(
        interfaceClaimsIn(
          'the window on the screen she opens',
          whatItSays(homeFertileWindowTestID),
        ).map(describeClaim),
      ).toEqual([]);
    });
  });

  describe('the lines she reads because of an answer she gave', () => {
    it('offers the pain first on a period day, naming what she told them', async () => {
      await sheOpensEmi({ days: theOnePeriodSheLogged(), feeling: 'hard' });

      expect(whatItSays(homePainLineTestID)).toBe(herOwnAnswersRead.pain);
    });

    it('tells a woman who wanted a record for her doctor where it is', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged(), goals: ['doctorRecord'] });

      expect(whatItSays(homeDoctorRecordTestID)).toBe(herOwnAnswersRead.doctor);
    });

    it('draws neither line for a woman who answered neither question', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged() });

      expect(screen.queryByTestId(homePainLineTestID)).toBeNull();
      expect(screen.queryByTestId(homeDoctorRecordTestID)).toBeNull();
    });
  });

  describe('her own cycles, as strips and as a chart', () => {
    it('says each strip is one of her cycles, and what one press opens', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged() });

      expect(whatItSays(homeCyclesLineTestID)).toBe(herCyclesRead.strips);
    });

    it('captions the chart as hers, and counts the ones outside the published band', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged() });

      expect(whatItSays(trendCaptionTestID)).toBe(herTrendReads.caption);
      expect(whatItSays(homeTrendCountTestID)).toBe(herTrendReads.outside);
    });

    it('says what comes back is a pattern only once it has come back', async () => {
      await sheOpensEmi({ days: herSixCyclesAndWhatSheLogged() });

      expect(whatItSays(homePatternsLineTestID)).toBe(whatComesBackReads.line);
    });
  });

  describe('a section her days cannot fill yet', () => {
    beforeEach(async () => {
      await sheOpensEmi({ days: theOnePeriodSheLogged() });
    });

    it('says her numbers arrive with her second period, and how many they have seen', () => {
      expect(whatTheWaitingSectionSays('cycles')).toBe(
        `${herCyclesRead.waitingNeeds} ${herCyclesRead.waitingRead}`,
      );
    });

    it('says when her chart appears, and that Emi draws nothing from nothing', () => {
      expect(whatTheWaitingSectionSays('trend')).toBe(
        `${herTrendReads.waitingNeeds} ${herTrendReads.waitingRead}`,
      );
      expect([...theDenialsOfASample]).toContain(herTrendReads.waitingRead);
    });

    it('leaves the sentence about a symptom coming back as it was', () => {
      expect(whatTheWaitingSectionSays('patterns')).toContain(whatComesBackReads.waitingNeeds);
    });
  });

  describe('the voice this screen is written in', () => {
    it('says every one of its lines in all three languages', () => {
      for (const key of theKeysOfTheScreenSheOpens) {
        const said = languages.map((language) => theWordsOfTheScreenIn(language, [key]).join('|'));

        expect({ key, missing: said.filter((each) => each.length === 0) }).toEqual({
          key,
          missing: [],
        });
      }

      expect(languages.length).toBe(3);
      expect(theKeysOfTheScreenSheOpens.length).toBeGreaterThan(20);
    });

    it('talks to her as you, in each of the three languages', () => {
      for (const language of languages) {
        expect({
          language,
          asYou: howEachLanguageSaysYou[language].test(theWordsOfTheScreenIn(language).join('\n')),
        }).toEqual({ language, asYou: true });
      }
    });

    it('names Emi on two lines only, and each one is a denial', () => {
      for (const language of languages) {
        const naming = theKeysOfTheScreenSheOpens.filter((key) =>
          theWordsOfTheScreenIn(language, [key]).join('\n').includes('Emi'),
        );

        expect({ language, naming }).toEqual({ language, naming: [...theTwoLinesThatNameEmi] });
      }
    });

    it('carries no exclamation mark, in any of the three languages', () => {
      for (const language of languages) {
        const loud = theKeysOfTheScreenSheOpens.filter((key) =>
          theWordsOfTheScreenIn(language, [key]).some((line) => line.includes('!')),
        );

        expect({ language, loud }).toEqual({ language, loud: [] });
      }
    });

    it('says no word a screen refuses, in any of the three languages', () => {
      for (const language of languages) {
        const claims = interfaceClaimsIn(
          `the screen she opens in ${language}`,
          theWordsOfTheScreenIn(language).join('\n'),
        );

        expect(claims.map(describeClaim)).toEqual([]);
      }
    });
  });
});
