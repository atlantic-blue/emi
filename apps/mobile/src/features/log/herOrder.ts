import { type SymptomGroup, symptomGroups } from '@emi/cycle';

/**
 * The order the log draws its group tiles in: the ones she named in the first run, in the order
 * she tapped them, then every other group in the order it has today.
 *
 * Nothing is dropped and nothing is added. A woman who named two groups still reaches the other
 * six, and a woman who named none reads the sheet everybody else reads, so the answer moves what
 * she scrolls past and never what she can record.
 */
export function groupsInHerOrder(focus: readonly SymptomGroup[] = []): readonly SymptomGroup[] {
  const hers = symptomGroups
    .filter((group) => focus.includes(group))
    .sort((one, other) => focus.indexOf(one) - focus.indexOf(other));

  return [...hers, ...symptomGroups.filter((group) => !hers.includes(group))];
}

/**
 * How many groups the screen before the hold names for a woman who chose none. The log opens with
 * every group, so these are the first few of them, named rather than left as a gap.
 */
export const GROUPS_NAMED_FOR_EVERYBODY = 3;

/**
 * The groups her log draws first: the ones she named, in her order, or the first groups of the
 * order everybody else reads where she named none.
 */
export function theGroupsSheSeesFirst(focus: readonly SymptomGroup[]): readonly SymptomGroup[] {
  const ordered = groupsInHerOrder(focus);

  return focus.length === 0
    ? ordered.slice(0, GROUPS_NAMED_FOR_EVERYBODY)
    : ordered.slice(0, focus.length);
}
