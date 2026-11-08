import { createHmac } from 'node:crypto';

import { accountIdBytes, crockfordBase32 } from '@emi/crypto';

import { saltBytes } from './parameters';

/**
 * The name the pool holds a woman who signs in with Telegram under.
 *
 * It is a keyed hash of the Telegram subject, so a reader who holds the pool, and who knows which
 * Telegram account to test for, learns nothing without the salt. The subject itself is written
 * nowhere.
 */

/** What every pool user name of this way in opens with, so one read tells them apart. */
export const telegramUserNamePrefix = 'tg_';

/**
 * The pool user name for a subject. Three characters and 26 more, which is well inside the 128 a
 * pool allows.
 */
export function poolUserNameFor(subject: string, salt: Uint8Array): string {
  if (salt.length !== saltBytes) {
    throw new Error(`a salt is ${saltBytes} bytes and this one is ${salt.length}`);
  }

  const keyed = createHmac('sha256', salt).update(subject, 'utf8').digest();

  return `${telegramUserNamePrefix}${crockfordBase32(keyed.subarray(0, accountIdBytes))}`;
}
