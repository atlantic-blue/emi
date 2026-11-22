import { THE_BLACK_FRIDAY_OFFER, theBlackFridayOfferIsOpen } from '@/lib/theBlackFridayOffer';

/**
 * The offer a woman arrives with, read off the address of the page she opened.
 *
 * The landing page sends her to the Buy Emi page with the offer in the address, so the address is
 * the whole of what carries it. Nothing of hers is read: a reader who types the address herself
 * gets the same price as a reader who pressed the landing page, which is the only honest way to
 * run an offer anybody can read the address of.
 *
 * One value is kept and every other value is dropped, so `?offer=half-off-for-ever` draws the
 * normal plan rather than a plan nobody approved. The plan she reads and the body the press sends
 * are both decided through this one file, so the page cannot say one price and buy another.
 *
 * It is read in her browser rather than on a server. A server of this site answers one cached page
 * for every reader of a language, so an offer decided there would be served to whoever asked
 * second. The whole column of the Buy Emi page is drawn in her browser already, because the sign
 * in gate holds it back until the browser has read her session, so nothing is lost by it.
 */

/** The name the offer travels under in an address, which the landing page writes. */
export const THE_OFFER_IN_AN_ADDRESS = 'offer';

/** The offers this site sells, as a value, so a page matches a value rather than words. */
export type AnOffer = typeof THE_BLACK_FRIDAY_OFFER;

/** Whether a kept or arrived value is an offer at all. Everything else is dropped. */
export function isAnOffer(said: string | null | undefined): said is AnOffer {
  return said === THE_BLACK_FRIDAY_OFFER;
}

/**
 * The offer an address names, or nothing at all. The end is not read here: an address written
 * before the end and opened after it still names the offer, and the page is what decides whether
 * it shows one.
 */
export function theOfferAnAddressNames(search: string): AnOffer | null {
  const said = new URLSearchParams(search).get(THE_OFFER_IN_AN_ADDRESS);

  return isAnOffer(said) ? said : null;
}

/** The offer a page shows her, which is the offer she arrived with while it is still open. */
export function theOfferAPageShows(search: string, now: Date): AnOffer | null {
  const said = theOfferAnAddressNames(search);

  return said !== null && theBlackFridayOfferIsOpen(now) ? said : null;
}

/** The address she is on, or nothing on a server, which is drawing the page for nobody. */
export function whatHerAddressSays(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

/** The offer the page she is reading shows, read off her own browser and the clock. */
export function theOfferOnThePage(now: Date = new Date()): AnOffer | null {
  return theOfferAPageShows(whatHerAddressSays(), now);
}
