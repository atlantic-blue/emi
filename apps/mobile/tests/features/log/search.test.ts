import { type Symptom, loggableSymptoms, symptomGroups, symptoms } from '@emi/cycle';

import { matchesQuery, searchSymptoms, sectionsFor } from '../../../src/features/log/search';

function slugsOf(found: readonly Symptom[]): readonly string[] {
  return found.map((symptom) => symptom.slug);
}

describe('searching the symptom catalogue', () => {
  describe('what a query matches', () => {
    it('matches a partial word anywhere in the name', () => {
      expect(slugsOf(searchSymptoms('ache'))).toEqual([
        'leg-ache',
        'muscle-ache',
        'stomach-ache',
        'headache',
      ]);
    });

    it('matches the slug, because an export shows her the slug', () => {
      expect(slugsOf(searchSymptoms('low-mood'))).toEqual(['low-mood']);
    });

    it('ignores the case she typed in', () => {
      expect(slugsOf(searchSymptoms('CRAMPS'))).toEqual(['cramps']);
    });

    it('ignores the spaces around what she typed', () => {
      expect(slugsOf(searchSymptoms('  cramps  '))).toEqual(['cramps']);
    });

    it('returns everything for an empty query, so the sheet starts whole', () => {
      expect(searchSymptoms('')).toHaveLength(loggableSymptoms().length);
    });

    it('returns nothing for a word the catalogue does not hold', () => {
      expect(searchSymptoms('hangover')).toEqual([]);
    });

    it('folds the accent off what she typed, so a keyboard that adds one still finds it', () => {
      expect(slugsOf(searchSymptoms('náusea'))).toEqual(['nausea']);
      expect(slugsOf(searchSymptoms('DIARRHÖEA'))).toEqual(['diarrhoea']);
    });
  });

  describe('the order the results come back in', () => {
    it('puts the exact name first', () => {
      expect(slugsOf(searchSymptoms('rash'))[0]).toBe('rash');
    });

    it('puts a name that starts with her letters above one that holds them later', () => {
      const found = slugsOf(searchSymptoms('pain'));

      expect(found[0]).toBe('painful-sex');
      expect(found).toContain('pelvic-pain');
    });

    it('puts a word that starts with her letters above one that holds them mid word', () => {
      const found = slugsOf(searchSymptoms('ache'));

      expect(found.indexOf('leg-ache')).toBeLessThan(found.indexOf('headache'));
    });
  });

  describe('the sections the sheet draws', () => {
    it('gives one section per group while she browses, in the catalogue order', () => {
      const sections = sectionsFor('');

      expect(sections.map((section) => section.group)).toEqual(symptomGroups);
    });

    it('gives one flat section with no group while she searches', () => {
      const sections = sectionsFor('ache');

      expect(sections).toHaveLength(1);
      expect(sections[0]?.group).toBeNull();
    });

    it('gives no section at all when nothing matches', () => {
      expect(sectionsFor('hangover')).toEqual([]);
    });

    it('drops a group whose every symptom was retired', () => {
      const withoutLibido: readonly Symptom[] = symptoms
        .filter((symptom) => symptom.group !== 'libido')
        .concat(
          symptoms
            .filter((symptom) => symptom.group === 'libido')
            .map((symptom) => ({ ...symptom, retiredOn: '2027-03-01' })),
        );

      expect(sectionsFor('', withoutLibido).map((each) => each.group)).not.toContain('libido');
    });
  });

  describe('one symptom against one query', () => {
    it('is matched by any run of letters inside its name', () => {
      const migraine = symptoms.find((symptom) => symptom.slug === 'migraine');

      expect(migraine && matchesQuery(migraine, 'grain')).toBe(true);
      expect(migraine && matchesQuery(migraine, 'headache')).toBe(false);
    });
  });
});
