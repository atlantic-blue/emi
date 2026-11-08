import { accountIdFor, bytesFromBase64, instantAt } from '@emi/crypto';

/**
 * The one time answer, which is what a woman holds between the sign in function and the pool. The
 * function writes a digest of it. The pool hands the answer itself to the verify trigger, which
 * spends the item that digest names.
 */

/** Bytes. The sign in function takes this many from the random source of the platform. */
export const oneTimeAnswerBytes = 32;

/**
 * Seconds. An answer issued further from now than this is refused, in either direction. The time
 * to live of the item cleans up and never refuses, because the table removes an expired item some
 * time after it expires rather than at the instant.
 */
export const answerWindowSeconds = 120;

/**
 * The name the table holds an answer under: the helper that makes an account identifier, over the
 * bytes. So a reader of the table holds a digest and not a value anybody can present.
 */
export function answerDigestFor(answer: Uint8Array): string {
  return accountIdFor(answer);
}

/**
 * The same name, from the text a caller presented. Anything that is not base 64 of the right
 * length is null rather than thrown, because the caller chose the text and a refusal here has to
 * read like every other refusal.
 */
export function answerDigestIn(presented: string): string | null {
  try {
    const bytes = bytesFromBase64(presented);

    return bytes.length === oneTimeAnswerBytes ? answerDigestFor(bytes) : null;
  } catch {
    return null;
  }
}

/** Whether the answer was issued inside the window, read against the instant it carries. */
export function answerIsFresh(issuedAt: string, now: Date): boolean {
  const at = instantAt(issuedAt);

  if (at === null) {
    return false;
  }

  return Math.abs(now.getTime() - at) <= answerWindowSeconds * 1000;
}

/** What the sign in function writes down: the digest, who it is for, and when it was made. */
export interface OneTimeAnswer {
  readonly answerDigest: string;
  /** The user name of the pool, which is `tg_` and the digest of a Telegram subject. */
  readonly userName: string;
  readonly issuedAt: string;
}

/** What spending one gives back, which is the whole item minus the name it was read by. */
export type SpentAnswer = Omit<OneTimeAnswer, 'answerDigest'>;

/**
 * The two calls this sign in needs, as a port of its own. The function holds the write and the
 * three triggers hold the spend, so neither role carries the other's grant, and nothing here can
 * read an account.
 */
export interface OneTimeAnswerStore {
  writeAnswer(answer: OneTimeAnswer): Promise<void>;
  /**
   * The answer, gone, and its two fields read out of the removal. Nothing at all when no item
   * holds that digest, which is what a second answer meets.
   */
  spendAnswer(answerDigest: string): Promise<SpentAnswer | undefined>;
}
