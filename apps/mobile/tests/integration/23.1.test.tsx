import { resolve } from 'node:path';

import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { describeClaim } from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { cycleRingTestID } from '../../src/components/CycleRing';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import {
  tourLegendTestID,
  tourLinesTestID,
  tourPriceTestID,
  tourScreenTestID,
  tourTitleTestID,
} from '../../src/features/onboarding/TourScreen';
import { firstRunCopy, tourCopy } from '../../src/features/onboarding/copy';
import { type Language, type Words, catalogueOf, languages, wordKeys } from '../../src/language';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The first two screens she meets, the welcome and the tour, say what the redesign says. The
 * words are read off the screens she opens and off each of the three catalogues, so a sentence
 * rewritten in English and left behind in Spanish fails here.
 */

const appDirectory = resolve(__dirname, '..', '..', 'src', 'app');

/** Midday, well away from any summer time change, so her first screen reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const whatTheWelcomeSays = {
  title: 'Your cycle and how you feel, in one place.',
  lines: [
    'Log your periods and how you feel, to understand your cycle better.',
    'There is no account. Emi never asks for your email address or a password.',
    "Emi does not replace a doctor's advice. Emi is not a contraceptive. Emi is not a medical device.",
  ],
  action: 'Start',
};

/** What the welcome said before it led with what she can log, in each language. */
const whatTheWelcomeSaidBefore: Readonly<Record<Language, readonly string[]>> = {
  en: [
    'Emi learns your cycle. You keep your data.',
    'Your cycle is worked out on this phone.',
    'Emi shows you what your own records say, and nothing more.',
  ],
  es: [
    'Emi aprende tu ciclo. Tus datos son tuyos.',
    'Tu ciclo se calcula en este teléfono.',
    'Emi te muestra lo que dicen tus propios registros, y nada más.',
  ],
  ru: [
    'Emi изучает ваш цикл. Ваши данные остаются у вас.',
    'Ваш цикл считается на этом телефоне.',
    'Emi показывает то, что говорят ваши собственные записи, и ничего больше.',
  ],
};

/** The line that says what Emi is not, in each language, which every language must carry. */
const whatEmiIsNot: Readonly<Record<Language, string>> = {
  en: "Emi does not replace a doctor's advice. Emi is not a contraceptive. Emi is not a medical device.",
  es: 'Emi no sustituye el consejo de un médico. Emi no es un anticonceptivo. Emi no es un dispositivo médico.',
  ru: 'Emi не заменяет консультацию врача. Emi не является средством контрацепции. Emi не является медицинским изделием.',
};

const whatTheTourSays = {
  title: 'Your cycle, in one ring.',
  lines: [
    'The ring is your cycle. A pointer marks today, and the number inside it is the day you are on.',
    'Four arcs divide the ring: the days you bleed, the days after them, the days around ovulation, and the days before your next period.',
  ],
  legend: ['Period', 'After it', 'Ovulation', 'Before the next'],
  price: ['Yours, and it stays yours', 'One month free, then 29.99 pounds a year.'],
};

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

/** Every word of the welcome and the tour in one language, out of that language's own catalogue. */
function theWordsOfTheFirstOpenIn(language: Language): string[] {
  const catalogue = catalogueOf(language);

  return wordKeys
    .filter((key) => key.startsWith('onboarding.tour.') || key.startsWith('onboarding.welcome.'))
    .flatMap((key) => formsOf(catalogue[key]));
}

async function sheOpensEmi(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
}

