import { getLocales } from 'expo-localization';

import { confidenceFor } from '@emi/cycle';

import type { Forecast, Learning } from '@emi/cycle';
import type { Locale } from 'expo-localization';

import { theWaitSaid } from '../../../src/features/calendar/copy';
import { theWaitForHerNextPeriod } from '../../../src/features/calendar/theWait';
import { type Language, forgetLanguage } from '../../../src/language';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]),
}));

const asAPhone = getLocales as jest.MockedFunction<typeof getLocales>;

/** A settled forecast whose range runs from the 14th to the 18th of November. */
const aForecast: Forecast = {
  kind: 'forecast',
  fromCycles: 4,
  medianLengthDays: 28,
  spreadDays: 1.5,
  confidence: confidenceFor(1.5),
  expectedStart: '2026-11-16',
  start: { from: '2026-11-14', to: '2026-11-18' },
  estimatedOvulation: '2026-11-03',
  fertileWindow: { from: '2026-10-29', to: '2026-11-04' },
  lutealLengthDays: 13,
};

describe('the wait for her next period', () => {
  it('counts to both ends of the range while the range is ahead of her', () => {
    expect(theWaitForHerNextPeriod(aForecast, '2026-11-10')).toEqual({
      fromDays: 4,
      kind: 'in',
      toDays: 8,
    });
    expect(theWaitForHerNextPeriod(aForecast, '2026-11-13')).toEqual({
      fromDays: 1,
      kind: 'in',
      toDays: 5,
    });
  });

  it('counts to the end of the range once the range has opened', () => {
    expect(theWaitForHerNextPeriod(aForecast, '2026-11-14')).toEqual({
      kind: 'within',
      toDays: 4,
    });
    expect(theWaitForHerNextPeriod(aForecast, '2026-11-17')).toEqual({
      kind: 'within',
      toDays: 1,
    });
  });

  it('says today on the last day of the range, and late after it', () => {
    expect(theWaitForHerNextPeriod(aForecast, '2026-11-18')).toEqual({ kind: 'today' });
    expect(theWaitForHerNextPeriod(aForecast, '2026-11-21')).toEqual({ daysLate: 3, kind: 'late' });
  });

  it('counts from the range while Emi is still learning, and is nothing with no range', () => {
    const withALength: Learning = {
      kind: 'learning',
      completeCycles: 1,
      needsCycles: 2,
      start: { from: '2026-11-14', to: '2026-11-18' },
    };
    const withoutALength: Learning = { kind: 'learning', completeCycles: 0, needsCycles: 2 };

    expect(theWaitForHerNextPeriod(withALength, '2026-11-10')).toEqual({
      fromDays: 4,
      kind: 'in',
      toDays: 8,
    });
    expect(theWaitForHerNextPeriod(withoutALength, '2026-11-10')).toBeUndefined();
  });
});

describe('the words of the wait', () => {
  afterEach(() => {
    forgetLanguage();
  });

  it('are English, and never name one day as the start', () => {
    readingIn('en');

    expect(theWaitSaid({ fromDays: 4, kind: 'in', toDays: 8 })).toBe(
      'Your next period is likely to start in 4 to 8 days.',
    );
    expect(theWaitSaid({ kind: 'within', toDays: 1 })).toBe(
      'Your next period is likely to start within 1 day.',
    );
    expect(theWaitSaid({ kind: 'within', toDays: 4 })).toBe(
      'Your next period is likely to start within 4 days.',
    );
    expect(theWaitSaid({ kind: 'today' })).toBe('Your next period is likely to start today.');
    expect(theWaitSaid({ daysLate: 3, kind: 'late' })).toBe('Your period is 3 days late');
  });

  it('are Spanish', () => {
    readingIn('es');

    expect(theWaitSaid({ fromDays: 4, kind: 'in', toDays: 8 })).toBe(
      'Es probable que tu próximo periodo empiece dentro de 4 a 8 días.',
    );
    expect(theWaitSaid({ kind: 'within', toDays: 1 })).toBe(
      'Es probable que tu próximo periodo empiece en un plazo de 1 día.',
    );
  });

  it('take the Russian form of the last number, for 2, 5 and 21', () => {
    readingIn('ru');

    expect(theWaitSaid({ fromDays: 1, kind: 'in', toDays: 2 })).toBe(
      'До следующих месячных, скорее всего, от 1 до 2 дней.',
    );
    expect(theWaitSaid({ fromDays: 3, kind: 'in', toDays: 5 })).toBe(
      'До следующих месячных, скорее всего, от 3 до 5 дней.',
    );
    expect(theWaitSaid({ fromDays: 17, kind: 'in', toDays: 21 })).toBe(
      'До следующих месячных, скорее всего, от 17 до 21 дня.',
    );
    expect(theWaitSaid({ kind: 'within', toDays: 1 })).toBe(
      'Следующие месячные, скорее всего, начнутся в течение 1 дня.',
    );
  });
});

function aPhoneSetTo(tag: string): Locale {
  return {
    languageTag: tag,
    languageCode: tag.split('-')[0] ?? null,
    languageScriptCode: null,
    regionCode: null,
    languageRegionCode: null,
    currencyCode: null,
    currencySymbol: null,
    languageCurrencyCode: null,
    languageCurrencySymbol: null,
    decimalSeparator: null,
    digitGroupingSeparator: null,
    textDirection: 'ltr',
    measurementSystem: null,
    temperatureUnit: null,
  };
}

function readingIn(language: Language): void {
  const tags: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

  asAPhone.mockReturnValue([aPhoneSetTo(tags[language])]);
  forgetLanguage();
}
