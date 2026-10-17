import { join } from 'node:path';

import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { highlightPageTestID } from '../../../src/features/highlight/HighlightPage';
import { highlightTestID } from '../../../src/features/highlight/HighlightRow';
import {
  hygienePageBackTestID,
  hygienePageHeadingTestID,
  hygienePageProductsTestID,
  hygienePageTestID,
  productTileTestID,
} from '../../../src/features/hygiene/HygieneProductsPage';
import {
  type ProductSection,
  productLineTestID,
  productPageBackTestID,
  productPageNameTestID,
  productPageNoteTestID,
  productPageSummaryTestID,
  productPageTestID,
  productSectionTestID,
} from '../../../src/features/hygiene/ProductPage';
import {
  hygieneAddress,
  productAddress,
  productOf,
  productOrder,
} from '../../../src/features/hygiene/products';
import { periodPageTestID } from '../../../src/features/period/PeriodPage';
import { periodAddress } from '../../../src/features/period/periodAddress';
import { english } from '../../../src/language/english';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { herPhoneHoldsTheseAnswers } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * Issue 304, from the hygieneProducts and hygieneCup boards: eight products in the order of the
 * board, each one opening a page with who it suits, advantages, disadvantages and written steps.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');

async function sheOpens(url: string): Promise<{ pathname: () => string }> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: 28,
      periodLengthDays: 5,
      name: 'Maria',
      recordedAt: whenSheOpensIt.toISOString(),
    },
    [],
  );
  const app = renderRouter(appDirectory, { initialUrl: url });
  await app;

  return { pathname: () => app.getPathname() };
}

function saidUnder(testID: string): string {
  return textIn(screen.getByTestId(testID)).join('');
}

async function press(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  resetExpoSqlite();
  resetExpoSecureStore();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the Hygiene products page', () => {
  it('should carry the title, the heading and eight products in the order of the board', async () => {
    await sheOpens(hygieneAddress);

    await screen.findByTestId(hygienePageTestID);
    expect(screen.getByText('Hygiene products')).toBeTruthy();
    expect(saidUnder(hygienePageHeadingTestID)).toBe('Choose a product to learn about it');
    expect(textIn(screen.getByTestId(hygienePageProductsTestID))).toEqual([
      'Panty liner',
      'Pad',
      'Reusable cloth pad',
      'Tampon',
      'Period underwear',
      'Menstrual cup',
      'Menstrual disc',
      'Sponge',
    ]);
  });

  it('should open from the Period page, and go back to it', async () => {
    await sheOpens(periodAddress());
    await screen.findByTestId(periodPageTestID);

    await press(highlightTestID('hygiene-products'));
    await screen.findByTestId(hygienePageTestID);
    await press(hygienePageBackTestID);

    expect(await screen.findByTestId(periodPageTestID)).toBeTruthy();
  });

  it('should no longer carry the four paragraphs it held before', async () => {
    await sheOpens(hygieneAddress);

    await screen.findByTestId(hygienePageTestID);
    expect(screen.queryByText(/A pad sticks inside your underwear/)).toBeNull();
    expect(
      Object.keys(english).filter((key) => /^highlight\.hygieneProducts\.\d/.test(key)),
    ).toEqual([]);
  });

  it('should send the old address of the highlight to the new page', async () => {
    const app = await sheOpens('/highlight/hygiene-products');

    expect(await screen.findByTestId(hygienePageTestID)).toBeTruthy();
    expect(screen.queryByTestId(highlightPageTestID)).toBeNull();
    expect(app.pathname()).toBe(hygieneAddress);
  });

  it('should send an address that names no product to the Hygiene products page', async () => {
    const app = await sheOpens(`${hygieneAddress}/nothing-here`);

    expect(await screen.findByTestId(hygienePageTestID)).toBeTruthy();
    expect(screen.queryByTestId(productPageTestID)).toBeNull();
    expect(app.pathname()).toBe(hygieneAddress);
  });
});

describe('the page of each product', () => {
  const sections: readonly ProductSection[] = ['suits', 'advantages', 'disadvantages', 'steps'];

  it.each(productOrder)(
    'should open the page of %s with its four sections, and come back',
    async (slug) => {
      const product = productOf(slug);
      await sheOpens(hygieneAddress);
      await screen.findByTestId(hygienePageTestID);

      await press(productTileTestID(slug));

      await screen.findByTestId(productPageTestID);
      expect(saidUnder(productPageNameTestID)).toBe(product.name);
      expect(saidUnder(productPageSummaryTestID)).toBe(product.summary);
      for (const section of sections) {
        expect(screen.getByTestId(productSectionTestID(section))).toBeTruthy();
      }
      expect(textIn(screen.getByTestId(productSectionTestID('suits')))[0]).toBe('Who it suits');
      expect(textIn(screen.getByTestId(productSectionTestID('advantages')))[0]).toBe('Advantages');
      expect(textIn(screen.getByTestId(productSectionTestID('disadvantages')))[0]).toBe(
        'Disadvantages',
      );
      expect(textIn(screen.getByTestId(productSectionTestID('steps')))[0]).toBe('How to use it');
      product.steps.forEach((step, index) => {
        expect(saidUnder(productLineTestID('steps', index))).toBe(step);
      });
      expect(saidUnder(productPageNoteTestID)).toBe(product.note);

      await press(productPageBackTestID);
      expect(await screen.findByTestId(hygienePageTestID)).toBeTruthy();
    },
  );

  it('should carry the words of the cup board exactly', async () => {
    await sheOpens(productAddress('menstrual-cup'));

    await screen.findByTestId(productPageTestID);
    expect(saidUnder(productPageNameTestID)).toBe('Menstrual cup');
    expect(saidUnder(productPageSummaryTestID)).toBe(
      'A soft cup that goes inside the vagina and collects blood. You empty it, wash it and use it again.',
    );
    expect([0, 1, 2].map((index) => saidUnder(productLineTestID('suits', index)))).toEqual([
      'People who want a product they can use again',
      'People who swim or do sport during their period',
      'People who are comfortable with a product that goes inside',
    ]);
    expect([0, 1, 2].map((index) => saidUnder(productLineTestID('advantages', index)))).toEqual([
      'You use it again, so you buy it less often',
      'It makes less waste than disposable products',
      'Nothing shows under your clothes',
    ]);
    expect([0, 1, 2].map((index) => saidUnder(productLineTestID('disadvantages', index)))).toEqual([
      'It can take a few periods to learn to put it in and take it out',
      'You need clean water to wash it',
      'You must choose a size',
    ]);
    expect([0, 1, 2, 3, 4].map((index) => saidUnder(productLineTestID('steps', index)))).toEqual([
      'Wash your hands.',
      'Fold the cup so that the rim is small.',
      'Put it in, rim first, and let it open.',
      'To take it out, pinch the base to release it, then pull it out slowly.',
      'Empty it, rinse it and put it back in.',
    ]);
    expect(saidUnder(productPageNoteTestID)).toBe(
      'The pack says how long you can wear it and how to clean it. Follow those instructions.',
    );
  });

  it('should give each product words of its own', () => {
    const summaries = productOrder.map((slug) => productOf(slug).summary);

    expect(new Set(summaries).size).toBe(productOrder.length);
  });
});
