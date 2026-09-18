import {
  type Symptom,
  type SymptomGroup,
  loggableSymptoms,
  symptomGroups,
  symptoms,
} from '@emi/cycle';

/**
 * Search reads the display name and the slug, because an export shows her a slug and she then
 * looks for the same letters. Diacritics are folded, so diarrhoea is found by a woman who types
 * without them.
 */

export interface SymptomSection {
  /** Null while she is searching: the results are one list and they belong to no group. */
  readonly group: SymptomGroup | null;
  readonly symptoms: readonly Symptom[];
}

export function matchesQuery(symptom: Symptom, query: string): boolean {
  const wanted = normalise(query);
  if (wanted === '') {
    return true;
  }
  return normalise(symptom.name).includes(wanted) || normalise(symptom.slug).includes(wanted);
}

/** A name that starts with her letters comes above one that only contains them. */
export function searchSymptoms(
  query: string,
  catalogue: readonly Symptom[] = symptoms,
): readonly Symptom[] {
  const wanted = normalise(query);
  return loggableSymptoms(catalogue)
    .filter((symptom) => matchesQuery(symptom, query))
    .slice()
    .sort((one, other) => {
      const rank = rankOf(one, wanted) - rankOf(other, wanted);
      return rank !== 0 ? rank : one.name.localeCompare(other.name);
    });
}

/**
 * Grouped while she browses, and one flat list while she searches, because a search that keeps
 * eight headings makes her read the headings to find the single answer.
 */
export function sectionsFor(
  query: string,
  catalogue: readonly Symptom[] = symptoms,
): readonly SymptomSection[] {
  const offered = loggableSymptoms(catalogue);
  if (normalise(query) === '') {
    return symptomGroups
      .map((group) => ({
        group,
        symptoms: offered.filter((each) => each.group === group),
      }))
      .filter((section) => section.symptoms.length > 0);
  }

  const found = searchSymptoms(query, catalogue);
  return found.length === 0 ? [] : [{ group: null, symptoms: found }];
}

function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function rankOf(symptom: Symptom, wanted: string): number {
  const name = normalise(symptom.name);
  if (name === wanted) {
    return 0;
  }
  if (name.startsWith(wanted)) {
    return 1;
  }
  if (name.split(' ').some((word) => word.startsWith(wanted))) {
    return 2;
  }
  return 3;
}
