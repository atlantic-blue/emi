import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { longTermItemsIn } from '../../../../tools/pipeline/documentation';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import { tourPriceTestID } from '../../src/features/onboarding/TourScreen';
import { tourCopy } from '../../src/features/onboarding/copy';
import { type Language, type Words, catalogueOf, languages, wordKeys } from '../../src/language';
import {
  type AProductInTheStore,
  theBlackFridayProduct,
  theMonthlyPlan,
  theProductsEmiSells,
  theYearlyPlan,
} from '../../src/services/store/theProducts';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const appDirectory = resolve(__dirname, '..', '..', 'src', 'app');

/** Midday, well away from any summer time change, so her first screen reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/**
 * The amount a product asks for, as a reader writes it. A product priced in whole euros is written
 * without the cents, because that is how every sentence of the product writes 39 and 5.
 */
function theAmountOf(product: AProductInTheStore): string {
  const euros = product.priceInEuroCents / 100;

  return product.priceInEuroCents % 100 === 0 ? String(euros) : euros.toFixed(2);
}

/**
 * A figure with a currency word beside it. The euro word is given in each language of the product,
 * and the separator is read into a full stop so an amount written in two languages compares.
 */
function theAmountsIn(said: string): string[] {
  const money = /(\d+(?:[.,]\d+)?)\s?(?:euros?|евро|€)/gi;

  return [...said.matchAll(money)].map(([, figure]) => (figure as string).replace(',', '.'));
}

/** How each language of the application says that the first month costs nothing. */
const theMonthIsFreeIn: Readonly<Record<Language, RegExp>> = {
  en: /month free/i,
  es: /mes gratis/i,
  ru: /месяц бесплатно/i,
};

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

function theWordsNamingMoneyIn(language: Language): string[] {
  const catalogue = catalogueOf(language);

  return wordKeys
    .filter((key) => formsOf(catalogue[key]).some((said) => theAmountsIn(said).length > 0))
    .sort();
}

function theTourLineIn(language: Language): string {
  return String(catalogueOf(language)['onboarding.tour.price.line']);
}

/**
 * A document read as the sentences it is made of, with the whitespace collapsed, so a sentence
 * still reads as one sentence when the document wraps it across two lines. A full stop inside an
 * amount carries no space after it, so it opens no sentence.
 */
function theSentencesOf(document: string): string[] {
  return document
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length > 0);
}

const aFreeMonth = /free month|month free|month (?:of that year )?is free/i;
const noFreeMonth = /no free month/i;

function promisesAFreeMonth(sentence: string): boolean {
  return aFreeMonth.test(sentence) && !noFreeMonth.test(sentence);
}

function deniesAFreeMonth(sentence: string): boolean {
  return noFreeMonth.test(sentence);
}

const theDocumentsThatNameAPrice = ['README.md', join('docs', 'features.md')] as const;

function theDocument(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

async function sheReachesTheTour(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
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

describe('the tour line, and every other price in the product', () => {
  describe('the amount a product asks for', () => {
    it('writes a whole number of euros without the cents, and a price point with them', () => {
      expect(theAmountOf(theYearlyPlan)).toBe('39');
      expect(theAmountOf(theMonthlyPlan)).toBe('5');
      expect(theAmountOf(theBlackFridayProduct)).toBe('19.99');
    });

    it('reads a figure with the euro word of each language beside it', () => {
      expect(theAmountsIn('39 euros a year')).toEqual(['39']);
      expect(theAmountsIn('39 евро в год')).toEqual(['39']);
      expect(theAmountsIn('19,99 euros al año')).toEqual(['19.99']);
      expect(theAmountsIn('70 symptoms, and one month')).toEqual([]);
    });
  });

  describe('the line of the tour', () => {
    it('asks for the amount the yearly product asks for, in every language', () => {
      for (const language of languages) {
        expect(theAmountsIn(theTourLineIn(language))).toEqual([theAmountOf(theYearlyPlan)]);
      }
    });

    it('promises the free month the yearly product carries, in every language', () => {
      expect(theYearlyPlan.freeMonth).toBe(true);

      for (const language of languages) {
        expect(theMonthIsFreeIn[language].test(theTourLineIn(language))).toBe(true);
      }
    });

    it('shows her that amount on the card she reads, after she presses Start', async () => {
      await sheReachesTheTour();

      const card = within(screen.getByTestId(tourPriceTestID));
      const line = card.getByText(tourCopy.price.line);

      expect(theAmountsIn(String(line.props.children))).toEqual([theAmountOf(theYearlyPlan)]);
    });

    it('is the one line of the application that names an amount, in every language', () => {
      for (const language of languages) {
        expect(theWordsNamingMoneyIn(language)).toEqual(['onboarding.tour.price.line']);
      }
    });
  });

  describe('the readme and the features document', () => {
    it('reads both documents, so nothing is measured on an empty file', () => {
      for (const file of theDocumentsThatNameAPrice) {
        expect(theDocument(file).length).toBeGreaterThan(0);
      }
    });

    it('names every amount the store sells, and no other amount', () => {
      const sold = new Set(theProductsEmiSells.map(theAmountOf));

      for (const file of theDocumentsThatNameAPrice) {
        expect(new Set(theAmountsIn(theDocument(file)))).toEqual(sold);
      }
    });

    it('promises a free month beside the yearly amount and beside no other', () => {
      const others = [theAmountOf(theMonthlyPlan), theAmountOf(theBlackFridayProduct)];

      for (const file of theDocumentsThatNameAPrice) {
        const promised = theSentencesOf(theDocument(file)).filter(promisesAFreeMonth);

        expect(promised.length).toBeGreaterThan(0);
        expect(
          promised.some((sentence) => theAmountsIn(sentence).includes(theAmountOf(theYearlyPlan))),
        ).toBe(true);

        for (const sentence of promised) {
          expect(theAmountsIn(sentence).filter((amount) => others.includes(amount))).toEqual([]);
        }
      }
    });

    it('indexes all three plans under the money of the long term list', () => {
      const money = longTermItemsIn(theDocument(join('docs', 'features.md'))).filter(
        (item) => item.group === 'Money',
      );

      expect(money.length).toBeGreaterThan(0);

      for (const product of theProductsEmiSells) {
        const named = money.filter((item) =>
          theAmountsIn(item.text).includes(theAmountOf(product)),
        );

        expect(named).toHaveLength(1);
        expect(promisesAFreeMonth(named[0]?.text ?? '')).toBe(product.freeMonth);
      }
    });

    it('says the monthly plan and the Black Friday plan carry no free month', () => {
      expect(theMonthlyPlan.freeMonth).toBe(false);
      expect(theBlackFridayProduct.freeMonth).toBe(false);

      for (const file of theDocumentsThatNameAPrice) {
        const denied = theSentencesOf(theDocument(file)).filter(deniesAFreeMonth);

        for (const product of [theMonthlyPlan, theBlackFridayProduct]) {
          const named = denied.filter((sentence) =>
            theAmountsIn(sentence).includes(theAmountOf(product)),
          );

          expect(named.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
