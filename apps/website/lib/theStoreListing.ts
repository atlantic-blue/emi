import { THE_APP_STORE_LISTING } from './addresses';

/**
 * Whether Apple opened the listing for Emi, which is whether Apple has issued its address yet.
 *
 * It is false, so the site draws no press to the store: the two on the home page and the one in
 * the band at the foot are held back. A press to an address nobody has issued leads to the page
 * she is already reading, which tells her the software is unfinished at the moment she is deciding
 * whether to trust it with her cycle.
 *
 * Apple opens the pre-order on 17 November 2026. Paste the address into `THE_APP_STORE_LISTING`
 * on that day and the three presses come back.
 */
export const theStoreListingIsOpen: boolean = THE_APP_STORE_LISTING !== '';
