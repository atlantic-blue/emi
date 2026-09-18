import type { DayRecord as StoredDay } from '@emi/crypto';
import type { DayRecord } from '@emi/cycle';

import { herVault } from './herVault';

/**
 * A day as it is stored: the envelope of design section 7.2, sealed under the test vault key.
 * Every row a test seeds goes through the same seal a screen goes through, so a test cannot write
 * a row the table would refuse from the application.
 */
export function encodeDay(record: DayRecord): Uint8Array {
  return herVault().seal(storedDay(record));
}

export function decodeDay(payload: Uint8Array): DayRecord {
  return herVault().open(payload);
}

/**
 * The cycle arithmetic reads three fields of a day and a sealed record carries the time it was
 * saved as well. A seeded day was saved at noon on itself, which is a fixture's answer and not the
 * application's: a screen stamps the moment she pressed.
 */
function storedDay(record: DayRecord): StoredDay {
  return { ...record, recordedAt: `${record.day}T12:00:00.000Z` };
}
