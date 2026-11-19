import { theSignInFor } from '@emi/sign-in';

export * from '@emi/sign-in';

/** The client myemi.app signs in with, which is made with no client secret. */
export const THE_WEBSITE_CLIENT_ID = '2enb4g3qtp6urb099srdq749o6';

export const {
  askForACode,
  sendHerAnotherCode,
  signInWithTheCode,
  signInWithTheOneTimeAnswer,
  signOut,
} = theSignInFor({ clientId: THE_WEBSITE_CLIENT_ID });
