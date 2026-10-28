import { type WordKey, words } from '../../language';

const prefix = 'symptom.';

/**
 * The key of each symptom and mood of the catalogue, written out in catalogue order. A list and
 * not a template, so the check that every key is read finds each one.
 */
const keysOfTheCatalogue: readonly WordKey[] = [
  'symptom.irritable',
  'symptom.anxious',
  'symptom.low-mood',
  'symptom.tearful',
  'symptom.angry',
  'symptom.calm',
  'symptom.content',
  'symptom.mood-swings',
  'symptom.overwhelmed',
  'symptom.sensitive',
  'symptom.happy',
  'symptom.sad',
  'symptom.fatigue',
  'symptom.exhausted',
  'symptom.sluggish',
  'symptom.restless',
  'symptom.energetic',
  'symptom.dizzy',
  'symptom.weak',
  'symptom.shaky',
  'symptom.cramps',
  'symptom.lower-back-pain',
  'symptom.breast-tenderness',
  'symptom.breast-swelling',
  'symptom.pelvic-pain',
  'symptom.ovulation-pain',
  'symptom.joint-pain',
  'symptom.muscle-ache',
  'symptom.leg-ache',
  'symptom.shoulder-tension',
  'symptom.vulval-pain',
  'symptom.appetite-normal',
  'symptom.appetite-increase',
  'symptom.appetite-loss',
  'symptom.food-craving',
  'symptom.sweet-craving',
  'symptom.salty-craving',
  'symptom.nausea',
  'symptom.bloating',
  'symptom.constipation',
  'symptom.diarrhoea',
  'symptom.vomiting',
  'symptom.gas',
  'symptom.stomach-ache',
  'symptom.heartburn',
  'symptom.acne',
  'symptom.oily-skin',
  'symptom.dry-skin',
  'symptom.itchy-skin',
  'symptom.sensitive-skin',
  'symptom.rash',
  'symptom.hot-flush',
  'symptom.hair-loss',
  'symptom.greasy-hair',
  'symptom.puffy-face',
  'symptom.insomnia',
  'symptom.restless-sleep',
  'symptom.vivid-dreams',
  'symptom.night-sweats',
  'symptom.early-waking',
  'symptom.oversleeping',
  'symptom.napping',
  'symptom.hard-to-wake',
  'symptom.headache',
  'symptom.migraine',
  'symptom.brain-fog',
  'symptom.forgetful',
  'symptom.poor-concentration',
  'symptom.light-sensitivity',
  'symptom.sound-sensitivity',
  'symptom.sinus-pressure',
  'symptom.high-libido',
  'symptom.low-libido',
  'symptom.painful-sex',
  'symptom.vaginal-dryness',
];

/** The key of each slug. A symptom added to the catalogue with no key here fails its test. */
export const symptomNameKeys: ReadonlyMap<string, WordKey> = new Map(
  keysOfTheCatalogue.map((key) => [key.slice(prefix.length), key]),
);

/**
 * The name of a symptom or a mood in the language she reads. A slug with no key has nothing to
 * translate, so she reads the slug rather than an empty chip.
 */
export function symptomName(slug: string): string {
  const key = symptomNameKeys.get(slug);

  return key === undefined ? slug : words(key);
}
