import { createHash } from 'node:crypto';

import { accountIdBytes, base64Of, crockfordBase32, type RandomSource } from '@emi/crypto';

/**
 * The one time answer, which is the whole of what the caller is given to finish the sign in with.
 *
 * The value exists in the answer of this function and in the call that spends it. What is written
 * down is its digest, so a reader who holds the table holds nothing that answers a challenge.
 *
 * The digest is taken over the text the caller sends back, because that text is the only form the
 * trigger that spends it ever receives.
 */

/** Bytes of answer. Thirty two bytes is 256 bits, drawn from the random source of the platform. */
export const oneTimeAnswerBytes = 32;

/** Seconds. An answer older than this is refused by the trigger that reads it. */
export const oneTimeAnswerLivesForSeconds = 120;

/** What is written down for one answer: the digest, who it belongs to, and two instants. */
export interface WrittenOneTimeAnswer {
  readonly digest: string;
  /** The pool user name the answer belongs to, and no other value that names her. */
  readonly userName: string;
  readonly issuedAt: string;
  /** Seconds, which is the instant it was issued at plus its life. It cleans up and never refuses. */
  readonly expiresAt: number;
}

/**
 * The one thing the sign in asks of storage. It is a port of its own rather than a method on a
 * store the handlers already hold, so nothing that answers a signed request can write an answer.
 */
export interface OneTimeAnswerWriter {
  writeOneTimeAnswer(written: WrittenOneTimeAnswer): Promise<void>;
}

/** The answer and what is written down for it, as one pair, so the two cannot be made apart. */
export interface AnAnswerAndItsRecord {
  readonly answer: string;
  readonly written: WrittenOneTimeAnswer;
}

/** The digest of an answer: 26 characters, made the way an account identifier is made. */
export function digestOfOneTimeAnswer(answer: string): string {
  const digest = createHash('sha256').update(answer, 'utf8').digest();

  return crockfordBase32(digest.subarray(0, accountIdBytes));
}

/** A fresh answer for one pool user, with the record that lets exactly one call spend it. */
export function oneTimeAnswerFor(
  userName: string,
  issuedAt: Date,
  random: RandomSource,
): AnAnswerAndItsRecord {
  const bytes = random(oneTimeAnswerBytes);

  if (bytes.length !== oneTimeAnswerBytes) {
    throw new Error(
      `the random source gave ${bytes.length} bytes and an answer is ${oneTimeAnswerBytes}`,
    );
  }

  const answer = base64Of(bytes);

  return {
    answer,
    written: {
      digest: digestOfOneTimeAnswer(answer),
      userName,
      issuedAt: issuedAt.toISOString(),
      expiresAt: Math.floor(issuedAt.getTime() / 1000) + oneTimeAnswerLivesForSeconds,
    },
  };
}
