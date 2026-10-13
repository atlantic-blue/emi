import { dischargeValues, flowValues, productValues } from '@emi/crypto';

import { type WordKey, words } from '../../language';
import type { PeriodAnswers } from '../log/logDay';

/**
 * The three groups of the Period page, from the periodPage board. Flow and Discharge take one
 * answer each, and What you used takes several. Each answer is a value the day record already
 * holds, so "No bleeding" is the flow `none` and keeps every period rule.
 */

export type PeriodGroup = keyof PeriodAnswers;

export const periodGroupOrder: readonly PeriodGroup[] = ['flow', 'discharge', 'products'];

export interface PeriodOption {
  readonly value: string;
  /** The words on the chip, in her language. */
  readonly label: string;
}

/**
 * The words of each answer, listed in the order of its values rather than keyed by them, because
 * the scan of the catalogue reads every string inside a list of keys, and a value is not a key.
 */
const flowLabels: readonly WordKey[] = [
  'period.flow.none',
  'log.flow.spotting',
  'log.flow.light',
  'log.flow.medium',
  'log.flow.heavy',
];
const dischargeLabels: readonly WordKey[] = [
  'period.discharge.none',
  'period.discharge.sticky',
  'period.discharge.creamy',
  'period.discharge.eggWhite',
  'period.discharge.watery',
  'period.discharge.unusual',
];
const productLabels: readonly WordKey[] = [
  'period.products.pad',
  'period.products.tampon',
  'period.products.cup',
  'period.products.periodUnderwear',
  'period.products.liner',
];

/** Each value beside its words. A value with no words is a list out of step, and it is thrown. */
function optionsOf(values: readonly string[], labels: readonly WordKey[]): readonly PeriodOption[] {
  if (values.length !== labels.length) {
    throw new Error(`${values.length} answers carry ${labels.length} labels`);
  }

  return values.map((value, index) => ({ value, label: words(labels[index] as WordKey) }));
}

export const periodOptions: Readonly<Record<PeriodGroup, readonly PeriodOption[]>> = {
  flow: optionsOf(flowValues, flowLabels),
  discharge: optionsOf(dischargeValues, dischargeLabels),
  products: optionsOf(productValues, productLabels),
};

/** Whether a chip is filled, for a group of one answer and for the group of several alike. */
export function isPicked(answers: PeriodAnswers, group: PeriodGroup, value: string): boolean {
  return group === 'products'
    ? (answers.products ?? []).some((product) => product === value)
    : answers[group] === value;
}

/**
 * The answers after one press. In Flow and Discharge a press on another chip changes the answer,
 * and a second press on the chosen chip takes it off. In What you used each press adds or takes
 * off one product, and the list keeps the order of the board.
 */
export function periodAnswersAfterPress(
  answers: PeriodAnswers,
  press: { readonly group: PeriodGroup; readonly value: string },
): PeriodAnswers {
  if (press.group === 'products') {
    const held = answers.products ?? [];
    const isHeld = held.some((product) => product === press.value);
    const chosen = productValues.filter((product) =>
      product === press.value ? !isHeld : held.includes(product),
    );
    const { products, ...rest } = answers;

    return chosen.length === 0 ? rest : { ...rest, products: chosen };
  }

  const { [press.group]: held, ...rest } = answers;

  return held === press.value ? rest : ({ ...rest, [press.group]: press.value } as PeriodAnswers);
}

/** Whether the page holds something other than what the day holds, so a save would change it. */
export function periodAnswersDiffer(left: PeriodAnswers, right: PeriodAnswers): boolean {
  return (
    left.flow !== right.flow ||
    left.discharge !== right.discharge ||
    (left.products ?? []).join() !== (right.products ?? []).join()
  );
}
