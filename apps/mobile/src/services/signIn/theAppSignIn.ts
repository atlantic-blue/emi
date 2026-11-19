import { type TheSignIn, theSignInFor } from '@emi/sign-in';
import { getRandomValues } from 'expo-crypto';

/** The `emi-iphone` client of the pool, which is made with no client secret. */
export const THE_IPHONE_CLIENT_ID = '2rblpgql4qv6v414pul240odbn';

/** A phone carries no web crypto, so the random bytes of a new username come from expo-crypto. */
export const theAppSignIn: TheSignIn = theSignInFor({
  clientId: THE_IPHONE_CLIENT_ID,
  random: (bytes) => getRandomValues(bytes),
});
