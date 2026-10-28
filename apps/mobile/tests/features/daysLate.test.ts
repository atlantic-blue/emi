import { getLocales } from 'expo-localization';

import { confidenceFor } from '@emi/cycle';

import type { Forecast, Learning } from '@emi/cycle';
import type { Locale } from 'expo-localization';

import { lateSentence } from '../../src/features/forecast/copy';
import { daysLate } from '../../src/features/forecast/daysLate';
import { type Language, forgetLanguage } from '../../src/language';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]),
}));

const asAPhone = getLocales as jest.MockedFunction<typeof getLocales>;

/** A settled forecast whose window runs from the 14th to the 18th of November. */
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

describe('the days a period is late', () => {
  it('is nothing on the last day of the window', () => {
    expect(daysLate(aForecast, '2026-11-18')).toBeUndefined();
  });

  it('is nothing inside the window and before it', () => {
    expect(daysLate(aForecast, '2026-11-14')).toBeUndefined();
    expect(daysLate(aForecast, '2026-11-02')).toBeUndefined();
  });

  it('is one on the first day after the window', () => {
    expect(daysLate(aForecast, '2026-11-19')).toBe(1);
  });

  it('counts on for many days, with no upper limit', () => {
    expect(daysLate(aForecast, '2026-11-25')).toBe(7);
    expect(daysLate(aForecast, '2027-02-16')).toBe(90);
  });

  it('counts across the end of a month and a year', () => {
    const inDecember: Forecast = { ...aForecast, start: { from: '2026-12-27', to: '2026-12-31' } };

    expect(daysLate(inDecember, '2027-01-02')).toBe(2);
  });

  it('counts from the range while Emi is still learning, as it does for a forecast', () => {
    const withALength: Learning = {
      kind: 'learning',
      completeCycles: 1,
      needsCycles: 2,
      start: { from: '2026-11-14', to: '2026-11-18' },
    };

    expect(daysLate(withALength, '2026-11-18')).toBeUndefined();
    expect(daysLate(withALength, '2026-11-19')).toBe(1);
    expect(daysLate(withALength, '2026-11-30')).toBe(12);
  });

  it('is nothing while Emi is still learning and has no range to count from', () => {
    const withoutALength: Learning = { kind: 'learning', completeCycles: 0, needsCycles: 2 };

    expect(daysLate(withoutALength, '2026-11-30')).toBeUndefined();
  });
});

describe('the words for a late period', () => {
  afterEach(() => {
    forgetLanguage();
  });

  it('are English for one day and for many days', () => {
    readingIn('en');

    expect(lateSentence(1)).toBe('Your period is 1 day late');
    expect(lateSentence(2)).toBe('Your period is 2 days late');
    expect(lateSentence(21)).toBe('Your period is 21 days late');
  });

  it('are Spanish for one day and for many days', () => {
    readingIn('es');

    expect(lateSentence(1)).toBe('Tu regla se retrasa 1 día');
    expect(lateSentence(2)).toBe('Tu regla se retrasa 2 días');
    expect(lateSentence(21)).toBe('Tu regla se retrasa 21 días');
  });

  it('take the Russian form for 1, 2, 5 and 21', () => {
    readingIn('ru');

    expect(lateSentence(1)).toBe('Месячные задерживаются на 1 день');
    expect(lateSentence(2)).toBe('Месячные задерживаются на 2 дня');
    expect(lateSentence(5)).toBe('Месячные задерживаются на 5 дней');
    expect(lateSentence(21)).toBe('Месячные задерживаются на 21 день');
  });

  it('take the Russian many form for 11, which ends in one', () => {
    readingIn('ru');

    expect(lateSentence(11)).toBe('Месячные задерживаются на 11 дней');
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
