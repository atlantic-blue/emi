import { nextPeriodWords, ovulationWords } from '../../../src/features/home/copy';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'ru-RU' }]) }));

describe('the countdown on the ring of Today, in Russian', () => {
  it.each([
    [21, 'До месячных от 15 до 21 дня'],
    [22, 'До месячных от 15 до 22 дней'],
    [25, 'До месячных от 15 до 25 дней'],
  ])('should write a range that ends on %i in its own form', (toDays, said) => {
    expect(nextPeriodWords({ fromDays: 15, kind: 'in', toDays })).toBe(said);
  });

  it('should name the ovulation as the expected one, which marks it as an estimate', () => {
    expect(ovulationWords({ fromDays: 3, kind: 'in', toDays: 7 })).toBe(
      'До предполагаемой овуляции от 3 до 7 дней',
    );
  });
});