async function sheReachesTheTour(): Promise<void> {
  await sheOpensEmi();
  await fireEvent.press(screen.getByTestId(onboardingActionTestID));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  resetExpoSqlite();
  resetExpoSecureStore();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the welcome and the tour say what the redesign says', () => {
  describe('the welcome', () => {
    it('carries the title, the three lines and the button the design draws', async () => {
      await sheOpensEmi();

      const welcome = within(screen.getByTestId('onboarding-welcome'));

      expect(welcome.getByText(whatTheWelcomeSays.title)).toBeTruthy();
      for (const line of whatTheWelcomeSays.lines) {
        expect(welcome.getByText(line)).toBeTruthy();
      }
      expect(welcome.getByTestId(onboardingActionTestID)).toHaveTextContent(
        whatTheWelcomeSays.action,
      );
      expect(firstRunCopy.welcome.lines).toEqual(whatTheWelcomeSays.lines);
    });

    it('no longer says where her cycle is worked out or that Emi learns it, in any language', () => {
      for (const language of languages) {
        const said = theWordsOfTheFirstOpenIn(language);
        const left = whatTheWelcomeSaidBefore[language].filter((old) =>
          said.some((line) => line.includes(old)),
        );

        expect({ language, left }).toEqual({ language, left: [] });
      }
      expect(wordKeys).not.toContain('onboarding.welcome.line.onThisPhone');
    });

    it('says in every language that Emi does not replace a doctor, with the two denials after it', () => {
      for (const language of languages) {
        expect({
          language,
          said: catalogueOf(language)['onboarding.welcome.line.whatEmiIs'],
        }).toEqual({ language, said: whatEmiIsNot[language] });
      }
    });

    it('never says nothing is sent, because the delete sends a request', () => {
      for (const language of languages) {
        const said = theWordsOfTheFirstOpenIn(language).join('\n').toLowerCase();

        expect({
          language,
          sent: /nothing is sent|no se envía|не отправляется/.test(said),
        }).toEqual({ language, sent: false });
      }
    });
  });

  describe('the tour', () => {
    it('carries the title, the two lines, the legend and the price the design draws', async () => {
      await sheReachesTheTour();

      const tour = within(screen.getByTestId(tourScreenTestID));

      expect(tour.getByTestId(tourTitleTestID)).toHaveTextContent(whatTheTourSays.title);
      for (const line of whatTheTourSays.lines) {
        expect(within(tour.getByTestId(tourLinesTestID)).getByText(line)).toBeTruthy();
      }
      for (const word of whatTheTourSays.legend) {
        expect(within(tour.getByTestId(tourLegendTestID)).getByText(word)).toBeTruthy();
      }
      for (const line of whatTheTourSays.price) {
        expect(within(tour.getByTestId(tourPriceTestID)).getByText(line)).toBeTruthy();
      }
      expect(tourCopy.lines).toEqual(whatTheTourSays.lines);
    });

    it('names the day in the middle of the ring rather than a phase, day 12 of 29', async () => {
      await sheReachesTheTour();

      const ring = within(screen.getByTestId(cycleRingTestID));

      expect(ring.getByText('Day')).toBeTruthy();
      expect(ring.getByText('12')).toBeTruthy();
      expect(ring.getByText('of 29')).toBeTruthy();
    });

    it('draws every phase of the ring in its full colour, because the cycle it draws is not hers', async () => {
      await sheReachesTheTour();

      const daysAhead = screen.getAllByTestId(/^ring-arc-.+-ahead$/);

      expect(daysAhead.length).toBeGreaterThan(0);
      expect(daysAhead.map((arc) => arc.props.opacity)).toEqual(daysAhead.map(() => undefined));
    });
  });

  describe('in each language she can read them in', () => {
    it('are her own language, and never the English words left behind', () => {
      const english = theWordsOfTheFirstOpenIn('en');

      for (const language of languages.filter((each) => each !== 'en')) {
        const said = theWordsOfTheFirstOpenIn(language);
        const same = said.filter((line) => english.includes(line));

        expect({ language, same }).toEqual({ language, same: [] });
        expect(said).toHaveLength(english.length);
      }

      expect(languages.length).toBe(3);
    });

    it('say no word a screen refuses', () => {
      for (const language of languages) {
        const claims = interfaceClaimsIn(
          `the welcome and the tour in ${language}`,
          theWordsOfTheFirstOpenIn(language).join('\n'),
        );

        expect(claims.map(describeClaim)).toEqual([]);
      }
    });
  });
});
