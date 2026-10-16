import { type OvulationSign, nothingYet, ovulationSignValues } from '@emi/crypto';

import { type WordKey, words } from '../../language';
import { type FertileDates, isFertileOn, theFertileWindowOn } from '../calendar/herMonthPhases';
import type { RingInputFrom } from '../cycle/ringInput';
import { forecastOf } from '../forecast/fromCache';

/**
 * The seven chips of the ovulation popup, from the ovulationPopup board (issue 272). Each one is a
 * value the day record already holds, as `docs/design/data-model.md` maps them.
 */

export interface SignOption {
  readonly value: OvulationSign;
  /** The words on the chip, in her language. */
  readonly label: string;
}

/** The words of each chip, in the order of the values, so a value is never written as a key here. */
const signLabels: readonly WordKey[] = [
  'ovulation.sign.eggWhiteDischarge',
  'ovulation.sign.painOnOneSide',
  'ovulation.sign.tenderBreasts',
  'ovulation.sign.higherSexDrive',
  'ovulation.sign.positiveOvulationTest',
  'ovulation.sign.higherTemperature',
  'ovulation.sign.nothingYet',
];

export interface SignChoice {
  readonly value: OvulationSign;
  /** The key of the words on the chip. */
  readonly labelKey: WordKey;
}

const choicesInValueOrder: readonly SignChoice[] = ovulationSignValues.map((value, index) => {
  const labelKey = signLabels[index];
  if (labelKey === undefined) {
    throw new Error(`${ovulationSignValues.length} signs carry ${signLabels.length} labels`);
  }

  return { value, labelKey };
});

/**
 * The chips in the order the popup shows them. "Nothing yet" comes first (issue 302), then the signs
 * in the order the board places them. The order is the same in every language.
 */
export const signChoices: readonly SignChoice[] = [
  ...choicesInValueOrder.filter((choice) => choice.value === nothingYet),
  ...choicesInValueOrder.filter((choice) => choice.value !== nothingYet),
];

export const signOptions: readonly SignOption[] = signChoices.map((choice) => ({
  value: choice.value,
  label: words(choice.labelKey),
}));

/**
 * The signs after one press. A second press takes a sign off. "Nothing yet" stands alone: pressing
 * it clears every sign, and pressing a sign clears "Nothing yet".
 */
export function signsAfterPress(
  chosen: readonly OvulationSign[],
  pressed: OvulationSign,
): readonly OvulationSign[] {
  if (chosen.includes(pressed)) {
    return chosen.filter((sign) => sign !== pressed);
  }

  if (pressed === nothingYet) {
    return [nothingYet];
  }

  return [...chosen.filter((sign) => sign !== nothingYet), pressed];
}

/**
 * The fertile window to ask about today, or nothing when Emi does not ask. Emi asks only on a day
 * inside the forecast fertile window, which is the window the Sex page note and the calendar marks
 * name, only once a forecast exists, and only once a day.
 */
export function theWindowToAskIn(
  from: RingInputFrom,
  shownToday: boolean,
): FertileDates | undefined {
  if (shownToday) {
    return undefined;
  }

  if (forecastOf(from.cycles, from.statedCycleLengthDays).kind !== 'forecast') {
    return undefined;
  }

  return isFertileOn(from, from.today) ? theFertileWindowOn(from, from.today) : undefined;
}
