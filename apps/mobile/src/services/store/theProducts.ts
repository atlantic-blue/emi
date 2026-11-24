/**
 * Contract PAY-1. One subscription group in the App Store holds three auto renewing products at
 * one level, and this module is the one place in the application that names a price.
 *
 * Nothing here is read at the moment she pays. The App Store quotes its own figure in her own
 * currency when she presses, so every value below is a record of what App Store Connect holds. A
 * test is the only thing that can hold the two together, because a pipeline cannot sign in to the
 * console and read them back.
 */

/** The group that holds every plan. The App Store gives her one product of a group at a time. */
export const theSubscriptionGroup = 'Emi';

/**
 * The level every product sits at. Equal levels make a move between two products a crossgrade,
 * which the App Store applies on her next renewal date. A product at a level of its own would make
 * the move an upgrade instead, which refunds part of the period she paid for and takes the new
 * price the same second.
 */
export const theOneLevel = 1;

/** How long one period of a product runs. */
export type HowLongAProductRuns = 'one year' | 'one month';

/** One product, as App Store Connect holds it. */
export interface AProductInTheStore {
  /** The identifier, which is unique across every application on the App Store. */
  readonly identifier: string;
  readonly runsFor: HowLongAProductRuns;
  /**
   * The price in euro cents. The value added tax sits inside it, because Apple quotes a price with
   * the tax inside it everywhere but the United States and Canada.
   */
  readonly priceInEuroCents: number;
  /** App Store Connect sets a level for each product, so one level for all three is a rule. */
  readonly level: number;
  /**
   * Whether the product opens with one free month, as an introductory offer. A subscription group
   * gives one introductory offer to one woman, so one product of the three may carry it and the
   * other two may not.
   */
  readonly freeMonth: boolean;
}

/** The yearly plan. myemi.app sells the same plan through Stripe. */
export const theYearlyPlan: AProductInTheStore = {
  identifier: 'blue.atlantic.emi.yearly',
  runsFor: 'one year',
  priceInEuroCents: 3900,
  level: theOneLevel,
  freeMonth: true,
};

/** The monthly plan, which the application sells and the website does not. */
export const theMonthlyPlan: AProductInTheStore = {
  identifier: 'blue.atlantic.emi.monthly',
  runsFor: 'one month',
  priceInEuroCents: 500,
  level: theOneLevel,
  freeMonth: false,
};

/**
 * The Black Friday product. A lower price on every renewal, for ever, is a product and not an
 * offer: each Apple offer discounts a bounded number of periods, and the subscription then renews
 * at the price of the product she bought.
 *
 * The amount is not half of the yearly amount. Half of 39 euros is 19.50 euros, which is not an
 * App Store price point, and the operator picked 19.99 euros from the two nearest points. myemi.app
 * keeps 19.50 euros through Stripe, so the two routes ask for different amounts on purpose.
 */
export const theBlackFridayProduct: AProductInTheStore = {
  identifier: 'blue.atlantic.emi.yearly.halfprice',
  runsFor: 'one year',
  priceInEuroCents: 1999,
  level: theOneLevel,
  freeMonth: false,
};

/** Every product the application sells. */
export const theProductsEmiSells: readonly AProductInTheStore[] = [
  theYearlyPlan,
  theMonthlyPlan,
  theBlackFridayProduct,
];

/**
 * When the Black Friday window closes, which is the end of 1 December 2026 in London.
 *
 * The product itself stays on sale after it. Taking a subscription off sale stops the renewals of
 * the women who already hold it, and Apple refuses each one with `PRODUCT_NOT_FOR_SALE`. So the
 * window is only what the paywall offers, and this instant is the whole of it.
 */
export const theBlackFridayWindowCloses = new Date('2026-12-02T00:00:00.000Z');
