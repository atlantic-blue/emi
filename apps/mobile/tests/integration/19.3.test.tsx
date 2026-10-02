import { join } from 'node:path';

import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { resetExpoSqlite } from '../data/expoSqlite';
import { theIdentifiersDrawn } from '../fixtures/theMockupScreen';
import {
  type Measured,
  everySectionMeasured,
  partsNoSectionAnswersFor,
  sectionsBreakingTheRule,
  sectionsClaimingTheSamePart,
  theSectionsOfTheScreenSheOpens,
} from '../fixtures/everySection';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase } from '../fixtures/herPhone';
import {
  type HerDataState,
  herPhoneHoldsThisState,
  theStatesOfHerData,
  whatHerPhoneHolds,
} from '../fixtures/theStatesOfHerData';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** How many sections the record holds. A guard that measured none would report success. */
const theSectionsTheScreenHas = 13;

interface Read {
  readonly state: HerDataState;
  readonly measured: readonly Measured[];
  readonly unanswered: readonly string[];
  /** Every part the screen drew at that state, kept so the record can be read against it. */
  readonly drawn: readonly string[];
}

/**
 * The screen she opens at one state of her data, measured section by section.
 *
 * Her phone is read back before the screen is, and the state is held to what the tables actually
 * hold, so a state that did not seed what it claims fails here rather than further down where it
 * would read as a fault in a section.
 */
async function sheOpensEmiAt(state: HerDataState): Promise<Read> {
  await herPhoneHoldsThisState(whenSheOpensIt, state);
  const app = await renderRouter(appDirectory, { initialUrl: '/' });

  const { aSymptomCameBack, ...claimed } = state.holds;
  const held = whatHerPhoneHolds(herDatabase(), today);

  expect({ state: state.name, ...held }).toEqual({
    state: state.name,
    completeCycles: claimed.completeCycles,
    dayOfHerCycle: claimed.dayOfHerCycle,
    loggedToday: claimed.loggedToday,
    recordedDays: claimed.recordedDays,
  });
  expect(typeof aSymptomCameBack).toBe('boolean');

  const read = {
    drawn: theIdentifiersDrawn(),
    measured: everySectionMeasured(state.name, state.holds),
    state,
    unanswered: partsNoSectionAnswersFor(),
  };

  // The router handles the deep links of the whole application, so a second one standing beside
  // the first warns and reads its own address. One screen at a time, and the state goes with it.
  await app.unmount();

  return read;
}

