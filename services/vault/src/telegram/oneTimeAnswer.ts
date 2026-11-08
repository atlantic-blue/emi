import { base64Of, type RandomSource } from '@emi/crypto';

import { answerDigestFor, type OneTimeAnswer, oneTimeAnswerBytes } from '../store/answers';

/**
 * The answer the sign in draws, and the record it writes down for it.
 *
 * The value itself exists in the answer of the function and in the call that spends it. The table
 * holds its digest, so a reader who holds the table holds nothing that answers a challenge. The
 * digest is taken over the bytes, which is where the trigger that spends it takes one too.
 */

/** The answer as a caller carries it, beside the record the table holds for it. */
export interface AnAnswerAndItsRecord {
  /** Base 64 of the bytes, which is the one form the answer ever travels in. */
  readonly answer: string;
  readonly written: OneTimeAnswer;
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

  return {
    answer: base64Of(bytes),
    written: {
      answerDigest: answerDigestFor(bytes),
      userName,
      issuedAt: issuedAt.toISOString(),
    },
  };
}
