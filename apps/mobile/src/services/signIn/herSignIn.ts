import type { SecureStore } from '../vault/keychain';

/** The keychain item that holds her refresh token and what the account screen reads beside it. */
export const identityRefreshItem = 'emi.identityRefresh.v1';

/** Every keychain item this directory keeps, so the delete can reach each one. */
export const signInKeychainItems: readonly string[] = [identityRefreshItem];

/** The ways into the account the application offers. The email code is the only one built. */
export type TheWaySheSignedIn = 'email';

/** What the account screen and the Settings row read. The token is never part of it. */
export interface HerSignIn {
  readonly way: TheWaySheSignedIn;
  readonly address: string;
  /** The day she signed in on this phone, as her own calendar reads it. */
  readonly since: string;
}

/** What the keychain item holds. */
export interface TheSignInSheKeeps extends HerSignIn {
  readonly refreshToken: string;
}

const A_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isTheSignInSheKeeps(held: unknown): held is TheSignInSheKeeps {
  if (typeof held !== 'object' || held === null) {
    return false;
  }

  const fields = held as Readonly<Record<string, unknown>>;

  return (
    fields.way === 'email' &&
    typeof fields.address === 'string' &&
    fields.address !== '' &&
    typeof fields.since === 'string' &&
    A_DAY.test(fields.since) &&
    typeof fields.refreshToken === 'string' &&
    fields.refreshToken !== ''
  );
}

export async function keepHerSignIn(keychain: SecureStore, kept: TheSignInSheKeeps): Promise<void> {
  await keychain.write(
    identityRefreshItem,
    JSON.stringify({
      way: kept.way,
      address: kept.address,
      since: kept.since,
      refreshToken: kept.refreshToken,
    }),
  );
}

/**
 * Her sign in as this phone holds it, or null where it holds none. An item this version cannot
 * read is read as no sign in, so the screens offer the way in again rather than stopping.
 */
export async function readHerSignIn(keychain: SecureStore): Promise<HerSignIn | null> {
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

  if (!isTheSignInSheKeeps(parsed)) {
    return null;
  }

  return { way: parsed.way, address: parsed.address, since: parsed.since };
}
