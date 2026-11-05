/**
 * The three answers of the privacy policy that nobody has written yet: who takes a payment on the
 * web, how long an account is kept, and the ground in law that lets Emi keep it.
 *
 * They are not words of the product, so they are not in `app/words`. A word there is translated
 * into three languages and a test refuses one that reads the same in two of them, and a hole reads
 * the same in every language until the text that fills it arrives.
 *
 * A policy that named a card processor nobody has chosen, or a retention nobody has set, would be
 * the first sentence on that page that is not true, and a reader cannot tell a wrong answer from a
 * missing one. In brackets and in capitals, she can.
 *
 * The home page held two more of these, for a review nobody had written and the name she signs it
 * with. A hole is honest on a page that is being written and dishonest on a page a stranger reads,
 * and six of them stood in the band of reviews on the live site. That band is drawn from
 * `lib/theReviews.ts` now and the list is empty, so the band is not drawn at all and the two holes
 * are gone with it.
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
