import type { DayRecord } from '@emi/crypto';

import { words } from '../../language';
import type { DiaryChange } from '../log/logDay';

/**
 * The chips of the diary on the Cycle phase page. Every chip writes a catalogue slug to `symptoms`,
 * the field the log writes, so the diary and the day from the calendar read the same day. Days
 * saved before that hold a mood in `moods` and a food in `food`, and they still light the chip.
 */

export type DiaryRow = 'symptoms' | 'food' | 'emotions';

export interface DiaryChip {
  readonly row: DiaryRow;
  readonly slug: string;
  /** The words on the chip, in her language. */
  readonly label: string;
  /** Where the diary wrote this chip before it wrote to `symptoms`. */
  readonly earlier?: { readonly field: 'moods' | 'food'; readonly slug: string };
}

export const diaryRowOrder: readonly DiaryRow[] = ['symptoms', 'food', 'emotions'];

function aSymptom(slug: string, label: string): DiaryChip {
  return { row: 'symptoms', slug, label };
}

function aFood(slug: string, earlier: string, label: string): DiaryChip {
  return { row: 'food', slug, label, earlier: { field: 'food', slug: earlier } };
}

function aMood(slug: string, label: string): DiaryChip {
  return { row: 'emotions', slug, label, earlier: { field: 'moods', slug } };
}

export const diaryRows: Readonly<Record<DiaryRow, readonly DiaryChip[]>> = {
  symptoms: [
    aSymptom('cramps', words('phase.chip.cramps')),
    aSymptom('bloating', words('phase.chip.bloating')),
    aSymptom('breast-tenderness', words('phase.chip.tenderBreasts')),
    aSymptom('headache', words('phase.chip.headache')),
    aSymptom('acne', words('phase.chip.acne')),
    aSymptom('ovulation-pain', words('phase.chip.painOnOneSide')),
  ],
  food: [
    aFood('food-craving', 'cravings', words('phase.chip.cravings')),
    aFood('appetite-increase', 'hungry', words('phase.chip.hungry')),
    aFood('appetite-loss', 'little-appetite', words('phase.chip.littleAppetite')),
    aFood('sweet-craving', 'sweet', words('phase.chip.sweet')),
    aFood('salty-craving', 'salty', words('phase.chip.salty')),
  ],
  emotions: [
    aMood('calm', words('phase.chip.calm')),
    aMood('happy', words('phase.chip.happy')),
    { row: 'emotions', slug: 'energetic', label: words('phase.chip.energetic') },
    aMood('irritable', words('phase.chip.irritable')),
    aMood('anxious', words('phase.chip.anxious')),
    aMood('sad', words('phase.chip.sad')),
  ],
};

/** Every chip of the diary, in the order the page draws them. */
export const diaryChips: readonly DiaryChip[] = diaryRowOrder.flatMap((row) => diaryRows[row]);

function heldEarlier(record: DayRecord | undefined, chip: DiaryChip): boolean {
  return (
    chip.earlier !== undefined && (record?.[chip.earlier.field] ?? []).includes(chip.earlier.slug)
  );
}

/** Whether the day holds the chip, in `symptoms` or where the diary wrote it before. */
export function dayHolds(record: DayRecord | undefined, chip: DiaryChip): boolean {
  return (record?.symptoms ?? []).includes(chip.slug) || heldEarlier(record, chip);
}

/** The lists of the day after one press: the chip added to `symptoms`, or taken off everywhere. */
export function changeAfterPress(record: DayRecord | undefined, chip: DiaryChip): DiaryChange {
  const symptoms = record?.symptoms ?? [];
  if (!dayHolds(record, chip)) {
    return { symptoms: [...symptoms, chip.slug] };
  }

  const change: DiaryChange = { symptoms: symptoms.filter((each) => each !== chip.slug) };
  if (chip.earlier === undefined || !heldEarlier(record, chip)) {
    return change;
  }
  const { field, slug } = chip.earlier;

  return { ...change, [field]: (record?.[field] ?? []).filter((each) => each !== slug) };
}
