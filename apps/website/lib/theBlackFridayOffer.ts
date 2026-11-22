/** The Black Friday offer: half of the yearly price, every year, for a subscription started before the end. */
export const THE_BLACK_FRIDAY_OFFER = 'black-friday';

export const THE_BLACK_FRIDAY_OFFER_ENDS = new Date('2026-11-30T23:00:00Z');

export function theBlackFridayOfferIsOpen(now: Date): boolean {
  return now.getTime() < THE_BLACK_FRIDAY_OFFER_ENDS.getTime();
}
