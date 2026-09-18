import {
  type Symptom,
  findSymptom,
  loggableSymptoms,
  symptoms,
  symptomsInGroup,
  unknownSymptomSlugs,
} from '@emi/cycle';

import type { Database } from '../../src/data/database';
import { insertDayLog, readDayLog } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { aDayRecord, recordBytes, recordFromBytes } from '../fixtures/dayRecord';
import { openTestDatabase } from '../data/nodeDatabase';

const marchDay = '2026-03-14';
const wroteAt = new Date('2026-03-14T21:05:00.000Z');

/** The catalogue as it will be once napping stops being offered. */
const afterNappingRetires: readonly Symptom[] = symptoms.map((symptom) =>
  symptom.slug === 'napping' ? { ...symptom, retiredOn: '2027-03-01' } : symptom,
);

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

function marchWrittenTo(database: Database): void {
  insertDayLog(database, {
    day: marchDay,
    payload: recordBytes(
      aDayRecord({ day: marchDay, symptoms: ['cramps', 'napping', 'low-mood'] }),
    ),
    now: wroteAt,
  });
}

/** What her history screen shows for a day: the name of every symptom the record names. */
function namesShownFor(
  database: Database,
  day: string,
  catalogue: readonly Symptom[],
): readonly string[] {
  const row = readDayLog(database, day);
  if (!row) {
    throw new Error(`${day} was written and could not be read back`);
  }
  return (recordFromBytes(row.payload).symptoms ?? []).map(
    (slug) => findSymptom(slug, catalogue)?.name ?? `unknown symptom ${slug}`,
  );
}

describe('a retired symptom still reads on an old record', () => {
  describe('the day she recorded in March', () => {
    it('comes back naming every symptom she picked', () => {
      const database = migrated();
      marchWrittenTo(database);

      expect(namesShownFor(database, marchDay, symptoms)).toEqual([
        'Cramps',
        'Napping',
        'Low mood',
      ]);
    });
  });

  describe('a year later, after napping is retired', () => {
    it('still names every symptom on the March day', () => {
      const database = migrated();
      marchWrittenTo(database);

      expect(namesShownFor(database, marchDay, afterNappingRetires)).toEqual([
        'Cramps',
        'Napping',
        'Low mood',
      ]);
    });

    it('still accepts the March record, because a retired slug is a known slug', () => {
      const database = migrated();
      marchWrittenTo(database);
      const record = recordFromBytes(readDayLog(database, marchDay)!.payload);

      expect(unknownSymptomSlugs(record.symptoms ?? [], afterNappingRetires)).toEqual([]);
    });

    it('stops offering napping on the log sheet', () => {
      const sleep = symptomsInGroup('sleep', afterNappingRetires).map((symptom) => symptom.slug);

      expect(sleep).not.toContain('napping');
      expect(loggableSymptoms(afterNappingRetires)).toHaveLength(69);
    });
  });

  describe('a slug the catalogue never held', () => {
    it('is refused by name, so the refusal says which one', () => {
      expect(unknownSymptomSlugs(['cramps', 'hangover'])).toEqual(['hangover']);
    });
  });
});
