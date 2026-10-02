import { resolve } from 'node:path';

import { renderRouter, screen, within } from 'expo-router/testing-library';

import {
  approvedDenials,
  describeClaim,
  searchableText,
} from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { type Language, type Words, catalogueOf, languages, wordKeys } from '../../src/language';
import { tourScreenTestID } from '../../src/features/onboarding/TourScreen';
import { type TourCard, tourCards, tourCopy } from '../../src/features/onboarding/copy';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The first card the tour shows her, and the voice the four of them are written in.
 *
 * The words are read off the screen she actually opens, and off each of the three catalogues, so
 * a sentence rewritten in English and left behind in Spanish fails here. The honesty gates are
 * run over the same words, because the voice changed and the denials did not.
 */

const appDirectory = resolve(__dirname, '..', '..', 'src', 'app');

/** Midday, well away from any summer time change, so her first screen reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** The three sentences of the first card, which is the first thing Emi ever says to her. */
const whatTheFirstCardSays = {
  title: 'This ring is your cycle.',
  dot: "The dot is today. The number inside it tells you which day of your cycle you're on.",
  colours:
    'The four colours are the four parts of your cycle: your period, the days after it, the days around ovulation, and the days before your next period.',
};

/** How each language writes the first person plural, which is how the tour talks about Emi now. */
const howEachLanguageSaysWe: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(we|our)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(nos|nuestro|nuestra)(?!\p{Letter})|mos(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(мы|наш)/iu,
};

const toHer = /(?<!\p{Letter})(you|your)(?!\p{Letter})/iu;

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

/** Every word of the four cards in one language, out of that language's own catalogue. */
function theWordsOfTheTourIn(language: Language): string[] {
  const catalogue = catalogueOf(language);

  return wordKeys
    .filter((key) => key.startsWith('onboarding.tour.'))
    .flatMap((key) => formsOf(catalogue[key]));
}

function theDenialStartingWith(beginning: string): string {
  const found = approvedDenials.find((denial) => denial.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no approved denial starts with "${beginning}"`);
  }

  return found;
}

async function sheOpensEmi(): Promise<void> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;
}

/** Which card is drawn right now, read off the screen rather than counted by the test. */
function theCardSheIsOn(): TourCard | undefined {
  return tourCards.find((card) => screen.queryByTestId(tourScreenTestID(card)) !== null);
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

describe('the tour tells her the ring is her cycle', () => {
  describe('the first card she opens Emi on', () => {
    it('says the ring is her cycle, the dot is today, and what the number inside it means', async () => {
      await sheOpensEmi();

      expect(theCardSheIsOn()).toBe('ring');

      const card = within(screen.getByTestId(tourScreenTestID('ring')));

      expect(card.getByText(whatTheFirstCardSays.title)).toBeTruthy();
      expect(card.getByText(whatTheFirstCardSays.dot)).toBeTruthy();
      expect(card.getByText(whatTheFirstCardSays.colours)).toBeTruthy();
    });

    it('speaks to her as you, and names Emi nowhere', () => {
      for (const line of [tourCopy.ring.title, ...tourCopy.ring.lines]) {
        expect({ line, speaksToHer: toHer.test(line) }).toEqual({ line, speaksToHer: true });
        expect(line).not.toContain('Emi');
      }
    });
  });

  describe('the four cards, in each language she can read them in', () => {
    it('say what we do for her rather than what Emi does', () => {
      for (const language of languages) {
        const read = theWordsOfTheTourIn(language).join('\n');

        expect({ language, asWe: howEachLanguageSaysWe[language].test(read) }).toEqual({
          language,
          asWe: true,
        });
      }

      expect(languages.length).toBe(3);
    });

    it('name Emi only in the two denials, which is the one place the voice allows it', () => {
      for (const language of languages) {
        const read = searchableText(theWordsOfTheTourIn(language).join('\n'));

        expect({ language, aboutEmi: read.includes('Emi') }).toEqual({ language, aboutEmi: false });
      }
    });

    it('are her own language, and never the English words left behind', () => {
      const english = theWordsOfTheTourIn('en');

      for (const language of languages.filter((each) => each !== 'en')) {
        const said = theWordsOfTheTourIn(language);
        const same = said.filter((line) => english.includes(line));

        expect({ language, same }).toEqual({ language, same: [] });
        expect(said).toHaveLength(english.length);
        expect(said.length).toBeGreaterThan(12);
      }
    });
  });

  describe('the honesty the new words keep', () => {
    it('carries the two denials on the card that names a forecast, each after a full stop', () => {
      const theFirstDenial = theDenialStartingWith('Emi is not a c');
      const theSecondDenial = theDenialStartingWith('Emi is not a m');
      const denying = tourCopy.range.lines.filter((line) => line.includes(theFirstDenial));

      expect(denying).toHaveLength(1);
      expect(denying[0]).toContain(theSecondDenial);
      expect(denying[0]?.startsWith(theFirstDenial)).toBe(false);
    });

    it('says no word a screen refuses, in any of the three languages', () => {
      for (const language of languages) {
        const claims = interfaceClaimsIn(
          `the tour in ${language}`,
          theWordsOfTheTourIn(language).join('\n'),
        );

        expect(claims.map(describeClaim)).toEqual([]);
      }
    });

    it('leaves the four cards, their order and their count alone', () => {
      expect([...tourCards]).toEqual(['ring', 'range', 'records', 'yours']);
    });
  });
});
