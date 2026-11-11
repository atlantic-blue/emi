import type { TheTokensSheHolds } from './theSignIn';

/**
 * Where the tokens of a signed in woman are kept while she reads the site.
 *
 * `localStorage`, so every tab of this host reads the one session and a woman who closes the tab
 * and opens the site again is still signed in. No cookie, because a cookie travels with every
 * request to every path of this host, and the site would then carry her tokens to a page that has
 * no use for them.
 *
 * It is one entry, so a sign out removes one thing and cannot leave half of her behind.
 */

/** The one name the site writes under, which the sign out removes. */
export const THE_SESSION_ENTRY = 'emi.session';

/** Where the entry is kept. Absent on a server, where there is no window to hold it. */
function theStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // A browser told to keep no storage at all throws on the read rather than answering with
    // nothing, and a reader who turned storage off should read a sign in page rather than a crash.
    return null;
  }
}

/** Where the site used to keep it, which a woman who signed in before this change still holds. */
function theStoreOfOneTab(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * The entry out of the store the site used to write, moved to the one it writes now.
 *
 * A woman who signed in before this change holds her tokens where one tab could read them. The
 * move happens on the first read, so she stays signed in and the old place is empty afterwards.
 */
function moveWhatTheOlderSiteLeft(): void {
  const oneTab = theStoreOfOneTab();
  const left = oneTab?.getItem(THE_SESSION_ENTRY);

  if (left === null || left === undefined) {
    return;
  }

  theStore()?.setItem(THE_SESSION_ENTRY, left);
  oneTab?.removeItem(THE_SESSION_ENTRY);
}

/**
 * What to run when the session changes, which is a sign in or a sign out made in another tab.
 * Nothing in this tab changes the entry without leaving the page.
 *
 * A browser told to empty its storage reports one change naming nothing at all, and that emptying
 * takes the session with it, so a change with no name counts as a change to this entry.
 */
export function whenTheSessionChanges(tell: () => void): () => void {
  function whenAStoreChanged(said: StorageEvent): void {
    if (said.key === null || said.key === THE_SESSION_ENTRY) {
      tell();
    }
  }

  window.addEventListener('storage', whenAStoreChanged);

  return () => {
    window.removeEventListener('storage', whenAStoreChanged);
  };
}

export function holdTheSession(tokens: TheTokensSheHolds): void {
  theStore()?.setItem(THE_SESSION_ENTRY, JSON.stringify(tokens));
}

/** The tokens she is holding, or nothing at all where the entry is absent or unreadable. */
export function theSessionHeld(): TheTokensSheHolds | null {
  moveWhatTheOlderSiteLeft();

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
