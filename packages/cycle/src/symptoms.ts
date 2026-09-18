/**
 * The slug is the only part of a symptom that is written into a record, so it is the only part
 * that can never change. A name is display text and may be rewritten at any time. A symptom that
 * is no longer offered carries `retiredOn` and stays in the catalogue, because six cycles of her
 * history point at it and a record that names a slug nothing resolves is a record she cannot read.
 */

/** The eight groups the log sheet divides the catalogue into. `symptomGroups` holds their order. */
export type SymptomGroup =
  'mood' | 'energy' | 'pain' | 'digestion' | 'skin' | 'sleep' | 'head' | 'libido';

/**
 * One entry. The slug is what a record points at and it never changes. The name is display text
 * and may be rewritten whenever the wording is wrong.
 */
export interface Symptom {
  readonly slug: string;
  readonly name: string;
  readonly group: SymptomGroup;
  /** The day it stopped being offered, as `YYYY-MM-DD`. Absent while it is still offered. */
  readonly retiredOn?: string;
}

/** The order the log sheet shows the groups in. */
export const symptomGroups: readonly SymptomGroup[] = [
  'mood',
  'energy',
  'pain',
  'digestion',
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
  { slug: 'irritable', name: 'Irritable', group: 'mood' },
  { slug: 'anxious', name: 'Anxious', group: 'mood' },
  { slug: 'low-mood', name: 'Low mood', group: 'mood' },
  { slug: 'tearful', name: 'Tearful', group: 'mood' },
  { slug: 'angry', name: 'Angry', group: 'mood' },
  { slug: 'calm', name: 'Calm', group: 'mood' },
  { slug: 'content', name: 'Content', group: 'mood' },
  { slug: 'mood-swings', name: 'Mood swings', group: 'mood' },
  { slug: 'overwhelmed', name: 'Overwhelmed', group: 'mood' },
  { slug: 'sensitive', name: 'Sensitive', group: 'mood' },

  { slug: 'fatigue', name: 'Fatigue', group: 'energy' },
  { slug: 'exhausted', name: 'Exhausted', group: 'energy' },
  { slug: 'sluggish', name: 'Sluggish', group: 'energy' },
  { slug: 'restless', name: 'Restless', group: 'energy' },
  { slug: 'energetic', name: 'Energetic', group: 'energy' },
  { slug: 'dizzy', name: 'Dizzy', group: 'energy' },
  { slug: 'weak', name: 'Weak', group: 'energy' },
  { slug: 'shaky', name: 'Shaky', group: 'energy' },

  { slug: 'cramps', name: 'Cramps', group: 'pain' },
  { slug: 'lower-back-pain', name: 'Lower back pain', group: 'pain' },
  { slug: 'breast-tenderness', name: 'Breast tenderness', group: 'pain' },
  { slug: 'breast-swelling', name: 'Breast swelling', group: 'pain' },
  { slug: 'pelvic-pain', name: 'Pelvic pain', group: 'pain' },
  { slug: 'ovulation-pain', name: 'Ovulation pain', group: 'pain' },
  { slug: 'joint-pain', name: 'Joint pain', group: 'pain' },
  { slug: 'muscle-ache', name: 'Muscle ache', group: 'pain' },
  { slug: 'leg-ache', name: 'Leg ache', group: 'pain' },
  { slug: 'shoulder-tension', name: 'Shoulder tension', group: 'pain' },
  { slug: 'vulval-pain', name: 'Vulval pain', group: 'pain' },

  { slug: 'bloating', name: 'Bloating', group: 'digestion' },
  { slug: 'nausea', name: 'Nausea', group: 'digestion' },
  { slug: 'vomiting', name: 'Vomiting', group: 'digestion' },
  { slug: 'constipation', name: 'Constipation', group: 'digestion' },
  { slug: 'diarrhoea', name: 'Diarrhoea', group: 'digestion' },
  { slug: 'gas', name: 'Gas', group: 'digestion' },
  { slug: 'stomach-ache', name: 'Stomach ache', group: 'digestion' },
  { slug: 'heartburn', name: 'Heartburn', group: 'digestion' },
  { slug: 'appetite-increase', name: 'Increased appetite', group: 'digestion' },
  { slug: 'appetite-loss', name: 'Loss of appetite', group: 'digestion' },
  { slug: 'food-craving', name: 'Food craving', group: 'digestion' },

  { slug: 'acne', name: 'Acne', group: 'skin' },
  { slug: 'oily-skin', name: 'Oily skin', group: 'skin' },
  { slug: 'dry-skin', name: 'Dry skin', group: 'skin' },
  { slug: 'itchy-skin', name: 'Itchy skin', group: 'skin' },
  { slug: 'sensitive-skin', name: 'Sensitive skin', group: 'skin' },
  { slug: 'rash', name: 'Rash', group: 'skin' },
  { slug: 'hot-flush', name: 'Hot flush', group: 'skin' },
  { slug: 'hair-loss', name: 'Hair loss', group: 'skin' },
  { slug: 'greasy-hair', name: 'Greasy hair', group: 'skin' },
  { slug: 'puffy-face', name: 'Puffy face', group: 'skin' },

  { slug: 'insomnia', name: 'Insomnia', group: 'sleep' },
  { slug: 'restless-sleep', name: 'Restless sleep', group: 'sleep' },
  { slug: 'vivid-dreams', name: 'Vivid dreams', group: 'sleep' },
  { slug: 'night-sweats', name: 'Night sweats', group: 'sleep' },
  { slug: 'early-waking', name: 'Early waking', group: 'sleep' },
  { slug: 'oversleeping', name: 'Oversleeping', group: 'sleep' },
  { slug: 'napping', name: 'Napping', group: 'sleep' },
  { slug: 'hard-to-wake', name: 'Hard to wake', group: 'sleep' },

  { slug: 'headache', name: 'Headache', group: 'head' },
  { slug: 'migraine', name: 'Migraine', group: 'head' },
  { slug: 'brain-fog', name: 'Brain fog', group: 'head' },
  { slug: 'forgetful', name: 'Forgetful', group: 'head' },
  { slug: 'poor-concentration', name: 'Poor concentration', group: 'head' },
  { slug: 'light-sensitivity', name: 'Light sensitivity', group: 'head' },
  { slug: 'sound-sensitivity', name: 'Sound sensitivity', group: 'head' },
  { slug: 'sinus-pressure', name: 'Sinus pressure', group: 'head' },

  { slug: 'high-libido', name: 'High libido', group: 'libido' },
  { slug: 'low-libido', name: 'Low libido', group: 'libido' },
  { slug: 'painful-sex', name: 'Painful sex', group: 'libido' },
  { slug: 'vaginal-dryness', name: 'Vaginal dryness', group: 'libido' },
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
