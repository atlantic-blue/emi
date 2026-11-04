/**
 * The holes the approved board leaves for text that nobody has written yet: a review from a reader
 * and the name she signs it with.
 *
 * They are not words of the product, so they are not in `app/words`. A word there is translated
 * into three languages and a test refuses one that reads the same in two of them, and a hole reads
 * the same in every language until the text that fills it arrives.
 *
 * The board writes each of them in capitals inside square brackets, which is how a reader of the
 * page can tell that nothing was promised. They leave with the content: a real review replaces
 * both of them.
 *
 * The board leaves a third hole, for the note one of the two founders had not written. She wrote
 * it, so her own sentences are a word of the catalogues now and the hole is gone from the page.
 * The board still draws it, which is why the comparison with the board excludes that one band.
 */

/** What one reader said about Emi, until a reader has said something. */
export const A_REVIEW_NOBODY_HAS_WRITTEN = '[A REAL REVIEW, IN THE PERSON’S WORDS]';

/** Who said it, until somebody has. */
export const A_NAME_NOBODY_HAS_SIGNED = '[NAME OR INITIALS]';

/** The two, as data, for a test that reads the page for a hole it does not expect. */
export const thePlaceholders = [A_REVIEW_NOBODY_HAS_WRITTEN, A_NAME_NOBODY_HAS_SIGNED] as const;
