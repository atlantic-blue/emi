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

/**
 * The three answers of the privacy policy that nobody has written yet: who takes a payment on the
 * web, how long an account is kept, and the ground in law that lets Emi keep it.
 *
 * They are holes for the reason the three above are. A policy that named a card processor nobody
 * has chosen, or a retention nobody has set, would be the first sentence on that page that is not
 * true, and a reader cannot tell a wrong answer from a missing one. In brackets and in capitals,
 * she can.
 */

/** Who takes the payment when she pays on the web, until the operator has chosen one. */
export const A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN = '[CARD PROCESSOR]';

/** How long an account and a crash report are kept, until somebody sets a number. */
export const A_RETENTION_NOBODY_HAS_SET = '[RETENTION]';

/** The ground in law for each kind of data, until a lawyer has read it. */
export const A_LEGAL_BASIS_NOBODY_HAS_WRITTEN = '[LEGAL BASIS]';

/** The three, as data, for the page that draws them and for a test that counts them. */
export const theHolesOfThePolicy = [
  A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN,
  A_RETENTION_NOBODY_HAS_SET,
  A_LEGAL_BASIS_NOBODY_HAS_WRITTEN,
] as const;

/** The three, as data, for a test that reads the page for a hole it does not expect. */
export const thePlaceholders = [
  A_REVIEW_NOBODY_HAS_WRITTEN,
  A_NAME_NOBODY_HAS_SIGNED,
  THE_NOTE_IULIIA_HAS_NOT_WRITTEN,
] as const;
