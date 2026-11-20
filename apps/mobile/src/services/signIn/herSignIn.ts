import type { SecureStore } from '../vault/keychain';

/** The keychain item that holds her refresh token and what the account screen reads beside it. */
export const identityRefreshItem = 'emi.identityRefresh.v1';

/** Every keychain item this directory keeps, so the delete can reach each one. */
export const signInKeychainItems: readonly string[] = [identityRefreshItem];

/** The ways into the account the application offers. */
export type TheWaySheSignedIn = 'email' | 'apple' | 'google' | 'telegram';

/** The ways in that carry her email address: the one she typed, or the one Apple or Google gave. */
export type AWayWithAnAddress = Exclude<TheWaySheSignedIn, 'telegram'>;

const theWaysWithAnAddress: readonly unknown[] = ['email', 'apple', 'google'];

/**
 * What the account screen and the Settings row read. The token is never part of it. Telegram hands
 * Emi no email address, so a Telegram sign in holds none.
 */
export type HerSignIn =
  | {
      readonly way: AWayWithAnAddress;
      readonly address: string;
      /** The day she signed in on this phone, as her own calendar reads it. */
      readonly since: string;
    }
  | { readonly way: 'telegram'; readonly since: string };

/** What the keychain item holds. */
export type TheSignInSheKeeps = HerSignIn & { readonly refreshToken: string };

const A_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isTheSignInSheKeeps(held: unknown): held is TheSignInSheKeeps {
  if (typeof held !== 'object' || held === null) {
    return false;
  }

  const fields = held as Readonly<Record<string, unknown>>;
  const isTheWayReadable =
    fields.way === 'telegram' ||
    (theWaysWithAnAddress.includes(fields.way) &&
      typeof fields.address === 'string' &&
      fields.address !== '');

  return (
    isTheWayReadable &&
    typeof fields.since === 'string' &&
    A_DAY.test(fields.since) &&
    typeof fields.refreshToken === 'string' &&
    fields.refreshToken !== ''
  );
}

export async function keepHerSignIn(keychain: SecureStore, kept: TheSignInSheKeeps): Promise<void> {
  await keychain.write(
    identityRefreshItem,
    JSON.stringify(
      kept.way !== 'telegram'
        ? {
            way: kept.way,
            address: kept.address,
            since: kept.since,
            refreshToken: kept.refreshToken,
          }
        : { way: kept.way, since: kept.since, refreshToken: kept.refreshToken },
    ),
  );
}

/**
 * Her sign in as this phone holds it, token and all, or null where it holds none. The token is
 * read by the one call that spends it and reaches no screen.
 */
export async function readTheSignInSheKeeps(
  keychain: SecureStore,
): Promise<TheSignInSheKeeps | null> {
  const held = await keychain.read(identityRefreshItem);

  if (held === null) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(held);
  } catch {
    return null;
  }

  return isTheSignInSheKeeps(parsed) ? parsed : null;
}

/**
 * Her sign in as this phone holds it, or null where it holds none. An item this version cannot
 * read is read as no sign in, so the screens offer the way in again rather than stopping.
 */
export async function readHerSignIn(keychain: SecureStore): Promise<HerSignIn | null> {
  const kept = await readTheSignInSheKeeps(keychain);

  if (kept === null) {
    return null;
  }

  return kept.way !== 'telegram'
    ? { way: kept.way, address: kept.address, since: kept.since }
    : { way: kept.way, since: kept.since };
}

/**
 * The sign in, gone from this phone. The row in Settings and the account screen read the item, so
 * removing it is what puts the way in back in front of her.
 *
 * The items are the ones this directory declares to the delete rather than a list written again
 * here, so an item it keeps later goes with the sign in instead of outliving it.
 */
export async function forgetHerSignIn(keychain: SecureStore): Promise<void> {
  for (const item of signInKeychainItems) {
    await keychain.remove(item);
  }
}
