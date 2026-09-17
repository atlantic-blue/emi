import { EnvelopeError, openRecord, sealRecord } from '@emi/crypto';

import type { Database } from '../../src/data/database';
import { insertDayLog, listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { openTestDatabase } from '../data/nodeDatabase';
import { aDayRecord, aVaultKey, type DayRecord } from '../fixtures/dayRecord';

const key = aVaultKey();
const theDay = '2026-03-14';
const theDayBefore = '2026-03-13';
const wroteAt = new Date('2026-03-14T21:05:00.000Z');
const versionByte = 0;
const lastByte = -1;

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

/** What a screen does with a row: take the payload back to the day she saved. */
function dayShownFor(database: Database, day: string): DayRecord {
  const row = readDayLog(database, day);
  if (!row) {
    throw new Error(`${day} was written and could not be read back`);
  }
  return openRecord(row.payload, key);
}

function refusalFor(database: Database, day: string): string {
  try {
    dayShownFor(database, day);
  } catch (error) {
    if (error instanceof EnvelopeError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error(`${day} was shown and a refusal was expected`);
}

function twoDaysWrittenTo(database: Database): void {
  for (const day of [theDayBefore, theDay]) {
    insertDayLog(database, {
      day,
      payload: sealRecord(aDayRecord({ day, note: `what ${day} was like` }), key),
      now: wroteAt,
    });
  }
}

/**
 * One bit of a stored day changes, the way a restored backup or a tampered file changes it. The
 * revision rises with it because the table refuses any other write, so this is the strongest
 * shape the change can take: it looks like an ordinary write from every side except the tag.
 */
function flipOneBitOfThePayload(database: Database, day: string, at: number): void {
  const row = readDayLog(database, day);
  if (!row) {
    throw new Error(`${day} is not written`);
  }

  const index = at < 0 ? row.payload.length + at : at;
  const changed = Uint8Array.from(row.payload);
  changed[index] = (row.payload[index] ?? 0) ^ 0b0000_0001;

  database.run('UPDATE day_log SET payload = ?, revision = revision + 1 WHERE day = ?', [
    changed,
    day,
  ]);
}

describe('a single flipped bit is rejected rather than decrypted', () => {
  describe('the day she saved', () => {
    it('comes back as the day she saved', () => {
      const database = migrated();
      twoDaysWrittenTo(database);

      expect(dayShownFor(database, theDay)).toEqual(
        aDayRecord({ day: theDay, note: `what ${theDay} was like` }),
      );
    });

    it('is stored as ciphertext, so the note is nowhere in the row', () => {
      const database = migrated();
      twoDaysWrittenTo(database);
      const row = readDayLog(database, theDay);

      expect(new TextDecoder().decode(row?.payload)).not.toContain('what');
      expect(new TextDecoder().decode(row?.payload)).not.toContain('cramps');
    });
  });

  describe('after one bit of that row changes', () => {
    it('refuses the day rather than showing her something that is not hers', () => {
      const database = migrated();
      twoDaysWrittenTo(database);
      flipOneBitOfThePayload(database, theDay, lastByte);

      expect(refusalFor(database, theDay)).toBe('envelope-is-not-authentic');
    });

    // The version byte is the one byte the tag does not cover, so the envelope reads it itself.
    it('refuses the day when the changed bit is the version byte', () => {
      const database = migrated();
      twoDaysWrittenTo(database);
      flipOneBitOfThePayload(database, theDay, versionByte);

      expect(refusalFor(database, theDay)).toBe('version-is-not-known');
    });

    it('still shows every other day, because one row is not her history', () => {
      const database = migrated();
      twoDaysWrittenTo(database);
      flipOneBitOfThePayload(database, theDay, lastByte);

      expect(dayShownFor(database, theDayBefore).day).toBe(theDayBefore);
      expect(listDayLogs(database).map((row) => row.day)).toEqual([theDayBefore, theDay]);
    });
  });

  describe('two days that say the same thing', () => {
    it('are two different envelopes, because a nonce is drawn for every write', () => {
      const record = aDayRecord({ day: theDay });

      const first = sealRecord(record, key);
      const second = sealRecord(record, key);

      expect([...first]).not.toEqual([...second]);
      expect(openRecord(first, key)).toEqual(openRecord(second, key));
    });
  });
});
