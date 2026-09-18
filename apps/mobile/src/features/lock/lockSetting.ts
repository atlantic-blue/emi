import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';

/**
 * The two values the setting holds. They are words rather than a number because the setting table
 * holds text, and a reader of the raw table should not have to guess what a 1 meant.
 */
export const lockOn = 'on';
export const lockOff = 'off';

/**
 * On unless she has turned it off. A phone that has never heard of this setting is locked, which
 * covers the installs that were written before the lock existed as well as the fresh ones.
 */
export function lockOnReturnIsOn(db: Database): boolean {
  return readSetting(db, 'lockOnReturn') !== lockOff;
}

export function setLockOnReturn(db: Database, on: boolean): void {
  writeSetting(db, 'lockOnReturn', on ? lockOn : lockOff);
}
