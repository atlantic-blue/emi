import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { renderRouter, screen, within } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import {
  phasePageGuideTestID,
  phasePagePastHeadingTestID,
  phasePageTestID,
} from '../../../src/features/phase/PhasePage';
import { catalogueOf } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../../fixtures/herPhone';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'ru-RU' }]) }));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const theCycle = 28;
const aLutealDay = 20;

const theWordsToHer = 'Что вы можете чувствовать и как себе помочь';
const theImpersonalWords = 'Что можно чувствовать и как себе помочь';

async function sheOpensTheLutealPageInRussian(): Promise<void> {
  const today = dayOf(whenSheOpensIt);
  const started = addDays(today, -(aLutealDay - 1));
  await herPhoneHolds(
    whenSheOpensIt,
    [aBleedingDay(addDays(started, -theCycle)), aBleedingDay(started)],
    theCycle,
    5,
  );
  await renderRouter(appDirectory, { initialUrl: '/phase' });
  await screen.findByTestId(phasePageTestID);
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

describe('the link to the guide on the phase page in Russian', () => {
  it('should speak to her directly above her past luteal phases', async () => {
    await sheOpensTheLutealPageInRussian();
    const theLink = screen.getByTestId(phasePageGuideTestID);

    expect(screen.getByTestId(phasePagePastHeadingTestID)).toHaveTextContent(
      'В ваших прошлых лютеиновых фазах',
    );
    expect(within(theLink).getByText(theWordsToHer)).toBeTruthy();
    expect(within(theLink).queryByText(theImpersonalWords)).toBeNull();
  });

  it('should keep the English and Spanish words of the link', () => {
    expect(catalogueOf('en')['phase.guide.open']).toBe('How you may feel and what may help');
    expect(catalogueOf('es')['phase.guide.open']).toBe('Cómo puedes sentirte y qué puede ayudar');
  });
});
