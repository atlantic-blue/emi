import { type Symptom, type SymptomGroup, isRetired, symptoms } from './symptoms';

/**
 * A mood is the mood group of the catalogue, read through its own name. She reaches for a mood
 * daily and for a symptom occasionally, so the log sheet gives the group its own control at the
 * top and a record keeps what she picks in `moods` rather than in `symptoms`.
 *
 * There is one catalogue and one slug for each thing in it. A second list of mood words would
 * drift from this one, and a day that named the same feeling from both lists would be counted
 * twice by every screen that reads her history.
 */
export const moodGroup: SymptomGroup = 'mood';

/** Every mood the given catalogue holds, retired ones included, in catalogue order. */
export function moodsIn(catalogue: readonly Symptom[] = symptoms): readonly Symptom[] {
  return catalogue.filter((symptom) => symptom.group === moodGroup);
}

/** What the rest of the log sheet offers, which is every group the mood picker does not carry. */
export function symptomsOutsideTheMoodPicker(
  catalogue: readonly Symptom[] = symptoms,
): readonly Symptom[] {
  return catalogue.filter((symptom) => symptom.group !== moodGroup);
}

/** The moods that ship, which is the mood group of the catalogue that ships. */
export const moods: readonly Symptom[] = moodsIn();

/** The slug of each of them, which is what a record carries and what never changes. */
export const moodSlugs: readonly string[] = moods.map((mood) => mood.slug);

/** What the picker offers her. A retired mood is readable and is never offered again. */
export function loggableMoods(catalogue: readonly Symptom[] = symptoms): readonly Symptom[] {
  return moodsIn(catalogue).filter((mood) => !isRetired(mood));
}

/** Resolves a retired mood too, so a record written before it was retired still reads. */
export function findMood(
  slug: string,
  catalogue: readonly Symptom[] = symptoms,
): Symptom | undefined {
  return moodsIn(catalogue).find((mood) => mood.slug === slug);
}

/** Whether a slug names a mood. A symptom from another group is not one. */
export function isKnownMood(slug: string, catalogue: readonly Symptom[] = symptoms): boolean {
  return findMood(slug, catalogue) !== undefined;
}

/**
 * The validator ENVELOPE-2 calls on the `moods` array of a record. It returns the offenders
 * rather than a boolean, so the refusal can name them. A slug from another group is an offender:
 * a symptom she logged belongs in `symptoms`, and only a mood belongs here.
 */
export function unknownMoodSlugs(
  slugs: readonly string[],
  catalogue: readonly Symptom[] = symptoms,
): readonly string[] {
  return slugs.filter((slug) => !isKnownMood(slug, catalogue));
}
