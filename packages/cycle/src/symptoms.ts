/**
 * The slug is the only part of a symptom that is written into a record, so it is the only part
 * that can never change. The catalogue holds no name: the application reads the name from its
 * language files, so no screen can show one language to a woman who reads another. A symptom that
 * is no longer offered carries `retiredOn` and stays in the catalogue, because six cycles of her
 * history point at it and a record that names a slug nothing resolves is a record she cannot read.
 */

/** The nine groups the log sheet divides the catalogue into. `symptomGroups` holds their order. */
export type SymptomGroup =
  'mood' | 'energy' | 'pain' | 'appetite' | 'digestive' | 'skin' | 'sleep' | 'head' | 'libido';

/** One entry. The slug is what a record points at and it never changes. */
export interface Symptom {
  readonly slug: string;
  readonly group: SymptomGroup;
  /** The day it stopped being offered, as `YYYY-MM-DD`. Absent while it is still offered. */
  readonly retiredOn?: string;
}

/** The order the log sheet shows the groups in. */
export const symptomGroups: readonly SymptomGroup[] = [
  'mood',
  'energy',
  'pain',
  'appetite',
  'digestive',
  'skin',
  'sleep',
  'head',
  'libido',
];

/**
 * The catalogue itself, and the only list of it. A screen reads this rather than keeping a copy
 * that goes out of date on its own.
 */
export const symptoms: readonly Symptom[] = [
  { slug: 'irritable', group: 'mood' },
  { slug: 'anxious', group: 'mood' },
  { slug: 'low-mood', group: 'mood' },
  { slug: 'tearful', group: 'mood' },
  { slug: 'angry', group: 'mood' },
  { slug: 'calm', group: 'mood' },
  { slug: 'content', group: 'mood' },
  { slug: 'mood-swings', group: 'mood' },
  { slug: 'overwhelmed', group: 'mood' },
  { slug: 'sensitive', group: 'mood' },
  { slug: 'happy', group: 'mood' },
  { slug: 'sad', group: 'mood' },

  { slug: 'fatigue', group: 'energy' },
  { slug: 'exhausted', group: 'energy' },
  { slug: 'sluggish', group: 'energy' },
  { slug: 'restless', group: 'energy' },
  { slug: 'energetic', group: 'energy' },
  { slug: 'dizzy', group: 'energy' },
  { slug: 'weak', group: 'energy' },
  { slug: 'shaky', group: 'energy' },

  { slug: 'cramps', group: 'pain' },
  { slug: 'lower-back-pain', group: 'pain' },
  { slug: 'breast-tenderness', group: 'pain' },
  { slug: 'breast-swelling', group: 'pain' },
  { slug: 'pelvic-pain', group: 'pain' },
  { slug: 'ovulation-pain', group: 'pain' },
  { slug: 'joint-pain', group: 'pain' },
  { slug: 'muscle-ache', group: 'pain' },
  { slug: 'leg-ache', group: 'pain' },
  { slug: 'shoulder-tension', group: 'pain' },
  { slug: 'vulval-pain', group: 'pain' },

  { slug: 'appetite-normal', group: 'appetite' },
  { slug: 'appetite-increase', group: 'appetite' },
  { slug: 'appetite-loss', group: 'appetite' },
  { slug: 'food-craving', group: 'appetite' },
  { slug: 'sweet-craving', group: 'appetite' },
  { slug: 'salty-craving', group: 'appetite' },

  { slug: 'nausea', group: 'digestive' },
  { slug: 'bloating', group: 'digestive' },
  { slug: 'constipation', group: 'digestive' },
  { slug: 'diarrhoea', group: 'digestive' },
  { slug: 'vomiting', group: 'digestive' },
  { slug: 'gas', group: 'digestive' },
  { slug: 'stomach-ache', group: 'digestive' },
  { slug: 'heartburn', group: 'digestive' },

  { slug: 'acne', group: 'skin' },
  { slug: 'oily-skin', group: 'skin' },
  { slug: 'dry-skin', group: 'skin' },
  { slug: 'itchy-skin', group: 'skin' },
  { slug: 'sensitive-skin', group: 'skin' },
  { slug: 'rash', group: 'skin' },
  { slug: 'hot-flush', group: 'skin' },
  { slug: 'hair-loss', group: 'skin' },
  { slug: 'greasy-hair', group: 'skin' },
  { slug: 'puffy-face', group: 'skin' },

  { slug: 'insomnia', group: 'sleep' },
  { slug: 'restless-sleep', group: 'sleep' },
  { slug: 'vivid-dreams', group: 'sleep' },
  { slug: 'night-sweats', group: 'sleep' },
  { slug: 'early-waking', group: 'sleep' },
  { slug: 'oversleeping', group: 'sleep' },
  { slug: 'napping', group: 'sleep' },
  { slug: 'hard-to-wake', group: 'sleep' },

  { slug: 'headache', group: 'head' },
  { slug: 'migraine', group: 'head' },
  { slug: 'brain-fog', group: 'head' },
  { slug: 'forgetful', group: 'head' },
  { slug: 'poor-concentration', group: 'head' },
  { slug: 'light-sensitivity', group: 'head' },
  { slug: 'sound-sensitivity', group: 'head' },
  { slug: 'sinus-pressure', group: 'head' },

  { slug: 'high-libido', group: 'libido' },
  { slug: 'low-libido', group: 'libido' },
  { slug: 'painful-sex', group: 'libido' },
  { slug: 'vaginal-dryness', group: 'libido' },
];

/** A slug is lowercase letters and digits, and single hyphens between them. */
export const symptomSlugShape = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Every slug, the retired ones too, for the test that proves no two entries ever shared one. */
export const symptomSlugs: readonly string[] = symptoms.map((symptom) => symptom.slug);

/** Resolves a retired symptom too, so a record written before it was retired still reads. */
export function findSymptom(
  slug: string,
  catalogue: readonly Symptom[] = symptoms,
): Symptom | undefined {
  return catalogue.find((symptom) => symptom.slug === slug);
}

/**
 * Reads the catalogue and not the shape of the slug, so a slug that looks right and names nothing
 * is still refused.
 */
export function isKnownSymptom(slug: string, catalogue: readonly Symptom[] = symptoms): boolean {
  return findSymptom(slug, catalogue) !== undefined;
}

/** A retired entry is readable forever and offered never again. */
export function isRetired(symptom: Symptom): boolean {
  return symptom.retiredOn !== undefined;
}

/** What the log sheet offers her. A retired symptom is readable and is never offered again. */
export function loggableSymptoms(catalogue: readonly Symptom[] = symptoms): readonly Symptom[] {
  return catalogue.filter((symptom) => !isRetired(symptom));
}

/** One group of the log sheet, in catalogue order. The retired entries are already out of it. */
export function symptomsInGroup(
  group: SymptomGroup,
  catalogue: readonly Symptom[] = symptoms,
): readonly Symptom[] {
  return loggableSymptoms(catalogue).filter((symptom) => symptom.group === group);
}

/**
 * The validator ENVELOPE-2 calls on the `symptoms` array of a record. It returns the offenders
 * rather than a boolean, so the refusal can name them.
 */
export function unknownSymptomSlugs(
  slugs: readonly string[],
  catalogue: readonly Symptom[] = symptoms,
): readonly string[] {
  return slugs.filter((slug) => !isKnownSymptom(slug, catalogue));
}
