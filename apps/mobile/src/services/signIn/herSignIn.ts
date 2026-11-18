import type { SecureStore } from '../vault/keychain';

/** The keychain item that holds her refresh token and what the account screen reads beside it. */
export const identityRefreshItem = 'emi.identityRefresh.v1';

/** Every keychain item this directory keeps, so the delete can reach each one. */
export const signInKeychainItems: readonly string[] = [identityRefreshItem];

/** The ways into the account the application offers. Apple and Google are not built yet. */
export type TheWaySheSignedIn = 'email' | 'telegram';

/**
 * What the account screen and the Settings row read. The token is never part of it. Telegram hands
 * Emi no email address, so a Telegram sign in holds none.
 */
export type HerSignIn =
  | {
      readonly way: 'email';
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
    (fields.way === 'email' && typeof fields.address === 'string' && fields.address !== '');

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
      kept.way === 'email'
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

  return parsed.way === 'email'
    ? { way: parsed.way, address: parsed.address, since: parsed.since }
    : { way: parsed.way, since: parsed.since };
}
