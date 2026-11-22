import {
  theBlackFridayCoupon,
  theBlackFridayOffer,
  theBlackFridayOfferEnds,
  theCouponFor,
} from '../../../services/vault/src/payments/stripe';
import {
  THE_BLACK_FRIDAY_OFFER,
  THE_BLACK_FRIDAY_OFFER_ENDS,
  theBlackFridayOfferIsOpen,
} from '../lib/theBlackFridayOffer';
import {
  THE_OFFER_IN_AN_ADDRESS,
  isAnOffer,
  theOfferAPageShows,
  theOfferAnAddressNames,
} from '../lib/theOfferSheArrivedWith';

/**
 * The offer the site sells and the offer the money sells are one offer.
 *
 * The page and the payments function each hold the value and the end for themselves, because the
 * page is bundled into a browser and the function runs in a Lambda, and neither reads the other at
 * run time. So they are read against each other here instead: two instants that drift apart would
 * draw a halved amount on a page the service then charges in full.
 */

const aMinuteBeforeTheEnd = new Date('2026-11-30T22:59:00.000Z');
const theEndItself = new Date('2026-11-30T23:00:00.000Z');
const aMinuteAfterTheEnd = new Date('2026-11-30T23:01:00.000Z');

describe('the offer the page sells and the offer the money sells', () => {
  it('is the same value on both sides, so the body the page sends is the one the route takes', () => {
    expect(THE_BLACK_FRIDAY_OFFER).toBe('black-friday');
    expect(theBlackFridayOffer).toBe(THE_BLACK_FRIDAY_OFFER);
  });

  it('closes at the same instant on both sides, which is the first of December in Berlin', () => {
    expect(THE_BLACK_FRIDAY_OFFER_ENDS.toISOString()).toBe('2026-11-30T23:00:00.000Z');
    expect(theBlackFridayOfferEnds.getTime()).toBe(THE_BLACK_FRIDAY_OFFER_ENDS.getTime());
  });

  it.each([
    ['shows the offer and the coupon', aMinuteBeforeTheEnd, true, theBlackFridayCoupon],
    ['shows neither at the end itself', theEndItself, false, null],
    ['shows neither a minute later', aMinuteAfterTheEnd, false, null],
  ])('%s', (_said, now, open, coupon) => {
    expect(theBlackFridayOfferIsOpen(now)).toBe(open);
    expect(theCouponFor(theBlackFridayOffer, now)).toBe(coupon);
  });
});

describe('the offer an address names', () => {
  it('reads the one offer this site sells', () => {
    expect(theOfferAnAddressNames('?offer=black-friday')).toBe(THE_BLACK_FRIDAY_OFFER);
    expect(theOfferAnAddressNames('offer=black-friday')).toBe(THE_BLACK_FRIDAY_OFFER);
    expect(theOfferAnAddressNames('?lang=en&offer=black-friday')).toBe(THE_BLACK_FRIDAY_OFFER);
  });

  /**
   * Anything else is dropped rather than drawn. An address is a thing anybody may type, so a
   * value nobody approved has to leave the page asking the one price.
   */
  it.each([
    ['', 'an address with nothing in it'],
    ['?offer=', 'an offer with no value'],
    ['?offer=half-off-for-ever', 'an offer nobody made'],
    ['?offer=BLACK-FRIDAY', 'the offer in capitals'],
    ['?offer=black-friday-2025', 'the offer of last year'],
    ['?offer= black-friday', 'the offer with a space in front of it'],
    ['?offers=black-friday', 'a name this page does not read'],
    ['?price=19.50', 'an amount of her own'],
  ])('drops %s, which is %s', (search) => {
    expect(theOfferAnAddressNames(search)).toBeNull();
  });

  it('names the one thing the landing page writes into the address', () => {
    expect(THE_OFFER_IN_AN_ADDRESS).toBe('offer');
    expect(theOfferAnAddressNames(`?${THE_OFFER_IN_AN_ADDRESS}=${THE_BLACK_FRIDAY_OFFER}`)).toBe(
      THE_BLACK_FRIDAY_OFFER,
    );
  });

  it('reads a value as an offer or refuses it, and reads nothing at all as none', () => {
    expect(isAnOffer(THE_BLACK_FRIDAY_OFFER)).toBe(true);
    expect(isAnOffer('half-off')).toBe(false);
    expect(isAnOffer(null)).toBe(false);
    expect(isAnOffer(undefined)).toBe(false);
  });
});

describe('the offer a page shows', () => {
  it('shows the offer she arrived with while the offer is open', () => {
    expect(theOfferAPageShows('?offer=black-friday', aMinuteBeforeTheEnd)).toBe(
      THE_BLACK_FRIDAY_OFFER,
    );
  });

  it('shows nothing once the offer has closed, however the address reads', () => {
    expect(theOfferAPageShows('?offer=black-friday', theEndItself)).toBeNull();
    expect(theOfferAPageShows('?offer=black-friday', aMinuteAfterTheEnd)).toBeNull();
  });

  it('shows nothing to a woman who arrived with no offer, while the offer is open', () => {
    expect(theOfferAPageShows('', aMinuteBeforeTheEnd)).toBeNull();
    expect(theOfferAPageShows('?offer=half-off', aMinuteBeforeTheEnd)).toBeNull();
  });
});
