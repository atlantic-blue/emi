import type { Language } from '@/app/words';

/**
 * Where a sign in leaves her, and how a page that sent her away gets her back.
 *
 * Her account is where a sign in lands when nothing says otherwise. A woman who opened the Buy Emi
 * page with no session was moved to the sign in page by that page, so leaving her on her account
 * afterwards leaves her two presses away from what she came to do. The page that moves her writes
 * down where she was going, and every way in reads it when it lands.
 *
 * The note is kept in `sessionStorage`, which is where a sign in keeps the value its press made and
 * for the same reason: it survives the trip to Apple, to Google and to Telegram in that tab, and it
 * does not survive the tab closing.
 *
 * What is kept is held against a list of two paths rather than read as an address. A note that
 * names a host, or a path this list does not hold, lands her on her account, so nothing written
 * into this entry can send her to another site. The two paths are written out here because a module
 * her browser runs cannot read a page of the server.
 */

/** Where a sign in lands when the browser kept no note, which is her account. */
export const WHERE_A_SIGN_IN_LANDS = 'account/';

/** The page she buys Emi on, which moves a reader with no session to the sign in page. */
export const WHERE_SHE_BUYS_EMI = 'checkout/';

/** Every page a sign in may come back to. A note naming anything else is dropped. */
export const WHERE_A_SIGN_IN_MAY_COME_BACK_TO = [
  WHERE_A_SIGN_IN_LANDS,
  WHERE_SHE_BUYS_EMI,
] as const;

/** One of those two pages, as a value the kept note is read into. */
export type APageASignInComesBackTo = (typeof WHERE_A_SIGN_IN_MAY_COME_BACK_TO)[number];

/** The one name the note is written under. */
export const WHERE_SHE_WAS_GOING_ENTRY = 'emi.coming-back-to';

/**
 * Where the note lives. Absent on a server, where there is nothing to hold it.
 *
 * It is read off the global rather than off `window`, which is the same object in a browser, so the
 * cases of this module run where a store can be stood in for.
 */
function theStore(): Storage | null {
  try {
    return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    // A browser told to keep nothing at all throws on the read rather than answering with nothing,
    // and a reader who turned storage off should land on her account rather than meet a crash.
    return null;
  }
}

/** Written by a page that moves her to sign in, so the sign in can give her that page back. */
export function comeBackToThisPage(page: APageASignInComesBackTo): void {
  theStore()?.setItem(WHERE_SHE_WAS_GOING_ENTRY, page);
}

function isAPageASignInComesBackTo(
  kept: string | null | undefined,
): kept is APageASignInComesBackTo {
  return WHERE_A_SIGN_IN_MAY_COME_BACK_TO.some((page) => page === kept);
}

/**
 * The address a sign in leaves her on, which is the page she was going to or her account.
 *
 * The note goes as it is read. A note is good for one sign in, so a woman who signs in again a
 * week later lands on her account rather than on a page she asked for once.
 */
export function whereASignInLands(language: Language): string {
  const kept = theStore()?.getItem(WHERE_SHE_WAS_GOING_ENTRY);

  theStore()?.removeItem(WHERE_SHE_WAS_GOING_ENTRY);

  return `/${language}/${isAPageASignInComesBackTo(kept) ? kept : WHERE_A_SIGN_IN_LANDS}`;
}
