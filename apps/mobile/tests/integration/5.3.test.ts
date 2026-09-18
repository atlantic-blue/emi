import {
  EnvelopeError,
  envelopeVersion,
  flowValues,
  headerLength,
  keyLength,
  recordBytes,
} from '@emi/crypto';
import { symptoms } from '@emi/cycle';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import {
  DayLogError,
  insertDayLog,
  listDayLogs,
  readDayLog,
  softDeleteDayLog,
  updateDayLog,
} from '../../src/data/dayLogRepository';
import { encryptPlainPayloads } from '../../src/data/migrations/004-encrypt-payloads';
import { migrate } from '../../src/data/schema';
import { logDay } from '../../src/features/cycle/rebuild';
import { flowLogged, logFlow } from '../../src/features/log/logDay';
import { dayVault } from '../../src/services/vault/dayVault';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { aDayRecord } from '../fixtures/dayRecord';
import { herDatabase } from '../fixtures/herPhone';
import { herVault } from '../fixtures/herVault';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));

const theDay = '2026-03-14';
const sheWroteAt = new Date('2026-03-14T21:05:00.000Z');

/**
 * One day carrying something from every field the plaintext holds, so a leak of any of them is a
 * leak this test sees. The note is a word that appears nowhere else in the repository, which is
 * what makes a search for it mean something.
 */
const herDay = aDayRecord({
  day: theDay,
  flow: 'heavy',
  bleedingIsUnexpected: true,
  symptoms: ['cramps', 'bloating'],
  moods: ['low-mood'],
  energy: 2,
  temperatureCelsius: 36.7,
  weightKilograms: 61.4,
  note: 'quarrelsome-marmoset',
  recordedAt: sheWroteAt.toISOString(),
});

function herPhone(): Database {
  const database = herDatabase();
  migrate(database);

  return database;
}

/**
 * The payload column as the bytes on the disk, read through a second handle on the same database
 * and never through the repository. A read that went through the code under test could not tell
 * anybody whether the code was writing what it claims.
 */
function rawPayloads(): Uint8Array[] {
  const handle = expoDatabase(openDatabaseSync(databaseFileName));

  return handle
    .all<{ payload: Uint8Array }>('SELECT payload FROM day_log ORDER BY day')
    .map((row) => row.payload);
}

/** Every spelling a leak could arrive in, so a payload is searched as text and as bytes. */
function readableIn(payload: Uint8Array, word: string): boolean {
  const spellings = [
    Buffer.from(payload).toString('utf8'),
    Buffer.from(payload).toString('latin1'),
    Buffer.from(payload).toString('base64'),
    Buffer.from(payload).toString('hex'),
  ];

  return spellings.some((spelling) => spelling.includes(word));
}

/** What a plain payload looked like before this step: canonical json, readable by anybody. */
function asPlaintext(record = herDay): Uint8Array {
  return recordBytes(record);
}

function refusalOf(act: () => unknown): string {
  try {
    act();
  } catch (error) {
    if (error instanceof DayLogError) {
      return error.refusal;
    }
    throw error;
  }

  throw new Error('that write was accepted and it should have been refused');
}

