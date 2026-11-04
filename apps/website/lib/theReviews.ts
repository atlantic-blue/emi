import type { Review } from '@/components/reviewRow';

/**
 * What people have said about Emi, in their own words, with their permission to print it.
 *
 * The list is empty, and the page reads its length: the band of reviews is not drawn at all while
 * nobody has said anything. The approved board drew six cards of holes, which is what a reader of
 * myemi.app met until now, and a card in brackets is a promise the product cannot keep. Adding one
 * entry below brings the band back, and nothing else has to change for it to.
 *
 * A quote and a name are the person's own, so neither is a word of `app/words`: a catalogue is
 * translated into three languages and a review is not. Where she said it is a word, because the
 * three places are Emi's own and each language names them.
 */

/** The three places a review comes from, each a word of the catalogues in every language. */
export type WhereSheSaidIt = 'store' | 'community' | 'beta';

export interface ARealReview {
  /** Her own sentences, in the language she wrote them in. */
  readonly quote: string;
  /** The name or the initials she agreed to be called by. */
  readonly name: string;
  readonly said: WhereSheSaidIt;
}

/**
 * Every review the product may print. Nobody has written one yet, so the page draws no band.
 *
 * An entry here is a person who said something and agreed to it being printed. A sentence nobody
 * said, or a sentence said without that permission, does not belong in this file.
 */
export const theRealReviews: readonly ARealReview[] = [];

/**
 * The cards of the band, from the reviews and the words of the reader's own language. Held here
 * beside the list rather than in the page, so a case can read the mapping without drawing a page.
 */
export function theCardsOf(
  reviews: readonly ARealReview[],
  saidAt: Readonly<Record<WhereSheSaidIt, string>>,
): Review[] {
  return reviews.map((review) => ({
    quote: review.quote,
    name: review.name,
    source: saidAt[review.said],
  }));
}