describe('every section of the screen she opens is drawn from her own data or absent with a sentence', () => {
  const states = theStatesOfHerData(today);
  const read: Read[] = [];

  beforeAll(async () => {
    for (const state of states) {
      jest.useFakeTimers();
      jest.setSystemTime(whenSheOpensIt);
      // The ring's one movement belongs to step 2.4. Here it arrives already open, so what is
      // read off the screen is the section and never a frame of an animation.
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      resetExpoSqlite();
      resetExpoSecureStore();

      read.push(await sheOpensEmiAt(state));

      jest.useRealTimers();
      jest.restoreAllMocks();
    }
  });

  describe('the four states her data passes through', () => {
    it('reads the screen at nothing recorded, one cycle, two cycles and six', () => {
      expect(states.map((state) => state.name)).toEqual([
        'nothing recorded',
        'one complete cycle',
        '2 complete cycles',
        '6 complete cycles',
      ]);
      expect(read).toHaveLength(states.length);
    });

    it('says how many sections it measured, so a run that measured none fails', () => {
      const measured = read.flatMap((at) => at.measured);

      expect(theSectionsOfTheScreenSheOpens).toHaveLength(theSectionsTheScreenHas);
      expect(measured).toHaveLength(theSectionsTheScreenHas * states.length);
      expect(measured.length).toBeGreaterThan(0);
    });
  });

  describe('the rule, at every state', () => {
    it('draws no section Emi cannot fill, and leaves none she earned undrawn', () => {
      expect(read.flatMap((at) => sectionsBreakingTheRule(at.measured))).toEqual([]);
    });

    it('puts one sentence in the place of every section that owes her one', () => {
      const owed = read.flatMap((at) =>
        at.measured.filter((section) => section.owesASentence && !section.hers),
      );

      expect(owed.filter((section) => section.instead.length === 0)).toEqual([]);
      expect(owed.length).toBeGreaterThan(0);
    });

    it('names the section and the state when a section is drawn from nothing', () => {
      const drawnFromNothing: Measured = {
        drawn: ['home-trend', 'home-trend-point-2026-04-13'],
        hers: false,
        instead: [],
        owesASentence: true,
        section: 'the shape of her last cycles',
        state: 'one complete cycle',
      };

      expect(sectionsBreakingTheRule([drawnFromNothing])).toEqual([
        'at one complete cycle, the shape of her last cycles is drawn from nothing: home-trend, home-trend-point-2026-04-13',
      ]);
    });

    it('names a section she earned that nothing was drawn for, and a sentence that stayed', () => {
      expect(
        sectionsBreakingTheRule([
          {
            drawn: [],
            hers: true,
            instead: [],
            owesASentence: true,
            section: 'her forecast',
            state: '6 complete cycles',
          },
          {
            drawn: ['home-trend'],
            hers: true,
            instead: ['home-waiting-trend'],
            owesASentence: true,
            section: 'the shape of her last cycles',
            state: '6 complete cycles',
          },
        ]),
      ).toEqual([
        'at 6 complete cycles, her forecast is filled by her own data and nothing of it is drawn',
        'at 6 complete cycles, the shape of her last cycles is drawn and a sentence stands in its place too: home-waiting-trend',
      ]);
    });

    it('names a section absent with nothing in its place', () => {
      expect(
        sectionsBreakingTheRule([
          {
            drawn: [],
            hers: false,
            instead: [],
            owesASentence: true,
            section: 'her three numbers beside the published figures',
            state: 'nothing recorded',
          },
        ]),
      ).toEqual([
        'at nothing recorded, her three numbers beside the published figures is absent and no sentence stands in its place',
      ]);
    });
  });

  describe('every section arrives on the state her days earn it, and not before', () => {
    function whereItWasDrawn(name: string): string[] {
      return read
        .filter((at) => at.measured.some((section) => section.section === name && section.hers))
        .map((at) => at.state.name);
    }

    it('waits for her second cycle before it draws her numbers, her forecast and her trend', () => {
      for (const section of [
        'her three numbers beside the published figures',
        'her forecast',
        'the shape of her last cycles',
        'the fertile window',
      ]) {
        expect(whereItWasDrawn(section)).toEqual(['2 complete cycles', '6 complete cycles']);
      }
    });

    it('draws the ring, the strips and the day of her cycle as soon as she records a day', () => {
      for (const section of [
        'the ring',
        'her past cycles as strips',
        'the day of her cycle over each date of her week',
        'the line that names the day of her cycle',
        'what she logged today',
        'the way to the pain log',
      ]) {
        expect(whereItWasDrawn(section)).toEqual([
          'one complete cycle',
          '2 complete cycles',
          '6 complete cycles',
        ]);
      }
    });

    it('names what came back only where a symptom came back in three of her cycles', () => {
      expect(whereItWasDrawn('the symptoms that came back')).toEqual(['6 complete cycles']);
    });

    it('draws what she asked for at every state, because an answer is hers from the first', () => {
      expect(whereItWasDrawn('the record for her doctor')).toEqual(
        states.map((state) => state.name),
      );
    });
  });

  describe('the record of the sections, which is what makes this a rule', () => {
    it('answers for every part the screen draws, at every state, and names one it cannot place', () => {
      expect(
        read.flatMap((at) => at.unanswered.map((part) => `${at.state.name}: ${part}`)),
      ).toEqual([]);
    });

    it('lets no two sections claim the same part, so a failure names one section', () => {
      expect(sectionsClaimingTheSamePart(read.flatMap((at) => at.drawn))).toEqual([]);
    });

    it('says why each section she is owed no sentence for simply goes', () => {
      const quiet = theSectionsOfTheScreenSheOpens.filter(
        (section) => section.insteadDraws === undefined,
      );

      expect(quiet.filter((section) => (section.simplyGoes ?? '').length === 0)).toEqual([]);
      expect(quiet).toHaveLength(7);
    });
  });
});
