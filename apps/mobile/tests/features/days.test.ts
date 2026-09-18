import { dayLabel, daysBackFrom, localDay } from '../../src/features/onboarding/days';

describe('the days she picks from', () => {
  describe('the day her own clock is on', () => {
    it('is read from the local parts of the date, never from Coordinated Universal Time', () => {
      const lateEvening = new Date(2026, 4, 14, 23, 30);

      expect(localDay(lateEvening)).toBe('2026-05-14');
    });

    it('pads a single digit month and day', () => {
      expect(localDay(new Date(2026, 0, 3, 9, 0))).toBe('2026-01-03');
    });

    it('refuses a date that is not a date', () => {
      expect(() => localDay(new Date('not a day'))).toThrow(/not a date/);
    });
  });

  describe('the list she scrolls', () => {
    it('starts on today and walks backwards', () => {
      expect(daysBackFrom('2026-05-14', 3)).toEqual(['2026-05-14', '2026-05-13', '2026-05-12']);
    });

    it('crosses the start of a month', () => {
      expect(daysBackFrom('2026-03-01', 2)).toEqual(['2026-03-01', '2026-02-28']);
    });

    it('crosses the twenty ninth of February in a leap year', () => {
      expect(daysBackFrom('2028-03-01', 2)).toEqual(['2028-03-01', '2028-02-29']);
    });

    it('refuses a list of no days', () => {
      expect(() => daysBackFrom('2026-05-14', 0)).toThrow(/at least one/);
    });
  });

  describe('what each day is called', () => {
    it('names today and yesterday', () => {
      expect(dayLabel('2026-05-14', '2026-05-14')).toBe('Today');
      expect(dayLabel('2026-05-13', '2026-05-14')).toBe('Yesterday');
    });

    it('writes the weekday, the date and the month for anything older', () => {
      expect(dayLabel('2026-05-09', '2026-05-14')).toBe('Saturday 9 May');
      expect(dayLabel('2026-01-01', '2026-05-14')).toBe('Thursday 1 January');
    });
  });
});
