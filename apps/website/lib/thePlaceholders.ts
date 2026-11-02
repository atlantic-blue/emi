/**
 * The holes the approved board leaves for text that nobody has written yet: a review from a reader,
 * the name she signs it with, and the note from the founder who has not written hers.
 *
 * They are not words of the product, so they are not in `app/words`. A word there is translated
 * into three languages and a test refuses one that reads the same in two of them, and a hole reads
 * the same in every language until the text that fills it arrives.
 *
 * The board writes each of them in capitals inside square brackets, which is how a reader of the
 * page can tell that nothing was promised. They leave with the content: a real review replaces the
 * first two, and the founder's own sentences replace the third.
 */

/** What one reader said about Emi, until a reader has said something. */
export const A_REVIEW_NOBODY_HAS_WRITTEN = '[A REAL REVIEW, IN THE PERSON’S WORDS]';

/** Who said it, until somebody has. */
export const A_NAME_NOBODY_HAS_SIGNED = '[NAME OR INITIALS]';

/** Why one of the two founders is building Emi, in her own words, once she has written them. */
export const THE_NOTE_IULIIA_HAS_NOT_WRITTEN =
  '[IULIIA’S NOTE, 40 TO 70 WORDS: WHY SHE IS BUILDING EMI, IN HER OWN WORDS]';

/** The three, as data, for a test that reads the page for a hole it does not expect. */
export const thePlaceholders = [
  A_REVIEW_NOBODY_HAS_WRITTEN,
  A_NAME_NOBODY_HAS_SIGNED,
  THE_NOTE_IULIIA_HAS_NOT_WRITTEN,
] as const;
