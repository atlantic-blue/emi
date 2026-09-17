import { type Flow, cyclesFrom, symptoms, type Symptom } from '@emi/cycle';

import { CanonicalError, canonicalJson } from '../src/canonical';
import {
  type DayRecord,
  RecordError,
  flowValues,
  highestEnergy,
  highestTemperatureCelsius,
  highestWeightKilograms,
  longestNote,
  lowestEnergy,
  lowestTemperatureCelsius,
  lowestWeightKilograms,
  recordBytes,
  recordFromBytes,
  recordJson,
  recordKeys,
  recordProblems,
} from '../src/record';

const aDay: DayRecord = {
  day: '2026-03-14',
  recordedAt: '2026-03-14T21:05:00.000Z',
};

function aDayWith(fields: Record<string, unknown>): DayRecord {
  return { ...aDay, ...fields } as DayRecord;
}

function problemsWith(fields: Record<string, unknown>): readonly string[] {
  return recordProblems(aDayWith(fields));
}

function refusedFor(fields: Record<string, unknown>): string {
  try {
    recordJson(aDayWith(fields));
  } catch (error) {
    if (error instanceof RecordError) {
      return error.problems.join('; ');
    }
    throw error;
  }
  throw new Error('the record was accepted and a refusal was expected');
}

describe('the plaintext of a day', () => {
  describe('the ranges the design names', () => {
    // The messages below carry these numbers as text. This case carries them as numbers, so a
    // range cannot be widened by editing the constant and the sentence together.
    it('are the numbers in section 6.2, and nothing near them', () => {
      expect([lowestTemperatureCelsius, highestTemperatureCelsius]).toEqual([34, 42]);
      expect([lowestWeightKilograms, highestWeightKilograms]).toEqual([20, 400]);
      expect([lowestEnergy, highestEnergy]).toEqual([1, 5]);
      expect(longestNote).toBe(2000);
    });
  });

  describe('canonical json', () => {
    it('sorts the keys, whatever order they were written in', () => {
      expect(canonicalJson({ b: 1, a: 2, c: 3 })).toBe('{"a":2,"b":1,"c":3}');
    });

    it('sorts the keys at every depth', () => {
      expect(canonicalJson({ outer: { b: 1, a: 2 } })).toBe('{"outer":{"a":2,"b":1}}');
    });

    it('keeps the order of a list, because a list is data and not a shape', () => {
      expect(canonicalJson({ symptoms: ['cramps', 'anxious'] })).toBe(
        '{"symptoms":["cramps","anxious"]}',
      );
    });

    it('writes no whitespace', () => {
      expect(canonicalJson({ a: 1, b: [1, 2] })).not.toMatch(/\s/);
    });

    it('leaves out a field that is not there', () => {
      expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
    });

    it('refuses a number that is not finite, so a record cannot go in as null', () => {
      expect(() => canonicalJson({ weightKilograms: Number.NaN })).toThrow(CanonicalError);
      expect(() => canonicalJson({ weightKilograms: Number.POSITIVE_INFINITY })).toThrow(
        CanonicalError,
      );
    });

    it('refuses a value json cannot carry, rather than dropping it silently', () => {
      const withADate = { recordedAt: new Date('2026-03-14T21:05:00.000Z') } as unknown as {
        recordedAt: string;
      };

      expect(() => canonicalJson(withADate)).toThrow(CanonicalError);
    });

    it('writes the same bytes for two records that differ only in key order', () => {
      const one = recordBytes({ day: '2026-03-14', recordedAt: '2026-03-14T21:05:00.000Z' });
      const other = recordBytes({
        recordedAt: '2026-03-14T21:05:00.000Z',
        day: '2026-03-14',
      } as DayRecord);

      expect([...one]).toEqual([...other]);
    });
  });

  describe('the fields it may carry', () => {
    it('accepts a day that fills every one of them', () => {
      const full: DayRecord = {
        day: '2026-03-14',
        flow: 'heavy',
        bleedingIsUnexpected: true,
        symptoms: ['cramps', 'low-mood'],
        moods: ['calm'],
        energy: 3,
        temperatureCelsius: 36.6,
        weightKilograms: 64.2,
        note: 'a long afternoon',
        recordedAt: '2026-03-14T21:05:00.000Z',
      };

      expect(recordProblems(full)).toEqual([]);
      expect(Object.keys(full).sort()).toEqual([...recordKeys]);
    });

    it('refuses a field the design does not name', () => {
      expect(refusedFor({ heartRate: 61 })).toContain('heartRate is not a field of a day');
    });

    it('names every offence at once, so a screen can show them together', () => {
      expect(problemsWith({ energy: 9, note: 'x'.repeat(longestNote + 1) })).toHaveLength(2);
    });
  });

  describe('the day and the time she saved it', () => {
    it('refuses a record that names no day', () => {
      const withoutADay = { recordedAt: aDay.recordedAt } as DayRecord;

      expect(recordProblems(withoutADay)).toEqual(['a day names no date']);
    });

    it('refuses a date that is not written as YYYY-MM-DD', () => {
      expect(refusedFor({ day: '14-03-2026' })).toContain('a date is written as YYYY-MM-DD');
    });

    it('refuses a date the calendar does not hold', () => {
      expect(refusedFor({ day: '2026-02-31' })).toContain('not a day in the calendar');
    });

    it('refuses a record that names no time it was saved', () => {
      const withoutATime = { day: aDay.day } as DayRecord;

      expect(recordProblems(withoutATime)).toEqual(['a day names no time it was saved']);
    });
  });

  describe('the flow', () => {
    it('accepts each of the five levels', () => {
      for (const flow of flowValues) {
        expect(problemsWith({ flow })).toEqual([]);
      }
    });

    it('refuses a level that is not one of them', () => {
      expect(refusedFor({ flow: 'torrential' })).toContain('a flow is one of');
    });

    it('lists every value the type holds, which a run time check cannot read', () => {
      const everyValueIsListed: Exclude<Flow, (typeof flowValues)[number]> extends never
        ? true
        : never = true;

      expect(everyValueIsListed).toBe(true);
      expect(flowValues).toHaveLength(5);
    });
  });

  describe('a symptom', () => {
    it('accepts a slug the catalogue holds', () => {
      expect(problemsWith({ symptoms: ['cramps', 'bloating'] })).toEqual([]);
    });

    it('refuses a slug the catalogue never held, and names it', () => {
      expect(refusedFor({ symptoms: ['cramps', 'hangover'] })).toContain(
        'the catalogue holds no symptom named hangover',
      );
    });

    it('accepts a slug that was retired, because her history points at it', () => {
      const laterCatalogue: readonly Symptom[] = symptoms.map((symptom) =>
        symptom.slug === 'napping' ? { ...symptom, retiredOn: '2027-03-01' } : symptom,
      );

      expect(recordProblems(aDayWith({ symptoms: ['napping'] }), laterCatalogue)).toEqual([]);
    });
  });

  describe('an energy', () => {
    it('accepts one to five', () => {
      for (let energy = lowestEnergy; energy <= highestEnergy; energy += 1) {
        expect(problemsWith({ energy })).toEqual([]);
      }
    });

    it('refuses zero and six', () => {
      expect(refusedFor({ energy: lowestEnergy - 1 })).toContain('an energy runs from 1 to 5');
      expect(refusedFor({ energy: highestEnergy + 1 })).toContain('an energy runs from 1 to 5');
    });

    it('refuses a number with a fraction', () => {
      expect(refusedFor({ energy: 2.5 })).toContain('an energy is a whole number');
    });
  });

  describe('a temperature', () => {
    it('accepts the ends of the range and a reading between them', () => {
      for (const temperatureCelsius of [
        lowestTemperatureCelsius,
        36.6,
        highestTemperatureCelsius,
      ]) {
        expect(problemsWith({ temperatureCelsius })).toEqual([]);
      }
    });

    it('refuses a reading outside it', () => {
      expect(refusedFor({ temperatureCelsius: lowestTemperatureCelsius - 0.1 })).toContain(
        'a temperature runs from 34.0 to 42.0',
      );
      expect(refusedFor({ temperatureCelsius: highestTemperatureCelsius + 0.1 })).toContain(
        'a temperature runs from 34.0 to 42.0',
      );
    });

    it('refuses more than one decimal place, because no thermometer here reads one', () => {
      expect(refusedFor({ temperatureCelsius: 36.65 })).toContain('carries one decimal place');
    });
  });

  describe('a weight', () => {
    it('accepts the ends of the range', () => {
      for (const weightKilograms of [lowestWeightKilograms, 64.2, highestWeightKilograms]) {
        expect(problemsWith({ weightKilograms })).toEqual([]);
      }
    });

    it('refuses a weight outside it', () => {
      expect(refusedFor({ weightKilograms: lowestWeightKilograms - 0.1 })).toContain(
        'a weight runs from 20.0 to 400.0',
      );
      expect(refusedFor({ weightKilograms: highestWeightKilograms + 0.1 })).toContain(
        'a weight runs from 20.0 to 400.0',
      );
    });
  });

  describe('a note', () => {
    it('accepts two thousand characters', () => {
      expect(problemsWith({ note: 'x'.repeat(longestNote) })).toEqual([]);
    });

    it('refuses two thousand and one, and says how many it holds', () => {
      expect(refusedFor({ note: 'x'.repeat(longestNote + 1) })).toContain(
        `at most 2000 characters, this one holds 2001`,
      );
    });
  });

  describe('what comes back out of the envelope', () => {
    it('is the record that went in', () => {
      const full = aDayWith({ symptoms: ['cramps'], energy: 4 });

      expect(recordFromBytes(recordBytes(full))).toEqual(full);
    });

    it('is refused when the plaintext is not a day at all', () => {
      expect(() => recordFromBytes(new TextEncoder().encode('[1,2,3]'))).toThrow(RecordError);
    });

    it('is not re-checked against the ranges, so an old record stays readable', () => {
      const oldRecord = new TextEncoder().encode('{"day":"2026-03-14","energy":9}');

      expect(recordFromBytes(oldRecord)).toEqual({ day: '2026-03-14', energy: 9 });
    });
  });

  describe('the arithmetic that reads a day', () => {
    it('takes the record the envelope carries, with nothing translated between them', () => {
      const bleeding = aDayWith({ flow: 'medium' });
      const spotting = aDayWith({
        day: '2026-04-11',
        flow: 'spotting',
        bleedingIsUnexpected: true,
      });

      const cycles = cyclesFrom([recordFromBytes(recordBytes(bleeding)), spotting]);

      expect(cycles.map((cycle) => cycle.startedOn)).toEqual(['2026-03-14']);
    });
  });
});
