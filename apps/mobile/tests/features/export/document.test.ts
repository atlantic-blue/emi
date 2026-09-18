import { claimsIn } from '../../../../../tools/pipeline/forbiddenClaims';
import type { Everything } from '../../../src/features/export/everything';
import { deletedSentence, exportCopy, wordsOf } from '../../../src/features/export/copy';
import { labelOf, readableHtml, unitsIn } from '../../../src/features/export/readableDocument';

/**
 * The document that leaves her phone. It is built from an export written out here rather than from
 * a database, because what is being checked is what a reader is given: a field this version never
 * heard of still reaching the page, and no claim anywhere on it.
 */

function anExport(tables: Everything['tables']): Everything {
  return {
    format: 'emi.export.v1',
    writtenAt: '2026-05-15T09:30:00.000Z',
    schemaVersion: 3,
    tables,
  };
}

const aDay = {
  id: 'one',
  day: '2026-05-01',
  revision: 1,
  created_at: '2026-05-01T08:00:00.000Z',
  updated_at: '2026-05-01T08:00:00.000Z',
  deleted_at: null,
  synced_revision: null,
  payload: {
    day: '2026-05-01',
    flow: 'medium',
    symptoms: ['cramps'],
    moods: ['irritable'],
    energy: 3,
    note: 'A heavy morning.',
    recordedAt: '2026-05-01T08:00:00.000Z',
  },
};

const aCycle = {
  id: 'c1',
  started_on: '2026-05-01',
  ended_on: '2026-05-28',
  length_days: 28,
  period_length_days: 4,
  is_predicted: 0,
};

describe('the document she can read', () => {
  describe('what it puts on the page', () => {
    it('writes the day, the cycle and the settings she holds', () => {
      const page = readableHtml(
        anExport({
          day_log: [aDay],
          cycle: [aCycle],
          setting: [{ key: 'cycleLengthDays', value: '28' }],
        }),
      );

      expect(page).toContain('1 May 2026');
      expect(page).toContain('Cramps');
      expect(page).toContain('Irritable');
      expect(page).toContain('3 of 5');
      expect(page).toContain('A heavy morning.');
      expect(page).toContain('28 days');
      expect(page).toContain(exportCopy.document.settings);
    });

    it('writes a field this version never heard of, named from the field itself', () => {
      const page = readableHtml(
        anExport({
          day_log: [{ ...aDay, payload: { ...aDay.payload, restingHeartRate: 58 } }],
        }),
      );

      expect(labelOf('restingHeartRate')).toBe(wordsOf('restingHeartRate'));
      expect(page).toContain('Resting heart rate');
      expect(page).toContain('58');
    });

    it('keeps a symptom the catalogue has forgotten, by its slug', () => {
      const page = readableHtml(
        anExport({ day_log: [{ ...aDay, payload: { ...aDay.payload, symptoms: ['moonburn'] } }] }),
      );

      expect(page).toContain('Moonburn');
    });

    it('leaves a day she deleted off the page, and says it is in the data file', () => {
      const page = readableHtml(
        anExport({
          day_log: [
            aDay,
            { ...aDay, id: 'two', day: '2026-05-02', deleted_at: '2026-05-03T08:00:00.000Z' },
          ],
        }),
      );

      expect(page).toContain('1 May 2026');
      expect(page).not.toContain('2 May 2026');
      expect(page).toContain(deletedSentence(1));
    });

    it('says nothing is logged when nothing is', () => {
      const page = readableHtml(anExport({ day_log: [], cycle: [], setting: [] }));

      expect(page).toContain(exportCopy.document.nothing);
    });
  });

  describe('the scales it reads in', () => {
    it('takes them from the settings inside the file', () => {
      const chosen = unitsIn(
        anExport({
          setting: [
            { key: 'temperatureUnit', value: 'fahrenheit' },
            { key: 'weightUnit', value: 'pounds' },
          ],
        }),
      );

      expect(chosen).toEqual({ temperature: 'fahrenheit', weight: 'pounds' });
    });

    it('falls back to the scale a record is written in when she chose none', () => {
      expect(unitsIn(anExport({ setting: [{ key: 'weightUnit', value: 'stones' }] }))).toEqual({
        temperature: 'celsius',
        weight: 'kilograms',
      });
    });
  });

  describe('what it may never say', () => {
    it('makes no claim, on a page holding everything it can hold', () => {
      const page = readableHtml(
        anExport({
          day_log: [aDay],
          cycle: [aCycle],
          setting: [{ key: 'cycleLengthDays', value: '28' }],
        }),
      );

      expect(claimsIn('the document', page)).toEqual([]);
      expect(page).toContain(exportCopy.document.what);
    });
  });
});
