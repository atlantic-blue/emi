import { type SymptomGroup, symptomGroups } from '@emi/cycle';

/**
 * The order the log sheet draws its groups in: the ones she named in the first run, in the order
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
 * The groups the log tab draws under the flow picker: her order, without the one the address
 * named, because that one is already drawn above the picker.
 *
 * A group drawn twice is two sets of the same chips on one screen, and a press on either writes
 * the same day, so she reads one of them as the answer and the other as a second question.
 */
export function groupsUnderTheFlow(
  focus: readonly SymptomGroup[] = [],
  asked?: SymptomGroup,
): readonly SymptomGroup[] {
  return groupsInHerOrder(focus).filter((group) => group !== asked);
}
