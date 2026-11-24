import { type AProductInTheStore, theProductsEmiSells } from './theProducts';

/**
 * Contract PAY-1, read from the App Store. `theProducts.ts` records what App Store Connect holds.
 * This module asks the store itself about those same three products.
 *
 * A screen shows the figure the store quotes. It never shows the figure the record holds. The store
 * answers in her own currency, at the price point of her own country, and the record holds euro
 * cents. So the record names the products and puts them in order. The store says what they cost.
 *
 * The store leaves a product it does not hold out of the answer. A product nobody approved in App
 * Store Connect is absent, and the store raises on nothing. So the plans and the identifiers the
 * store did not name come back together, and the screen above answers for a list of two.
 */

/** The fields this module reads off one product the store named, and all of them. */
export interface WhatTheStoreSaysAboutAProduct {
  readonly id: string;
  /** The price as the store writes it, with her own currency symbol in it. */
  readonly displayPrice: string;
  readonly currency: string;
}

/** Every product Emi sells is a subscription. The store reads one only under this word. */
export const THE_KIND_EMI_SELLS = 'subs';

/** What this module asks the store for. */
export interface WhatIsAskedOfTheStore {
  readonly skus: string[];
  readonly type: typeof THE_KIND_EMI_SELLS;
}

/**
 * How this module reaches the store. A test hands it one that answers without a store, and the
 * phone hands it the purchase library.
 *
 * Nothing here closes the connection. The application opens it once and keeps it, because the
 * transactions that happen outside the application arrive on it.
 */
export interface ReachesTheStore {
  readonly open: () => Promise<unknown>;
  readonly productsFor: (
    asked: WhatIsAskedOfTheStore,
  ) => Promise<readonly WhatTheStoreSaysAboutAProduct[]>;
}

/** One plan: the product as the record holds it, and what the store says it costs. */
export interface APlanInTheStore {
  readonly product: AProductInTheStore;
  readonly priceInWords: string;
  readonly currency: string;
}

/** Every plan the store named, and every identifier it did not. */
export interface ThePlansTheStoreNamed {
  readonly plans: readonly APlanInTheStore[];
  readonly theStoreNamedNo: readonly string[];
}

/** Why a read of the plans came back with nothing. */
export type WhyTheStoreSaidNothing = 'theStoreCannotBeReached' | 'theReadWasRefused';

/** Raised where the store answered nothing at all, which is a different thing from a short list. */
export class TheStoreSaidNothing extends Error {
  readonly because: WhyTheStoreSaidNothing;

  constructor(because: WhyTheStoreSaidNothing) {
    super(because);
    this.name = 'TheStoreSaidNothing';
    this.because = because;
  }
}

/**
 * The plans, read from the store in one call.
 *
 * The connection is opened first. The store refuses a read on a connection nobody opened, and the
 * refusal reads the same as a store that is down, so the order is a rule rather than a habit.
 */
export async function thePlansInTheStore(using: ReachesTheStore): Promise<ThePlansTheStoreNamed> {
  const identifiers = theProductsEmiSells.map((product) => product.identifier);

  try {
    await using.open();
  } catch {
    throw new TheStoreSaidNothing('theStoreCannotBeReached');
  }

  let said: readonly WhatTheStoreSaysAboutAProduct[];

  try {
    said = await using.productsFor({ skus: identifiers, type: THE_KIND_EMI_SELLS });
  } catch {
    throw new TheStoreSaidNothing('theReadWasRefused');
  }

  const plans = theProductsEmiSells.flatMap((product) => {
    const named = said.find((one) => one.id === product.identifier);

    return named === undefined
      ? []
      : [{ product, priceInWords: named.displayPrice, currency: named.currency }];
  });

  return {
    plans,
    theStoreNamedNo: identifiers.filter(
      (identifier) => !plans.some((plan) => plan.product.identifier === identifier),
    ),
  };
}
