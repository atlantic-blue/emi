import { join } from 'node:path';

import { phaseLabel } from '@emi/tokens';
import { getLocales } from 'expo-localization';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { dayTestID } from '../../../src/features/calendar/CycleMonth';
import { type Language, catalogueOf, forgetLanguage, russian } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import {
  herPhoneHoldsThreeRecordedCycles,
  theDayTheDrawingsSheetNames,
  theDaysTheDrawingFills,
  thePhaseTheRingSaysOn,
  theSheetSheReads,
} from '../../fixtures/theMonthSheOpens';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]) }));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = (): Date => new Date(`${theDayTheDrawingsSheetNames()}T12:00:00.000Z`);

function sheReadsIn(language: Language): void {
  jest.mocked(getLocales).mockReturnValue([{ languageTag: language } as never]);
  forgetLanguage();
}

/** A day of her period that has passed, so the card names a cycle day and a phase. */
function aDayOfHerPeriod(): string {
  const day = theDaysTheDrawingFills()[0];

  if (day === undefined) {
    throw new Error('the drawing of the month fills no day of her period');
  }

  return day;
}

async function sheReadsTheCardOf(day: string): Promise<string> {
  await renderRouter(appDirectory, { initialUrl: '/calendar' });
  await fireEvent.press(screen.getByTestId(dayTestID(day)));

  return String(theSheetSheReads()?.line);
}

describe('the day card names the phase in the language of the app', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt());
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHoldsThreeRecordedCycles(whenSheOpensIt());
  });

  afterEach(() => {
    jest.useRealTimers();
    sheReadsIn('en');
  });

  it('names the phase in Russian when the app is in Russian, and no English phase name', async () => {
    const day = aDayOfHerPeriod();

    sheReadsIn('ru');
    const line = await sheReadsTheCardOf(day);

    expect(thePhaseTheRingSaysOn(day)).toBe('period');
    expect(line).toContain(`, ${String(russian['cycle.phaseName.period']).toLowerCase()}`);
    expect(line).not.toContain(phaseLabel.period.toLowerCase());
  });

  it.each<Language>(['en', 'es', 'ru'])(
    'names the phase as the %s catalogue names it',
    async (language) => {
      const day = aDayOfHerPeriod();
      const phase = thePhaseTheRingSaysOn(day) ?? 'period';

      sheReadsIn(language);
      const line = await sheReadsTheCardOf(day);

      expect(line).toContain(
        String(catalogueOf(language)[`cycle.phaseName.${phase}`]).toLowerCase(),
      );
    },
  );
});
