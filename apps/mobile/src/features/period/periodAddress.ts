/** The address the Period page answers on: today with no day named, and a past day by its date. */

export const periodDayParameter = 'day';

export function periodAddress(day?: string): string {
  return day === undefined ? '/period' : `/period?${periodDayParameter}=${day}`;
}
