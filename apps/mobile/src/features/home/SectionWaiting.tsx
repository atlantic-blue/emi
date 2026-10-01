/**
 * A section of the screen she opens that her own days cannot fill yet.
 *
 * Emi holds no sample data, so the section says what it needs and how far off she is instead of
 * drawing somebody else's numbers. The count it names is a count Emi read out of her phone, never
 * a count Emi chose, because a number she cannot check is a number she has to take on trust.
 */

/** The three sections of the screen she opens that her days fill, each named by what it draws. */
export type WaitingSection = 'cycles' | 'trend' | 'patterns';

/** The order the drawing places them in, which is the order the screen draws them. */
export const waitingSections: readonly WaitingSection[] = ['cycles', 'trend', 'patterns'];

export function sectionWaitingTestID(section: WaitingSection): string {
  return `home-waiting-${section}`;
}

export function sectionWaitingHeadingTestID(section: WaitingSection): string {
  return `${sectionWaitingTestID(section)}-heading`;
}

/** The line that says what the section needs before it can be drawn. */
export function sectionWaitingNeedsTestID(section: WaitingSection): string {
  return `${sectionWaitingTestID(section)}-needs`;
}

/** The line that names the count Emi read, where the sentence above it does not carry one. */
export function sectionWaitingReadTestID(section: WaitingSection): string {
  return `${sectionWaitingTestID(section)}-read`;
}
