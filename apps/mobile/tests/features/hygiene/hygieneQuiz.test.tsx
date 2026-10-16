import { join } from 'node:path';

import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listDayLogs } from '../../../src/data/dayLogRepository';
import {
  quizBackTestID,
  quizChoiceTestID,
  quizCounterTestID,
  quizNextTestID,
  quizPrivacyTestID,
  quizQuestionTestID,
  quizStepTestID,
  quizTestID,
} from '../../../src/features/hygiene/HygieneQuiz';
import { hygienePageTestID } from '../../../src/features/hygiene/HygieneProductsPage';
import {
  productPageNameTestID,
  productPageTestID,
} from '../../../src/features/hygiene/ProductPage';
import { quizCardTestID } from '../../../src/features/hygiene/QuizCard';
import { quizCloseTestID } from '../../../src/features/hygiene/QuizHeader';
import {
  quizAnswerAgainTestID,
  quizResultDisclaimerTestID,
  quizResultHeadingTestID,
  quizResultTestID,
  quizSeeAllTestID,
  quizSuggestionTestID,
} from '../../../src/features/hygiene/QuizResult';
import { hygieneAddress, quizAddress } from '../../../src/features/hygiene/products';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { itemsInTheKeychain, resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { herDatabase, herPhoneHoldsTheseAnswers } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * Issue 306, from the hygieneQuiz and hygieneQuizResult boards: the card on the Hygiene products
 * page opens four questions, Next waits for an answer, and the result names two products that open
 * their own pages. Nothing she answers is saved.
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

function isReady(testID: string): boolean {
  return screen.getByTestId(testID).props.accessibilityState?.disabled !== true;
}

async function press(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The answers of the result board: pads now, sex sometimes, sport often, and to use it again. */
async function sheAnswersAsTheBoardDoes(): Promise<void> {
  await press(quizChoiceTestID('now', 'pads'));
  await press(quizNextTestID);
  await press(quizChoiceTestID('sex', 'sometimes'));
  await press(quizNextTestID);
  await press(quizChoiceTestID('sport', 'often'));
  await press(quizNextTestID);
  await press(quizChoiceTestID('reusable', 'yes'));
  await press(quizNextTestID);
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

describe('Find a product to try', () => {
  it('should open from the card on the Hygiene products page, and close back to it', async () => {
    await sheOpens(hygieneAddress);
    await screen.findByTestId(hygienePageTestID);

    expect(textIn(screen.getByTestId(quizCardTestID))).toEqual([
      'Find a product to try',
      'Four short questions',
    ]);
    await press(quizCardTestID);
    await screen.findByTestId(quizTestID);
    await press(quizCloseTestID);

    expect(await screen.findByTestId(hygienePageTestID)).toBeTruthy();
  });

  it('should ask the four approved questions, one on each screen, with a true counter', async () => {
    await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);
    const asked: string[] = [];
    const counted: string[] = [];

    for (const [question, choice] of [
      ['now', 'other'],
      ['sex', 'no'],
      ['sport', 'no'],
      ['reusable', 'either'],
    ] as const) {
      asked.push(saidUnder(quizQuestionTestID));
      counted.push(saidUnder(quizCounterTestID));
      await press(quizChoiceTestID(question, choice));
      await press(quizNextTestID);
    }

    expect(asked).toEqual([
      'What do you use now?',
      'Do you have sex during your period?',
      'Do you swim or do sport during your period?',
      'Do you want a product you can use again?',
    ]);
    expect(counted).toEqual([
      'Question 1 of 4',
      'Question 2 of 4',
      'Question 3 of 4',
      'Question 4 of 4',
    ]);
  });

  it('should draw the answers of the second question in the words of the board', async () => {
    await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);
    await press(quizChoiceTestID('now', 'tampons'));
    await press(quizNextTestID);

    expect(
      ['often', 'sometimes', 'no', 'ratherNotSay'].map((choice) =>
        saidUnder(quizChoiceTestID('sex', choice)),
      ),
    ).toEqual(['Yes, often', 'Sometimes', 'No', 'Rather not say']);
    expect(saidUnder(quizPrivacyTestID)).toBe('Emi does not save these answers.');
  });

  it('should hold Next until she picks an answer, and pick nothing for her', async () => {
    await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);

    expect(isReady(quizNextTestID)).toBe(false);
    await press(quizNextTestID);
    expect(saidUnder(quizCounterTestID)).toBe('Question 1 of 4');
    expect(
      screen.getByTestId(quizChoiceTestID('now', 'pads')).props.accessibilityState?.checked,
    ).toBe(false);

    await press(quizChoiceTestID('now', 'pads'));
    expect(isReady(quizNextTestID)).toBe(true);
  });

  it('should fill one bar for each question she has reached', async () => {
    await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);
    await press(quizChoiceTestID('now', 'pads'));
    await press(quizNextTestID);

    const filled = [0, 1, 2, 3].map((index) => {
      const style = screen.getByTestId(quizStepTestID(index)).props.style as unknown[];
      return style[1] !== null;
    });
    expect(filled).toEqual([true, true, false, false]);
  });

  it('should go back a question with her answer still picked, and have no Back on the first', async () => {
    await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);

    expect(screen.queryByTestId(quizBackTestID)).toBeNull();
    await press(quizChoiceTestID('now', 'underwear'));
    await press(quizNextTestID);
    await press(quizBackTestID);

    expect(saidUnder(quizCounterTestID)).toBe('Question 1 of 4');
    expect(
      screen.getByTestId(quizChoiceTestID('now', 'underwear')).props.accessibilityState?.checked,
    ).toBe(true);
  });

  it('should name two products with their reasons, and say it is not medical advice', async () => {
    await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);
    await sheAnswersAsTheBoardDoes();

    await screen.findByTestId(quizResultTestID);
    expect(saidUnder(quizResultHeadingTestID)).toBe('Two products you could try');
    expect(saidUnder(quizResultDisclaimerTestID)).toBe(
      'This is a suggestion, not medical advice. Read about each product to see if it suits you.',
    );
    expect(textIn(screen.getByTestId(quizSuggestionTestID('menstrual-disc')))).toEqual([
      'Menstrual disc',
      'You said you sometimes have sex during your period. Some people wear a disc then.',
    ]);
    expect(textIn(screen.getByTestId(quizSuggestionTestID('menstrual-cup')))).toEqual([
      'Menstrual cup',
      'You said you want a product you can use again, and you swim or do sport.',
    ]);
  });

  it('should open the page of a suggested product', async () => {
    const app = await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);
    await sheAnswersAsTheBoardDoes();
    await press(quizSuggestionTestID('menstrual-disc'));

    await screen.findByTestId(productPageTestID);
    expect(saidUnder(productPageNameTestID)).toBe('Menstrual disc');
    expect(app.pathname()).toBe('/hygiene/menstrual-disc');
  });

  it('should start again with no answer picked when she answers again', async () => {
    await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);
    await sheAnswersAsTheBoardDoes();
    await press(quizAnswerAgainTestID);

    expect(saidUnder(quizCounterTestID)).toBe('Question 1 of 4');
    expect(isReady(quizNextTestID)).toBe(false);
  });

  it('should go to all products from the result', async () => {
    await sheOpens(hygieneAddress);
    await screen.findByTestId(hygienePageTestID);
    await press(quizCardTestID);
    await screen.findByTestId(quizTestID);
    await sheAnswersAsTheBoardDoes();
    await press(quizSeeAllTestID);

    expect(await screen.findByTestId(hygienePageTestID)).toBeTruthy();
  });

  it('should save nothing she answers, in the day log or in the keychain', async () => {
    await sheOpens(quizAddress);
    await screen.findByTestId(quizTestID);
    const daysBefore = listDayLogs(herDatabase());
    const keychainBefore = itemsInTheKeychain();

    await sheAnswersAsTheBoardDoes();
    await screen.findByTestId(quizResultTestID);

    expect(listDayLogs(herDatabase())).toEqual(daysBefore);
    expect(itemsInTheKeychain()).toEqual(keychainBefore);
  });
});
