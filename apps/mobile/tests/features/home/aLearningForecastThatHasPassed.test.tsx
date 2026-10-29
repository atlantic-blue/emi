import { join } from 'node:path';

import { addDays, startWhileLearning } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import {
  learningLateTestID,
  learningRangeTestID,
  learningTestID,
} from '../../../src/features/forecast/Learning';
import { lateSentence, rangeSentence } from '../../../src/features/forecast/copy';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, herPhoneHolds } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]) }));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const herOnlyPeriodStarted = '2026-08-03';
const sheSaidHerCycleRuns = 28;
const theRange = startWhileLearning(herOnlyPeriodStarted, sheSaidHerCycleRuns);

const middayOn = (day: string): Date => new Date(`${day}T12:00:00.000Z`);

async function sheOpensHomeOn(day: string): Promise<void> {
  jest.setSystemTime(middayOn(day));
  await herPhoneHolds(
    middayOn(herOnlyPeriodStarted),
    [0, 1, 2, 3, 4].map((offset) => aBleedingDay(addDays(herOnlyPeriodStarted, offset))),
    sheSaidHerCycleRuns,
  );
  await renderRouter(appDirectory, { initialUrl: '/' });
}

function theLearningCardSays(): string {
  return textIn(screen.getByTestId(learningTestID)).join(' ');
}

describe('Home while Emi is still learning, after the range of the next period has passed', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('says the period is 1 day late on the day after the range ends, and not the range', async () => {
    await sheOpensHomeOn(addDays(theRange.to, 1));

    expect(screen.getByTestId(learningLateTestID)).toHaveTextContent(lateSentence(1));
    expect(screen.queryByTestId(learningRangeTestID)).toBeNull();
    expect(theLearningCardSays()).not.toContain(rangeSentence(theRange));
  });

  it('counts on as the days pass', async () => {
    await sheOpensHomeOn(addDays(theRange.to, 6));

    expect(screen.getByTestId(learningLateTestID)).toHaveTextContent(lateSentence(6));
  });

  it('keeps the range on the last day of the range', async () => {
    await sheOpensHomeOn(theRange.to);

    expect(screen.getByTestId(learningRangeTestID)).toHaveTextContent(rangeSentence(theRange));
    expect(screen.queryByTestId(learningLateTestID)).toBeNull();
  });
});
