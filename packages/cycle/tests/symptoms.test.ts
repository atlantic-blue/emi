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
  'sweet-craving',
  'salty-craving',
  'spicy-craving',
  'meat-craving',
  'forgetful',
  'gas',
  'greasy-hair',
  'hair-loss',
  'happy',
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
  'sad',
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
  it('offers seventy six symptoms, so the catalogue cannot silently shrink', () => {
    expect(loggableSymptoms()).toHaveLength(76);
    expect(loggableSymptoms()).not.toHaveLength(72);
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

  it('gives every symptom a group to show it under', () => {
    const incomplete = symptoms.filter((symptom) => !symptomGroups.includes(symptom.group));

    expect(incomplete).toEqual([]);
  });

  it('holds no name, so a screen reads the name in her language and never an English one', () => {
    const withMoreThanTheId = symptoms.filter((symptom) =>
      Object.keys(symptom).some((field) => !['slug', 'group', 'retiredOn'].includes(field)),
    );

    expect(withMoreThanTheId).toEqual([]);
  });

  it('fills all nine groups, so no group renders empty', () => {
    expect(symptomGroups.map((group) => `${group} ${symptomsInGroup(group).length}`)).toEqual([
      'mood 12',
      'energy 8',
      'pain 11',
      'appetite 7',
      'digestive 8',
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

describe('the split of digestion into appetite and digestive symptoms', () => {
  it('holds no digestion group any more, so no screen can draw it', () => {
    expect(symptomGroups as readonly string[]).not.toContain('digestion');
    expect(symptomGroups.indexOf('appetite')).toBe(symptomGroups.indexOf('pain') + 1);
    expect(symptomGroups.indexOf('digestive')).toBe(symptomGroups.indexOf('appetite') + 1);
  });

  it('puts hunger, cravings, sweet, salty, spicy and meat under appetite', () => {
    expect(symptomsInGroup('appetite').map((symptom) => symptom.slug)).toEqual([
      'appetite-increase',
      'appetite-loss',
      'food-craving',
      'sweet-craving',
      'salty-craving',
      'spicy-craving',
      'meat-craving',
    ]);
  });

  it('puts the symptoms of the gut under digestive symptoms', () => {
    expect(symptomsInGroup('digestive').map((symptom) => symptom.slug)).toEqual([
      'nausea',
      'bloating',
      'constipation',
      'diarrhoea',
      'vomiting',
      'gas',
      'stomach-ache',
      'heartburn',
    ]);
  });

  it('reads a day saved under digestion under the two new groups, with no change to the day', () => {
    const anOldDay = { day: '2026-03-14', symptoms: ['nausea', 'food-craving'] } as const;

    expect(unknownSymptomSlugs(anOldDay.symptoms)).toEqual([]);
    expect(anOldDay.symptoms.map((slug) => findSymptom(slug)?.group)).toEqual([
      'digestive',
      'appetite',
    ]);
  });
});

describe('reading a record', () => {
  it('resolves every slug an old record names', () => {
    expect(unknownSymptomSlugs(anOldRecord.symptoms)).toEqual([]);
  });

  it('resolves the symptom a slug points at', () => {
    expect(findSymptom('lower-back-pain')).toEqual({ slug: 'lower-back-pain', group: 'pain' });
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
    expect(findSymptom('napping', afterNappingRetires)?.slug).toBe('napping');
  });

  it('is never offered again', () => {
    const offered = loggableSymptoms(afterNappingRetires).map((symptom) => symptom.slug);

    expect(offered).toHaveLength(75);
    expect(offered).not.toContain('napping');
    expect(
      symptomsInGroup('sleep', afterNappingRetires).map((symptom) => symptom.slug),
    ).not.toContain('napping');
  });

  it('carries the day it was retired', () => {
    expect(findSymptom('napping', afterNappingRetires)?.retiredOn).toBe('2027-03-01');
  });
});
