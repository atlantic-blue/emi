import { type SymptomGroup, symptomGroups } from '@emi/cycle';

import type { SymptomsAsked } from './LogSymptoms';
import { theGroupsSheSeesFirst } from './herOrder';

/**
 * The log opens on the symptoms of one group when its address names one, on the symptoms of her
 * own groups when it asks for the symptoms, and on the flow when it asks for neither.
 *
 * The group travels in the address rather than in a store, so the screen she lands on is decided
 * by the link she pressed and a woman who pressed the log tab gets the log she had yesterday.
 */

/** The name the address carries the group under. */
export const groupParameter = 'group';

/** The name the address carries what the log opens on under. */
export const opensOnParameter = 'on';

/** The value of that name which asks for the symptom groups rather than for the flow picker. */
export const theSymptoms = 'symptoms';

/** What the log opens on: her symptom groups, or the flow picker it has always opened on. */
export type OpensOn = 'flow' | 'symptoms';

/**
 * What the address asks the log to open on. Anything other than the one value is read as the flow,
 * so the plain address the Log column of the dock carries opens on the picker it always did.
 */
export function opensOn(asked: string | undefined): OpensOn {
  return asked === theSymptoms ? 'symptoms' : 'flow';
}

/** The group the home line offers on a day she said is hard. */
export const painGroup: SymptomGroup = 'pain';

/**
 * The group the address asked for, and nothing at all where it named none or named something that
 * is not a group. An unknown name is read as no group rather than as an error, because an address
 * is typed by anybody and a screen that refuses to draw is worse than a screen that draws the log.
 */
export function groupAskedFor(asked: string | undefined): SymptomGroup | undefined {
  return symptomGroups.find((group) => group === asked);
}

/** The symptoms of the one group she pressed a tile for. */
export function symptomsOfAGroup(group: SymptomGroup): SymptomsAsked {
  return { groups: [group], opensOn: 'groups' };
}

/** The search, over the groups she sees first, which is where Search sends her. */
export function symptomsBySearch(focus: readonly SymptomGroup[]): SymptomsAsked {
  return { groups: theGroupsSheSeesFirst(focus), opensOn: 'search' };
}

/**
 * What the address asks the log to open on: the symptoms of the group it names, the symptoms of
 * her own groups, or nothing at all, which is the flow.
 */
export function symptomsAskedBy(
  address: { readonly group?: string; readonly on?: string },
  focus: readonly SymptomGroup[],
): SymptomsAsked | undefined {
  const group = groupAskedFor(address.group);

  if (group !== undefined) {
    return symptomsOfAGroup(group);
  }

  return opensOn(address.on) === 'symptoms'
    ? { groups: theGroupsSheSeesFirst(focus), opensOn: 'groups' }
    : undefined;
}