describe('a raw database read reveals nothing about the day', () => {
  beforeEach(() => {
    resetExpoSqlite();
  });

  describe('a day she logged', () => {
    it('leaves no word of her day in the payload column', () => {
      const database = herPhone();
      const vault = herVault();

      logDay(database, { day: theDay, payload: vault.seal(herDay), now: sheWroteAt }, vault.open);

      const [payload] = rawPayloads();
      expect(payload).toBeDefined();
      expect(readableIn(payload as Uint8Array, 'quarrelsome-marmoset')).toBe(false);
    });

    it('leaves no flow value readable, in any spelling', () => {
      const database = herPhone();
      const vault = herVault();

      logDay(database, { day: theDay, payload: vault.seal(herDay), now: sheWroteAt }, vault.open);
      const [payload] = rawPayloads();

      for (const flow of flowValues) {
        expect({ flow, readable: readableIn(payload as Uint8Array, flow) }).toEqual({
          flow,
          readable: false,
        });
      }
    });

    it('leaves no symptom slug of the catalogue readable', () => {
      const database = herPhone();
      const vault = herVault();

      logDay(database, { day: theDay, payload: vault.seal(herDay), now: sheWroteAt }, vault.open);
      const [payload] = rawPayloads();

      const leaked = symptoms
        .map((symptom) => symptom.slug)
        .filter((slug) => readableIn(payload as Uint8Array, slug));

      expect(leaked).toEqual([]);
    });

    it('leaves the date she logged out of the payload, though the day column holds it', () => {
      const database = herPhone();
      const vault = herVault();

      logDay(database, { day: theDay, payload: vault.seal(herDay), now: sheWroteAt }, vault.open);
      const [payload] = rawPayloads();

      expect(readableIn(payload as Uint8Array, theDay)).toBe(false);
      expect(readDayLog(database, theDay)?.day).toBe(theDay);
    });

    it('stores an envelope of the one version the format has', () => {
      const database = herPhone();
      const vault = herVault();

      logDay(database, { day: theDay, payload: vault.seal(herDay), now: sheWroteAt }, vault.open);
      const [payload] = rawPayloads();

      expect((payload as Uint8Array)[0]).toBe(envelopeVersion);
      expect((payload as Uint8Array).length).toBeGreaterThan(headerLength);
    });

    it('comes back as the day she wrote when it is read through the vault', () => {
      const database = herPhone();
      const vault = herVault();

      logDay(database, { day: theDay, payload: vault.seal(herDay), now: sheWroteAt }, vault.open);

      const row = readDayLog(database, theDay);
      expect(row && vault.open(row.payload)).toEqual(herDay);
    });

    it('seals two writes of the same day differently, so the column repeats nothing', () => {
      const database = herPhone();
      const vault = herVault();

      logFlow(database, vault, { day: theDay, flow: 'medium', now: sheWroteAt });
      const [first] = rawPayloads();
      logFlow(database, vault, { day: theDay, flow: 'medium', now: sheWroteAt });
      const [second] = rawPayloads();

      expect(Buffer.from(second as Uint8Array).equals(Buffer.from(first as Uint8Array))).toBe(
        false,
      );
    });
  });

  describe('a payload that is not an envelope', () => {
    it('is refused on the way in, so plaintext cannot reach the column', () => {
      const database = herPhone();

      expect(
        refusalOf(() =>
          insertDayLog(database, { day: theDay, payload: asPlaintext(), now: sheWroteAt }),
        ),
      ).toBe('payload-is-not-an-envelope');
      expect(listDayLogs(database)).toEqual([]);
    });

    it('is refused on an edit too, so a second write cannot undo the first', () => {
      const database = herPhone();
      const vault = herVault();

      insertDayLog(database, { day: theDay, payload: vault.seal(herDay), now: sheWroteAt });

      expect(
        refusalOf(() =>
          updateDayLog(database, { day: theDay, payload: asPlaintext(), now: sheWroteAt }),
        ),
      ).toBe('payload-is-not-an-envelope');
      expect(rawPayloads().every((payload) => payload[0] === envelopeVersion)).toBe(true);
    });

    it('names the shape it refused and never the bytes it read', () => {
      const database = herPhone();
      let message = '';

      try {
        insertDayLog(database, { day: theDay, payload: asPlaintext(), now: sheWroteAt });
      } catch (error) {
        message = error instanceof DayLogError ? error.message : '';
      }

      expect(message).toContain('envelope');
      expect(message).not.toContain('quarrelsome-marmoset');
      expect(message).not.toContain('heavy');
    });

    it('refuses an envelope of a version nobody has written', () => {
      const database = herPhone();
      const vault = herVault();
      const fromTheFuture = vault.seal(herDay);
      fromTheFuture[0] = envelopeVersion + 1;

      expect(
        refusalOf(() =>
          insertDayLog(database, { day: theDay, payload: fromTheFuture, now: sheWroteAt }),
        ),
      ).toBe('payload-is-not-an-envelope');
    });

    it('refuses bytes too short to be an envelope at all', () => {
      const database = herPhone();

      expect(
        refusalOf(() =>
          insertDayLog(database, {
            day: theDay,
            payload: new Uint8Array([envelopeVersion, 2, 3]),
            now: sheWroteAt,
          }),
        ),
      ).toBe('payload-is-not-an-envelope');
    });
  });

  describe('the days she wrote before the envelope existed', () => {
    /** The table as an earlier build left it: plaintext in the payload column. */
    function aPhoneOfPlainRows(days: readonly string[]): Database {
      const database = herPhone();

      for (const day of days) {
        database.run(
          `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at, deleted_at,
             synced_revision)
           VALUES (?, ?, ?, 1, ?, ?, NULL, NULL)`,
          [
            `01950000-0000-7000-8000-00000000${day.slice(8)}`,
            day,
            asPlaintext(aDayRecord({ ...herDay, day })),
            sheWroteAt.toISOString(),
            sheWroteAt.toISOString(),
          ],
        );
      }

      return database;
    }

    const threeDays = ['2026-03-12', '2026-03-13', '2026-03-14'];
    const migratedAt = new Date('2026-03-15T09:00:00.000Z');

    it('converts every one of them, and says how many', () => {
      const database = aPhoneOfPlainRows(threeDays);

      expect(encryptPlainPayloads(database, herVault(), migratedAt)).toEqual({
        sealed: 3,
        alreadySealed: 0,
      });
      expect(rawPayloads().every((payload) => payload[0] === envelopeVersion)).toBe(true);
    });

    it('leaves her day readable through the vault afterwards', () => {
      const database = aPhoneOfPlainRows([theDay]);

      encryptPlainPayloads(database, herVault(), migratedAt);

      const row = readDayLog(database, theDay);
      expect(row && herVault().open(row.payload)).toEqual(herDay);
    });

    it('leaves no word of her day in the column it converted', () => {
      const database = aPhoneOfPlainRows([theDay]);

      encryptPlainPayloads(database, herVault(), migratedAt);
      const [payload] = rawPayloads();

      expect(readableIn(payload as Uint8Array, 'quarrelsome-marmoset')).toBe(false);
      expect(readableIn(payload as Uint8Array, 'cramps')).toBe(false);
    });

    it('changes nothing on a second run', () => {
      const database = aPhoneOfPlainRows(threeDays);

      encryptPlainPayloads(database, herVault(), migratedAt);
      const afterTheFirstRun = rawPayloads().map((payload) => Buffer.from(payload).toString('hex'));
      const rowsAfterTheFirstRun = listDayLogs(database);

      expect(encryptPlainPayloads(database, herVault(), migratedAt)).toEqual({
        sealed: 0,
        alreadySealed: 3,
      });
      expect(rawPayloads().map((payload) => Buffer.from(payload).toString('hex'))).toEqual(
        afterTheFirstRun,
      );
      expect(listDayLogs(database)).toEqual(rowsAfterTheFirstRun);
    });

    it('raises the revision, because the stored bytes changed and the server holds the old ones', () => {
      const database = aPhoneOfPlainRows([theDay]);

      encryptPlainPayloads(database, herVault(), migratedAt);

      const row = readDayLog(database, theDay);
      expect(row?.revision).toBe(2);
      expect(row?.updatedAt).toBe(migratedAt.toISOString());
    });

    it('converts a day she deleted, because it is still her day until the server hears', () => {
      const database = aPhoneOfPlainRows([theDay]);
      softDeleteDayLog(database, { day: theDay, now: sheWroteAt });

      expect(encryptPlainPayloads(database, herVault(), migratedAt)).toEqual({
        sealed: 1,
        alreadySealed: 0,
      });
      const [payload] = rawPayloads();
      expect((payload as Uint8Array)[0]).toBe(envelopeVersion);
      expect(readableIn(payload as Uint8Array, 'quarrelsome-marmoset')).toBe(false);
    });

    it('does nothing at all on a phone that has never written a day', () => {
      const database = herPhone();

      expect(encryptPlainPayloads(database, herVault(), migratedAt)).toEqual({
        sealed: 0,
        alreadySealed: 0,
      });
      expect(rawPayloads()).toEqual([]);
    });

    it('leaves a row it cannot read alone rather than losing it', () => {
      const database = aPhoneOfPlainRows([theDay]);
      database.run('UPDATE day_log SET payload = ?, revision = revision + 1 WHERE day = ?', [
        new Uint8Array([0x7b, 0x21, 0x21]),
        theDay,
      ]);

      expect(() => encryptPlainPayloads(database, herVault(), migratedAt)).toThrow();
      const [payload] = rawPayloads();
      expect(Buffer.from(payload as Uint8Array).toString('utf8')).toBe('{!!');
    });
  });

  describe('the whole way round, from her press to what she reads back', () => {
    it('writes a sealed row and reads her own flow back off it', () => {
      const database = herPhone();
      const vault = herVault();

      logFlow(database, vault, { day: theDay, flow: 'light', now: sheWroteAt });

      const [payload] = rawPayloads();
      expect((payload as Uint8Array)[0]).toBe(envelopeVersion);
      expect(readableIn(payload as Uint8Array, 'light')).toBe(false);
      expect(flowLogged(database, vault, theDay)).toBe('light');
    });

    it('keeps the rest of her day when she changes one answer', () => {
      const database = herPhone();
      const vault = herVault();
      insertDayLog(database, { day: theDay, payload: vault.seal(herDay), now: sheWroteAt });

      logFlow(database, vault, { day: theDay, flow: 'spotting', now: sheWroteAt });

      const row = readDayLog(database, theDay);
      expect(row && vault.open(row.payload)).toEqual({
        ...herDay,
        flow: 'spotting',
        bleedingIsUnexpected: undefined,
        recordedAt: sheWroteAt.toISOString(),
      });
      expect(readableIn(rawPayloads()[0] as Uint8Array, 'cramps')).toBe(false);
    });

    it('cannot be opened under another key, so a stolen row is bytes and nothing else', () => {
      const database = herPhone();
      const vault = herVault();
      logFlow(database, vault, { day: theDay, flow: 'heavy', now: sheWroteAt });

      const [payload] = rawPayloads();
      const somebodyElse = dayVault(new Uint8Array(keyLength).fill(0x2a));

      expect(() => somebodyElse.open(payload as Uint8Array)).toThrow(EnvelopeError);
    });
  });
});
