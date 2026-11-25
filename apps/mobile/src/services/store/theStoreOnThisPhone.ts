import {
  type Purchase,
  type PurchaseIOS,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
} from 'expo-iap';

import type { WhatTheStoreSaysAboutATransaction } from './theEntitlement';
import type { ReachesTheStore } from './thePlans';
import { THE_KIND_EMI_SELLS } from './thePlans';
import type { BuysInTheStore, ThePurchaseTheStoreMade } from './thePurchase';

/**
 * The App Store on this phone, reached through expo-iap.
 *
 * The library speaks StoreKit 2, which is what signs a transaction and what the server library
 * reads. It is the one package in the Expo ecosystem with a current release for this version, and
 * it keeps every purchase on the phone and on Apple, with no third party in the middle.
 *
 * It carries a native module, so a plan list answers in a build of the application and never in
 * Expo Go. The module is `ExpoIap`, linked by the autolinking of Expo rather than by the
 * autolinking of React Native.
 *
 * The library may answer a read with nothing at all, and nothing is a store that named no product
 * rather than a read that failed, so it reads here as an empty list.
 *
 * This file is the only place that names the library. Everything above it takes a
 * `ReachesTheStore` or a `ReadsWhatSheHoldsInTheStore`, so a test drives the whole route with no
 * store and no phone.
 */

/**
 * The library answers one shape for Apple and another for Google Play, and the two share no
 * subscription field. Emi sells through the App Store alone, so a transaction from anywhere else
 * carries nothing this half can read.
 */
function theAppleFieldsOf(purchase: Purchase): Partial<PurchaseIOS> {
  return purchase.store === 'apple' ? (purchase as PurchaseIOS) : {};
}

/**
 * The fields of one transaction, read off the library's own shape.
 *
 * The identifier of the first transaction of the subscription is what survives every renewal, and
 * a transaction that never renewed carries none, so its own identifier stands in for it.
 *
 * The grace period and the billing retry are read out of the renewal information, which StoreKit
 * fills while Apple is still trying her card.
 */
export function theTransactionIn(purchase: Purchase): WhatTheStoreSaysAboutATransaction {
  const apple = theAppleFieldsOf(purchase);
  const renewal = apple.renewalInfoIOS ?? null;
  const offer = apple.offerIOS ?? null;

  return {
    productIdentifier: purchase.productId,
    transactionIdentifier: apple.transactionId ?? purchase.id,
    originalTransactionIdentifier: apple.originalTransactionIdentifierIOS ?? purchase.id,
    expiresAtInMilliseconds: apple.expirationDateIOS ?? null,
    revokedAtInMilliseconds: apple.revocationDateIOS ?? null,
    renewsItself: purchase.isAutoRenewing,
    inBillingRetry: renewal?.isInBillingRetry === true,
    graceEndsAtInMilliseconds: renewal?.gracePeriodExpirationDate ?? null,
    offerKind: offer?.type ?? null,
    offerPaymentMode: offer?.paymentMode ?? null,
  };
}

/**
 * The purchase the library made, with the way to finish it held in a closure over the shape the
 * library answered. The library type stops here, so nothing above this file holds one.
 */
function thePurchaseIn(purchase: Purchase): ThePurchaseTheStoreMade {
  return {
    transaction: theTransactionIn(purchase),
    finish: async () => {
      await finishTransaction({ isConsumable: false, purchase });
    },
  };
}

/**
 * The press, as the library takes it. The library documents its own answer as a payload rather
 * than as an outcome, so a press that comes back with nothing is read as a store that refused it
 * and never as a purchase nobody can finish.
 */
async function buy(identifier: string): Promise<ThePurchaseTheStoreMade> {
  const made = await requestPurchase({
    request: { apple: { sku: identifier } },
    type: THE_KIND_EMI_SELLS,
  });
  const one = Array.isArray(made) ? made[0] : made;

  if (one === null || one === undefined) {
    throw new Error(`the store answered no transaction for ${identifier}`);
  }

  return thePurchaseIn(one);
}

export const theStoreOnThisPhone: ReachesTheStore & BuysInTheStore = {
  open: initConnection,
  productsFor: async (asked) => (await fetchProducts(asked)) ?? [],
  /**
   * Every transaction and not only the live ones, because a refund is a transaction the store
   * holds with an instant on it, and the reckoning reads that instant to tell a refund from an
   * ordinary lapse.
   */
  whatSheHolds: async () =>
    ((await getAvailablePurchases({ onlyIncludeActiveItemsIOS: false })) ?? []).map(
      theTransactionIn,
    ),
  whenATransactionArrives: (tell) => purchaseUpdatedListener(() => tell()),
  buy,
  restore: async () => {
    await restorePurchases();
  },
};
