import type {
  MutationFinishTransactionArgs,
  MutationRequestPurchaseArgs,
  PurchaseIOS,
  PurchaseOfferIOS,
  PurchaseOptions,
  RenewalInfoIOS,
} from 'expo-iap';

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

/**
 * The transactions half of the stand in. It answers in the library's own `PurchaseIOS`, so a field
 * the library renames stops this file compiling rather than quietly reading as absent.
 */

interface WhatSheHoldsBehind {
  purchases: PurchaseIOS[] | null;
  readOfWhatSheHoldsFails: boolean;
  listenerCannotAttach: boolean;
  listeners: (() => void)[];
  optionsRead: (PurchaseOptions | null | undefined)[];
}

const holding: WhatSheHoldsBehind = {
  purchases: [],
  readOfWhatSheHoldsFails: false,
  listenerCannotAttach: false,
  listeners: [],
  optionsRead: [],
};

/** Every field the library marks required, so a test states only the ones its rule is about. */
export function aTransactionTheStoreHolds(
  productId: string,
  these: Partial<PurchaseIOS> = {},
): PurchaseIOS {
  return {
    id: `${productId}-1`,
    transactionId: `${productId}-1`,
    productId,
    purchaseState: 'purchased',
    quantity: 1,
    store: 'apple',
    storeId: 'apple',
    transactionDate: Date.parse('2026-11-01T00:00:00.000Z'),
    isAutoRenewing: true,
    ...these,
  };
}

/** What StoreKit fills in while Apple is still trying her card. */
export function theRenewalInformation(these: Partial<RenewalInfoIOS> = {}): RenewalInfoIOS {
  return { willAutoRenew: true, ...these };
}

/** The transaction of a yearly plan still inside its free month. */
export function theFreeMonthOffer(): PurchaseOfferIOS {
  return { id: 'one-month-free', type: 'introductory', paymentMode: 'free-trial' };
}

/** The store holds these transactions and no others, from now on. */
export function theStoreHoldsTheseTransactions(these: readonly PurchaseIOS[]): void {
  holding.purchases = [...these];
}

/** The read comes back with nothing at all, which the library answers as null. */
export function theStoreNamesNoTransaction(): void {
  holding.purchases = null;
}

/** The read of what she holds is refused, as it is on a phone with no network. */
export function theStoreCannotSayWhatSheHolds(): void {
  holding.readOfWhatSheHoldsFails = true;
}

/** The native module is absent, so the watch cannot be attached at all. */
export function theWatchCannotBeAttached(): void {
  holding.listenerCannotAttach = true;
}

/** How many watches are attached to the store right now. */
export function theWatchesOnTheStore(): number {
  return holding.listeners.length;
}

/** Every set of options a read of what she holds was given. */
export function theOptionsTheReadsWereGiven(): readonly (PurchaseOptions | null | undefined)[] {
  return [...holding.optionsRead];
}

/**
 * A transaction happens somewhere else and the store tells every watch about it.
 *
 * A watch answers by asking the store again, which is a chain of promises nobody here holds, so
 * the queue is flushed through a timer rather than by awaiting a fixed number of ticks.
 */
export async function aTransactionArrivesFromElsewhere(): Promise<void> {
  for (const listener of [...holding.listeners]) {
    listener();
  }

  await new Promise((settled) => setTimeout(settled, 0));
}

/** A store holding no transaction and remembering nothing, for the test that is about to run. */
export function theTransactionsStartAgain(): void {
  holding.purchases = [];
  holding.readOfWhatSheHoldsFails = false;
  holding.listenerCannotAttach = false;
  holding.listeners = [];
  holding.optionsRead = [];
}

export async function getAvailablePurchases(
  options?: PurchaseOptions | null,
): Promise<readonly PurchaseIOS[] | null> {
  store.calls.push('getAvailablePurchases');
  holding.optionsRead.push(options);

  if (holding.readOfWhatSheHoldsFails) {
    throw new Error('the store cannot say what she holds');
  }

  return Promise.resolve(holding.purchases === null ? null : [...holding.purchases]);
}

export function purchaseUpdatedListener(listener: (purchase: PurchaseIOS) => void): {
  remove: () => void;
} {
  store.calls.push('purchaseUpdatedListener');

  if (holding.listenerCannotAttach) {
    throw new Error("Cannot find native module 'ExpoIap'");
  }

  const told = (): void => listener(aTransactionTheStoreHolds('whatever-the-store-named'));

  holding.listeners.push(told);

  return {
    remove: () => {
      holding.listeners = holding.listeners.filter((one) => one !== told);
    },
  };
}

/**
 * The purchase half of the stand in: the press, the finish and the restore.
 *
 * The press answers the transaction the store made, or raises the way the library raises. A
 * refusal the woman caused carries the library's own cancel code, so the application tells her
 * pressing cancel apart from a store that would not sell.
 */

interface WhatThePressDoesBehind {
  made: PurchaseIOS | null;
  raises: { code?: string } | null;
  restoreFails: boolean;
  presses: MutationRequestPurchaseArgs[];
  finished: MutationFinishTransactionArgs[];
  restores: number;
}

const pressing: WhatThePressDoesBehind = {
  made: null,
  raises: null,
  restoreFails: false,
  presses: [],
  finished: [],
  restores: 0,
};

/** The store sells her this transaction when she presses. */
export function theStoreSells(made: PurchaseIOS): void {
  pressing.made = made;
  pressing.raises = null;
}

/** The library code for a woman who pressed cancel in the system sheet. */
export const THE_CANCEL_CODE = 'user-cancelled';

/** She opens the system sheet and presses cancel. */
export function sheCancelsThePurchase(): void {
  pressing.raises = { code: THE_CANCEL_CODE };
}

/** The store refuses the press, for any reason that is not her pressing cancel. */
export function theStoreRefusesThePurchase(): void {
  pressing.raises = { code: 'service-error' };
}

/** The restore itself is refused, which is a store that cannot be reached. */
export function theStoreRefusesTheRestore(): void {
  pressing.restoreFails = true;
}

/** Every press the library took, as the library was given it. */
export function thePressesOnTheStore(): readonly MutationRequestPurchaseArgs[] {
  return [...pressing.presses];
}

/** Every transaction the application finished, as the library was given it. */
export function theTransactionsFinished(): readonly MutationFinishTransactionArgs[] {
  return [...pressing.finished];
}

/** How many times the store was asked to restore her purchases. */
export function theRestoresAskedFor(): number {
  return pressing.restores;
}

/** A store that sells nothing and remembers nothing, for the test that is about to run. */
export function thePressesStartAgain(): void {
  pressing.made = null;
  pressing.raises = null;
  pressing.restoreFails = false;
  pressing.presses = [];
  pressing.finished = [];
  pressing.restores = 0;
}

export async function requestPurchase(
  args: MutationRequestPurchaseArgs,
): Promise<PurchaseIOS | null> {
  store.calls.push('requestPurchase');
  pressing.presses.push(args);

  if (pressing.raises !== null) {
    return Promise.reject(Object.assign(new Error('the store refused the press'), pressing.raises));
  }

  return Promise.resolve(pressing.made);
}

export async function finishTransaction(args: MutationFinishTransactionArgs): Promise<void> {
  store.calls.push('finishTransaction');
  pressing.finished.push(args);

  return Promise.resolve();
}

export async function restorePurchases(): Promise<void> {
  store.calls.push('restorePurchases');
  pressing.restores += 1;

  if (pressing.restoreFails) {
    throw new Error('the store cannot be reached');
  }

  return Promise.resolve();
}
