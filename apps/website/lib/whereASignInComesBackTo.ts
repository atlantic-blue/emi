import type { Language } from '@/app/words';

import { type AnOffer, THE_OFFER_IN_AN_ADDRESS, isAnOffer } from '@/lib/theOfferSheArrivedWith';

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
 *
 * The offer she arrived with is kept beside the page, under a name of its own, and it is held to
 * the one offer this site sells the same way. A woman who opened the Buy Emi page on the Black
 * Friday address and had to sign in comes back to the same price she was reading, and nothing
 * written into either entry can make the page name a price nobody approved.
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

/** The name the offer she arrived with is kept under, beside the page she was going to. */
export const WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY = 'emi.coming-back-with';

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

/**
 * Written by a page that moves her to sign in, so the sign in can give her that page back, with
 * the offer she arrived with where she arrived with one.
 *
 * The offer entry is written on every call, and removed where there is none, so an offer kept for
 * an earlier trip through the sign in is never added to a later one.
 */
export function comeBackToThisPage(
  page: APageASignInComesBackTo,
  withTheOffer?: string | null,
): void {
  theStore()?.setItem(WHERE_SHE_WAS_GOING_ENTRY, page);

  if (isAnOffer(withTheOffer)) {
    theStore()?.setItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY, withTheOffer);
  } else {
    theStore()?.removeItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY);
  }
}

function isAPageASignInComesBackTo(
  kept: string | null | undefined,
): kept is APageASignInComesBackTo {
  return WHERE_A_SIGN_IN_MAY_COME_BACK_TO.some((page) => page === kept);
}

/** The offer, written back into the address the way the page she is going to reads it. */
function theOfferIn(kept: APageASignInComesBackTo, offer: AnOffer | null): string {
  return kept === WHERE_SHE_BUYS_EMI && offer !== null
    ? `?${THE_OFFER_IN_AN_ADDRESS}=${offer}`
    : '';
}

/**
 * The address a sign in leaves her on, which is the page she was going to or her account.
 *
 * Both notes go as they are read. A note is good for one sign in, so a woman who signs in again a
 * week later lands on her account rather than on a page she asked for once, and at the one price
 * rather than at an offer she read in another month.
 *
 * The offer rides only to the page that sells one. Nowhere else reads it, and an offer in the
 * address of her account would be a value in an address that means nothing.
 */
export function whereASignInLands(language: Language): string {
  const kept = theStore()?.getItem(WHERE_SHE_WAS_GOING_ENTRY);
  const said = theStore()?.getItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY);

  theStore()?.removeItem(WHERE_SHE_WAS_GOING_ENTRY);
  theStore()?.removeItem(WHICH_OFFER_SHE_ARRIVED_WITH_ENTRY);

  if (!isAPageASignInComesBackTo(kept)) {
    return `/${language}/${WHERE_A_SIGN_IN_LANDS}`;
  }

  return `/${language}/${kept}${theOfferIn(kept, isAnOffer(said) ? said : null)}`;
}
