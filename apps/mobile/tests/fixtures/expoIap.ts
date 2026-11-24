import type {
  WhatIsAskedOfTheStore,
  WhatTheStoreSaysAboutAProduct,
} from '../../src/services/store/thePlans';

/**
 * The application reaches the App Store through expo-iap. The library resolves a native module, and
 * a runner holds none, so this stands in for the library at the module boundary. It answers what
 * the store answers.
 *
 * It names only the identifiers it was asked for, because the store leaves an identifier it does
 * not hold out of the answer rather than raising on it. A stand in that named a product nobody
 * asked about would let a test hold the module to a rule the real store can never break.
 */

interface TheStoreBehind {
  names: WhatTheStoreSaysAboutAProduct[] | null;
  connectionFails: boolean;
  readFails: boolean;
  calls: string[];
  reads: WhatIsAskedOfTheStore[];
}

const store: TheStoreBehind = {
  names: [],
  connectionFails: false,
  readFails: false,
  calls: [],
  reads: [],
};

/** One product the store holds, with the price in the words the store quotes. */
export function aProductTheStoreHolds(
  id: string,
  displayPrice: string,
  currency = 'EUR',
): WhatTheStoreSaysAboutAProduct {
  return { id, displayPrice, currency };
}

/** The store holds these products and nothing else, from now on. */
export function theStoreHolds(names: readonly WhatTheStoreSaysAboutAProduct[]): void {
  store.names = [...names];
}

/** The read comes back with nothing at all, which the library answers as null. */
export function theStoreAnswersNothing(): void {
  store.names = null;
}

/** The connection cannot be opened, as it cannot on a phone with no network. */
export function theStoreCannotBeReached(): void {
  store.connectionFails = true;
}

/** The connection opens and the read is refused. */
export function theStoreRefusesTheRead(): void {
  store.readFails = true;
}

/** Every call the library took, in the order it took them. */
export function whatTheLibraryWasAsked(): readonly string[] {
  return [...store.calls];
}

/** Every read of the products, as the library was given it. */
export function theReadsOfTheProducts(): readonly WhatIsAskedOfTheStore[] {
  return [...store.reads];
}

/** A store holding nothing and remembering nothing, for the test that is about to run. */
export function theStoreStartsAgain(): void {
  store.names = [];
  store.connectionFails = false;
  store.readFails = false;
  store.calls = [];
  store.reads = [];
}

/** The two names below are the library's own, because this stands in at the module boundary. */
export async function initConnection(): Promise<boolean> {
  store.calls.push('initConnection');

  if (store.connectionFails) {
    throw new Error('the store cannot be reached');
  }

  return Promise.resolve(true);
}

export async function fetchProducts(
  asked: WhatIsAskedOfTheStore,
): Promise<readonly WhatTheStoreSaysAboutAProduct[] | null> {
  store.calls.push('fetchProducts');
  store.reads.push(asked);

  if (store.readFails) {
    throw new Error('the store refused the read');
  }

  return Promise.resolve(store.names?.filter((one) => asked.skus.includes(one.id)) ?? null);
}
