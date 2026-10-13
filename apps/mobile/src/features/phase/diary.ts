import type { DayRecord } from '@emi/crypto';

import { words } from '../../language';

/**
 * The chips of the diary on the Cycle phase page, from the phasePage board. Each chip writes to a
 * field the day record already holds, as `docs/design/data-model.md` maps them: a mood to `moods`,
 * a food to `food`, and everything else, Energetic included, to `symptoms`.
 */

export type DiaryRow = 'symptoms' | 'food' | 'emotions';

/** The list on the day record a chip is written to. */
export type DiaryField = 'symptoms' | 'moods' | 'food';

export interface DiaryChip {
  readonly slug: string;
  readonly field: DiaryField;
  /** The words on the chip, in her language. */
  readonly label: string;
}

export const diaryRowOrder: readonly DiaryRow[] = ['symptoms', 'food', 'emotions'];

export const diaryRows: Readonly<Record<DiaryRow, readonly DiaryChip[]>> = {
  symptoms: [
    { slug: 'cramps', field: 'symptoms', label: words('phase.chip.cramps') },
    { slug: 'bloating', field: 'symptoms', label: words('phase.chip.bloating') },
    { slug: 'breast-tenderness', field: 'symptoms', label: words('phase.chip.tenderBreasts') },
    { slug: 'headache', field: 'symptoms', label: words('phase.chip.headache') },
    { slug: 'acne', field: 'symptoms', label: words('phase.chip.acne') },
    { slug: 'ovulation-pain', field: 'symptoms', label: words('phase.chip.painOnOneSide') },
  ],
  food: [
    { slug: 'cravings', field: 'food', label: words('phase.chip.cravings') },
    { slug: 'hungry', field: 'food', label: words('phase.chip.hungry') },
    { slug: 'little-appetite', field: 'food', label: words('phase.chip.littleAppetite') },
    { slug: 'sweet', field: 'food', label: words('phase.chip.sweet') },
    { slug: 'salty', field: 'food', label: words('phase.chip.salty') },
  ],
  emotions: [
    { slug: 'calm', field: 'moods', label: words('phase.chip.calm') },
    { slug: 'happy', field: 'moods', label: words('phase.chip.happy') },
    { slug: 'energetic', field: 'symptoms', label: words('phase.chip.energetic') },
    { slug: 'irritable', field: 'moods', label: words('phase.chip.irritable') },
    { slug: 'anxious', field: 'moods', label: words('phase.chip.anxious') },
    { slug: 'sad', field: 'moods', label: words('phase.chip.sad') },
  ],
};

/** Every chip of the diary, in the order the page draws them. */
export const diaryChips: readonly DiaryChip[] = diaryRowOrder.flatMap((row) => diaryRows[row]);

/** Whether the day holds the chip, read from the field the chip is written to. */
export function dayHolds(record: DayRecord | undefined, chip: DiaryChip): boolean {
  const held: readonly string[] = record?.[chip.field] ?? [];

  return held.includes(chip.slug);
}

/** The list of the chip's field after one press: the chip added, or the chip taken out. */
export function listAfterPress(record: DayRecord | undefined, chip: DiaryChip): readonly string[] {
  const held: readonly string[] = record?.[chip.field] ?? [];

  return held.includes(chip.slug)
    ? held.filter((each) => each !== chip.slug)
    : [...held, chip.slug];
}
