import {
  type Symptom,
  findSymptom,
  isKnownSymptom,
  isRetired,
  loggableSymptoms,
  symptomGroups,
  symptomSlugShape,
  symptomSlugs,
  symptoms,
  symptomsInGroup,
  unknownSymptomSlugs,
} from '../src/symptoms';

/**
 * Every slug Emi ever shipped. A slug on this list and not in the catalogue is a record she can no
 * longer read, so this list only ever grows. Retire an entry, never delete one.
 */
const slugsEverShipped: readonly string[] = [
  'acne',
  'angry',
  'anxious',
  'appetite-increase',
  'appetite-loss',
  'bloating',
  'brain-fog',
  'breast-swelling',
  'breast-tenderness',
  'calm',
  'constipation',
  'content',
  'cramps',
  'diarrhoea',
  'dizzy',
  'dry-skin',
  'early-waking',
  'energetic',
  'exhausted',
  'fatigue',
  'food-craving',
  'forgetful',
  'gas',
  'greasy-hair',
  'hair-loss',
  'hard-to-wake',
  'headache',
  'heartburn',
  'high-libido',
  'hot-flush',
  'insomnia',
  'irritable',
  'itchy-skin',
  'joint-pain',
  'leg-ache',
  'light-sensitivity',
  'low-libido',
  'low-mood',
  'lower-back-pain',
  'migraine',
  'mood-swings',
  'muscle-ache',
  'napping',
  'nausea',
  'night-sweats',
  'oily-skin',
  'overwhelmed',
  'oversleeping',
  'ovulation-pain',
  'painful-sex',
  'pelvic-pain',
  'poor-concentration',
  'puffy-face',
  'rash',
  'restless',
  'restless-sleep',
  'sensitive',
  'sensitive-skin',
  'shaky',
  'shoulder-tension',
  'sinus-pressure',
  'sluggish',
  'sound-sensitivity',
  'stomach-ache',
  'tearful',
  'vaginal-dryness',
  'vivid-dreams',
  'vomiting',
  'vulval-pain',
  'weak',
];

/** A day she recorded before any of this was retired. */
const anOldRecord = {
  day: '2026-03-14',
  symptoms: ['cramps', 'napping', 'low-mood', 'bloating'],
};

function retire(slug: string, on: string): readonly Symptom[] {
  return symptoms.map((symptom) =>
    symptom.slug === slug ? { ...symptom, retiredOn: on } : symptom,
  );
}

describe('the symptom catalogue', () => {
  it('offers seventy symptoms, so the catalogue cannot silently shrink', () => {
    expect(loggableSymptoms()).toHaveLength(70);
  });

  it('holds every slug it ever shipped, and holds nothing it never shipped', () => {
    expect([...symptomSlugs].sort()).toEqual([...slugsEverShipped].sort());
  });

  it('names each slug once', () => {
    const seenTwice = symptomSlugs.filter((slug, at) => symptomSlugs.indexOf(slug) !== at);

    expect(seenTwice).toEqual([]);
  });

  it('writes every slug in lowercase, with single hyphens and nothing else', () => {
    const misspelled = symptomSlugs.filter((slug) => !symptomSlugShape.test(slug));

    expect(misspelled).toEqual([]);
  });

  it('gives every symptom a name to show and a group to show it under', () => {
    const incomplete = symptoms.filter(
      (symptom) => symptom.name.trim() === '' || !symptomGroups.includes(symptom.group),
    );

    expect(incomplete).toEqual([]);
  });

  it('fills all eight groups, so no group renders empty', () => {
    expect(symptomGroups.map((group) => `${group} ${symptomsInGroup(group).length}`)).toEqual([
      'mood 10',
      'energy 8',
      'pain 11',
      'digestion 11',
      'skin 10',
      'sleep 8',
      'head 8',
      'libido 4',
    ]);
  });

  it('retires nothing yet, so seventy is both what it holds and what it offers', () => {
    expect(symptoms.filter(isRetired)).toEqual([]);
  });
});

describe('reading a record', () => {
  it('resolves every slug an old record names', () => {
    expect(unknownSymptomSlugs(anOldRecord.symptoms)).toEqual([]);
  });

  it('names the symptom a slug points at', () => {
    expect(findSymptom('lower-back-pain')?.name).toBe('Lower back pain');
  });

  it('refuses a slug the catalogue never held, and names it', () => {
    expect(unknownSymptomSlugs(['cramps', 'hangover', 'Bloating'])).toEqual([
      'hangover',
      'Bloating',
    ]);
  });

  it('refuses a slug that is only a name', () => {
    expect(isKnownSymptom('Lower back pain')).toBe(false);
  });
});

describe('a retired symptom', () => {
  const afterNappingRetires = retire('napping', '2027-03-01');

  it('still reads on an old record', () => {
    expect(unknownSymptomSlugs(anOldRecord.symptoms, afterNappingRetires)).toEqual([]);
    expect(findSymptom('napping', afterNappingRetires)?.name).toBe('Napping');
  });

  it('is never offered again', () => {
    const offered = loggableSymptoms(afterNappingRetires).map((symptom) => symptom.slug);

    expect(offered).toHaveLength(69);
    expect(offered).not.toContain('napping');
    expect(
      symptomsInGroup('sleep', afterNappingRetires).map((symptom) => symptom.slug),
    ).not.toContain('napping');
  });

  it('carries the day it was retired', () => {
    expect(findSymptom('napping', afterNappingRetires)?.retiredOn).toBe('2027-03-01');
  });
});
