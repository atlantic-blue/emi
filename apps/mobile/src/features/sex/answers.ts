import { orgasmValues, sexDriveValues, sexValues } from '@emi/crypto';

import { type WordKey, words } from '../../language';
import type { SexAnswers } from '../log/logDay';

/**
 * The three questions of the Sex page, from the sexPage board. Each answer is one of the values
 * the day record already holds, as `docs/design/data-model.md` maps them.
 */

export type SexGroup = keyof SexAnswers;

export const sexGroupOrder: readonly SexGroup[] = ['sex', 'sexDrive', 'orgasm'];

export interface SexOption {
  readonly value: string;
  /** The words on the chip, in her language. */
  readonly label: string;
}

/**
 * The words of each answer, listed in the order of its values rather than keyed by them. The claims
 * scan allows the word of the second answer to Sex only as its catalogue entry, and a map keyed by
 * that value would write the word in this file.
 */
const sexLabels: readonly WordKey[] = ['sex.sex.none', 'sex.sex.with', 'sex.sex.without'];
const sexDriveLabels: readonly WordKey[] = [
  'sex.sexDrive.low',
  'sex.sexDrive.neutral',
  'sex.sexDrive.high',
];
const orgasmLabels: readonly WordKey[] = [
  'sex.orgasm.yes',
  'sex.orgasm.no',
  'sex.orgasm.ratherNotSay',
];

/** Each value beside its words. A value with no words is a list out of step, and it is thrown. */
function optionsOf(values: readonly string[], labels: readonly WordKey[]): readonly SexOption[] {
  if (values.length !== labels.length) {
    throw new Error(`${values.length} answers carry ${labels.length} labels`);
  }

  return values.map((value, index) => ({ value, label: words(labels[index] as WordKey) }));
}

export const sexOptions: Readonly<Record<SexGroup, readonly SexOption[]>> = {
  sex: optionsOf(sexValues, sexLabels),
  sexDrive: optionsOf(sexDriveValues, sexDriveLabels),
  orgasm: optionsOf(orgasmValues, orgasmLabels),
};

/**
 * The answers after one press. A press on another chip changes the answer, and a second press on
 * the chip she already picked takes the answer off, so she can remove it.
 */
export function answersAfterPress(
  answers: SexAnswers,
  press: { readonly group: SexGroup; readonly value: string },
): SexAnswers {
  const { [press.group]: held, ...rest } = answers;

  return held === press.value ? rest : ({ ...rest, [press.group]: press.value } as SexAnswers);
}

/** Whether the page holds something other than what the day holds, so a save would change it. */
export function answersDiffer(left: SexAnswers, right: SexAnswers): boolean {
  return sexGroupOrder.some((group) => left[group] !== right[group]);
}
