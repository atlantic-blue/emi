/** The address the Sex page answers on: today with no day named, and a past day by its date. */

export const sexDayParameter = 'day';

export function sexAddress(day?: string): string {
  return day === undefined ? '/sex' : `/sex?${sexDayParameter}=${day}`;
}
