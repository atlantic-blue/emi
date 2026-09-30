import { words } from '../../language';

/**
 * The words of the month she opens. The title itself is the month name from the calendar words
 * every screen that carries a date already reads, so a month is named here the way the first run
 * names it.
 */
export const calendarCopy = {
  back: words('calendar.screen.back'),
  today: words('calendar.today'),
} as const;
