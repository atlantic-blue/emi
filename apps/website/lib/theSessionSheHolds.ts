import type { TheTokensSheHolds } from './theSignIn';

/**
 * Where the tokens of a signed in woman are kept while she reads the site.
 *
 * `sessionStorage` and nowhere else. No cookie, because a cookie travels with every request to
 * every path of this host, and the site would then carry her tokens to a page that has no use for
 * them. No `localStorage`, because that outlives the window: a woman who signs in on a borrowed
 * machine and closes the tab has signed out, and anything that survived the tab would mean she
 * has not.
 *
 * It is one entry, so a sign out removes one thing and cannot leave half of her behind.
 */

/** The one name the site writes under, which the sign out removes. */
export const THE_SESSION_ENTRY = 'emi.session';

/** Where the entry is kept. Absent on a server, where there is no window to hold it. */
function theStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // A browser told to keep no storage at all throws on the read rather than answering with
    // nothing, and a reader who turned storage off should read a sign in page rather than a crash.
    return null;
  }
}

export function holdTheSession(tokens: TheTokensSheHolds): void {
  theStore()?.setItem(THE_SESSION_ENTRY, JSON.stringify(tokens));
}

/** The tokens she is holding, or nothing at all where the entry is absent or unreadable. */
export function theSessionHeld(): TheTokensSheHolds | null {
  const written = theStore()?.getItem(THE_SESSION_ENTRY);

  if (written === null || written === undefined) {
    return null;
  }

  try {
    const read = JSON.parse(written) as Partial<TheTokensSheHolds>;

    return typeof read.idToken === 'string' &&
      typeof read.accessToken === 'string' &&
      typeof read.refreshToken === 'string'
      ? { idToken: read.idToken, accessToken: read.accessToken, refreshToken: read.refreshToken }
      : null;
  } catch {
    return null;
  }
}

export function letTheSessionGo(): void {
  theStore()?.removeItem(THE_SESSION_ENTRY);
}
