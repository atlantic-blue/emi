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
} as const;
