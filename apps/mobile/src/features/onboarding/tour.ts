import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';

/**
 * The one thing Emi remembers about the tour: the instant she left it. One key and not two,
 * because whether she skipped it or read it is a fact about her that nothing reads back.
 *
 * It lives in the setting table, which the platform removes with the application and which the
 * sync of feature 6 cannot see, so a new phone shows her the tour again along with the two
 * questions it exists to explain.
 */

export function tourIsSeen(db: Database): boolean {
  return readSetting(db, 'tourSeenAt') !== undefined;
}

/**
 * Writes the instant only where nothing is held, so the row keeps the first time she saw the tour
 * however many times she opens it afterwards.
 */
export function markTourSeen(db: Database, now: Date): void {
  if (tourIsSeen(db)) {
    return;
  }

  writeSetting(db, 'tourSeenAt', now.toISOString());
}
