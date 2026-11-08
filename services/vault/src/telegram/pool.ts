import { base64Of, type RandomSource } from '@emi/crypto';

/**
 * The pool user a Telegram sign in needs, and the two shapes the pool may accept it in.
 *
 * The first shape is a user with no password, which is what Emi wants: the pool carries the email
 * one time code as a first factor, so a user needs no password to exist. The service documents
 * that a user with no password needs an email address or a telephone number, and a Telegram
 * account gives Emi neither, so the second shape is there for the day the pool refuses the first.
 *
 * The second shape sends a generated password and then makes it permanent, which the service says
 * leaves the user confirmed. Nothing can present that value: neither client lists a password flow,
 * account recovery is administrator only, and the value is written nowhere and returned to nobody.
 */

/** Bytes the random half of a generated password is drawn from. */
export const generatedPasswordBytes = 24;

/**
 * What a generated password ends with. The random half is base 64, which usually carries a letter
 * of each case and a digit and sometimes carries none of one, so these four characters make the
 * default policy of the pool hold whatever the random half turns out to be.
 */
export const passwordTail = 'aA1!';

/** A user name, and a password only on the second path. */
export interface PoolUser {
  readonly userName: string;
  /** Absent on the first path, which asks the pool for a user with no password at all. */
  readonly password?: string;
}

/**
 * What a create answers. A user name that is taken is the ordinary case of a woman signing in
 * again, and a pool that will not hold a user with no password says so as the third value.
 */
export type MadeThePoolUser = 'made' | 'already-there' | 'a-password-is-needed';

/** How she ended up in the pool, which says which of the two shapes the pool accepted. */
export type HowSheIsHeld = 'made' | 'already-there' | 'made-with-a-password';

/**
 * The two pool calls the sign in makes. It is a port, so the two paths below are both driven by a
 * test and neither waits for a live pool to refuse something.
 */
export interface UserPool {
  /** Makes the user, suppressing every message, and says whether the name was already taken. */
  createUser(user: PoolUser): Promise<MadeThePoolUser>;
  /** Sets a permanent password, which leaves the user confirmed rather than forced to change it. */
  setPermanentPassword(userName: string, password: string): Promise<void>;
}

/** A password made inside one invocation, which satisfies the default policy of the pool. */
export function aPasswordNothingCanPresent(random: RandomSource): string {
  return `${base64Of(random(generatedPasswordBytes))}${passwordTail}`;
}

/** The user for a name, made where the pool holds none, and found where it holds one already. */
export async function poolUserHeldOrMade(
  pool: UserPool,
  userName: string,
  random: RandomSource,
): Promise<HowSheIsHeld> {
  const withNoPassword = await pool.createUser({ userName });

  if (withNoPassword !== 'a-password-is-needed') {
    return withNoPassword === 'made' ? 'made' : 'already-there';
  }

  const password = aPasswordNothingCanPresent(random);
  const withOne = await pool.createUser({ userName, password });

  if (withOne === 'a-password-is-needed') {
    throw new Error('the pool refused a user with a password and a user without one');
  }

  if (withOne === 'already-there') {
    return 'already-there';
  }

  await pool.setPermanentPassword(userName, password);

  return 'made-with-a-password';
}
