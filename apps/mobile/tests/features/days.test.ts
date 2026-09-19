import {
  addMonths,
  dayLabel,
  daysBackFrom,
  daysInMonth,
  localDay,
  monthLabel,
  monthWeeks,
  startOfMonth,
  weekdayColumn,
  weekdayColumnNames,
} from '../../src/features/onboarding/days';

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

  describe('the month she is looking at', () => {
    it('names a month by its first day', () => {
      expect(startOfMonth('2026-05-14')).toBe('2026-05-01');
      expect(startOfMonth('2026-05-01')).toBe('2026-05-01');
    });

    it('refuses a day that is not on the calendar', () => {
      expect(() => startOfMonth('2026-02-30')).toThrow(/not a day/);
    });

    it('moves a whole month at a time, however long the month is', () => {
      expect(addMonths('2026-03-31', -1)).toBe('2026-02-01');
      expect(addMonths('2026-05-14', 1)).toBe('2026-06-01');
    });

    it('crosses the end of a year in both directions', () => {
      expect(addMonths('2026-01-09', -1)).toBe('2025-12-01');
      expect(addMonths('2026-12-09', 1)).toBe('2027-01-01');
    });

    it('moves more than a year', () => {
      expect(addMonths('2026-05-01', -14)).toBe('2025-03-01');
    });

    it('refuses half a month', () => {
      expect(() => addMonths('2026-05-01', 1.5)).toThrow(/counted whole/);
    });

    it('writes the month and the year for the heading', () => {
      expect(monthLabel('2026-05-14')).toBe('May 2026');
      expect(monthLabel('2026-01-01')).toBe('January 2026');
    });

    it('counts the days a month holds, including a February that has twenty nine', () => {
      expect(daysInMonth('2026-02-11')).toBe(28);
      expect(daysInMonth('2028-02-11')).toBe(29);
      expect(daysInMonth('2026-05-14')).toBe(31);
      expect(daysInMonth('2026-04-14')).toBe(30);
    });
  });

  describe('the weeks she reads', () => {
    it('starts the week on Monday', () => {
      expect(weekdayColumnNames[0]).toBe('Monday');
      expect(weekdayColumnNames[6]).toBe('Sunday');
      expect(weekdayColumn('2026-05-14')).toBe(3);
      expect(weekdayColumn('2026-05-17')).toBe(6);
    });

    it('leaves the cells before the first of the month empty', () => {
      expect(monthWeeks('2026-05-01')[0]).toEqual([
        undefined,
        undefined,
        undefined,
        undefined,
        '2026-05-01',
        '2026-05-02',
        '2026-05-03',
      ]);
    });

    it('leaves the cells after the last of the month empty', () => {
      expect(monthWeeks('2026-02-14').at(-1)).toEqual([
        '2026-02-23',
        '2026-02-24',
        '2026-02-25',
        '2026-02-26',
        '2026-02-27',
        '2026-02-28',
        undefined,
      ]);
    });

    it('gives every week seven cells', () => {
      for (const week of monthWeeks('2026-11-01')) {
        expect(week).toHaveLength(7);
      }
    });

    it('holds every day of the month once and no day of another month', () => {
      const held = monthWeeks('2026-02-01').flat();

      expect(held.filter((day) => day !== undefined)).toHaveLength(28);
      expect(new Set(held).size).toBe(29);
      expect(held).toContain('2026-02-01');
      expect(held).toContain('2026-02-28');
      expect(held).not.toContain('2026-03-01');
    });

    it('keeps one weekday in one column all the way down', () => {
      for (const week of monthWeeks('2026-05-01')) {
        for (const [column, day] of week.entries()) {
          if (day !== undefined) {
            expect(weekdayColumn(day)).toBe(column);
          }
        }
      }
    });
  });
});
