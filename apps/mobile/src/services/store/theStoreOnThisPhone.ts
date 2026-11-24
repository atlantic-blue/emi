import { fetchProducts, initConnection } from 'expo-iap';

import type { ReachesTheStore } from './thePlans';

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
 * `ReachesTheStore`, so a test drives the whole route with no store and no phone.
 */
export const theStoreOnThisPhone: ReachesTheStore = {
  open: initConnection,
  productsFor: async (asked) => (await fetchProducts(asked)) ?? [],
};
