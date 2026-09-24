import { words } from '../../language';

/**
 * The words of the one screen she opens. They stay small, which is design section 9.1: she reads
 * everything and a stranger beside her reads nothing.
 */
export const homeCopy = {
  wordmark: words('home.wordmark'),
  logToday: words('home.logToday'),
  history: words('home.history'),
  export: words('home.export'),
  settings: words('home.settings'),
  painLine: words('home.painLine'),
  doctorRecord: words('home.doctorRecord'),
} as const;

/**
 * How Emi says hello to her by the name she gave. A woman who gave none is not greeted at all,
 * so this is never called with an empty name and never draws an empty line.
 */
export function greeting(name: string): string {
  return words('home.greeting', undefined, { name });
}
