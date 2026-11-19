import type { SiteWords } from '@/app/words';

/**
 * Which way she signed in, read off the pool user name her identity token carries.
 *
 * The pool names a user after the way that made it: Apple, Google and Telegram each carry a prefix
 * of their own, and a user made from a code sent to her address carries an identifier that names
 * nothing. So the line the page draws is read from the token she already holds, and the page asks
 * the service nothing to draw it.
 *
 * Nothing here leaves the browser. The name is read, the way is named, and the token stays where
 * it was.
 */

/**
 * The names the service fixes for the two providers, which `infra/cognito.tf` creates them under.
 * The prefixes below are built from them because the service writes the name of the provider and
 * then an underscore, so a name read here and a provider made there cannot drift apart.
 */
export const THE_PROVIDER_OF_APPLE = 'SignInWithApple';
export const THE_PROVIDER_OF_GOOGLE = 'Google';

/** The three prefixes the service writes, which `docs/design/payments.md` section 1 names. */
export const THE_PREFIX_OF_APPLE = `${THE_PROVIDER_OF_APPLE}_`;
export const THE_PREFIX_OF_GOOGLE = `${THE_PROVIDER_OF_GOOGLE}_`;
export const THE_PREFIX_OF_TELEGRAM = 'tg_';

/** The claim the pool user name travels in, which is the claim the payment route reads as well. */
export const THE_USER_NAME_CLAIM = 'cognito:username';

/** The ways in she can have come from, as values rather than as words. */
export type TheWaySheSignedIn = 'apple' | 'google' | 'telegram' | 'herAddress';

/**
 * The names of three companies, which are the same in every language the site serves. They sit
 * beside the page that draws them rather than in a catalogue, where somebody would translate them.
 */
const theNameOfTheWay: Readonly<Record<TheWaySheSignedIn, string | null>> = {
  apple: 'Apple',
  google: 'Google',
  telegram: 'Telegram',
  herAddress: null,
};

function theClaimsIn(idToken: string): Readonly<Record<string, unknown>> | null {
  const payload = idToken.split('.')[1];

  if (payload === undefined) {
    return null;
  }

  try {
    const held = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const read = JSON.parse(held) as unknown;

    return typeof read === 'object' && read !== null
      ? (read as Readonly<Record<string, unknown>>)
      : null;
  } catch {
    return null;
  }
}

/** The way her token says she signed in, or nothing at all where it says nothing readable. */
export function theWayHerTokenNames(idToken: string): TheWaySheSignedIn | null {
  const name = theClaimsIn(idToken)?.[THE_USER_NAME_CLAIM];

  if (typeof name !== 'string' || name.length === 0) {
    return null;
  }

  if (name.startsWith(THE_PREFIX_OF_APPLE)) {
    return 'apple';
  }

  if (name.startsWith(THE_PREFIX_OF_GOOGLE)) {
    return 'google';
  }

  return name.startsWith(THE_PREFIX_OF_TELEGRAM) ? 'telegram' : 'herAddress';
}

/** What the page calls that way, which is a company for three of them and her address for one. */
export function whatThatWayIsCalled(way: TheWaySheSignedIn, words: SiteWords): string {
  return theNameOfTheWay[way] ?? words.checkoutWayAddress;
}
