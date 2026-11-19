import { bytesFromBase64 } from '@emi/crypto';
import {
  type AWayIn,
  type HowItAsks,
  STATE_BYTES,
  TheSignInDidNotFinish,
  type TheTokensSheHolds,
  VERIFIER_BYTES,
  theTokensForTheCode,
  whatAnAddressCarries,
  whereThePoolAsksHerFor,
} from '@emi/sign-in';

import { THE_IPHONE_CLIENT_ID } from './theAppSignIn';
import { type OpenTheSession, aValueNobodyCanGuess, theChallengeFor } from './theTelegramSignIn';

/** The ways in the pool hands to another company, as the application names them. */
export type AProvider = 'apple' | 'google';

const theWayInOf: Readonly<Record<AProvider, AWayIn>> = {
  apple: 'SignInWithApple',
  google: 'Google',
};

/** The address the pool sends her back to, which ends the session of the phone. */
export const WHERE_THE_POOL_SENDS_THE_PHONE_BACK = 'emi://sign-in/returning';

/** Why a return did not sign her in. Every cause but a lost connection reads as one sentence. */
export type WhyAProviderDidNotFinish = 'itDidNotFinish' | 'nothingReachedTheService';

/** A return that did not sign her in, carrying the cause and nothing of hers. */
export class TheProviderSignInDidNotFinish extends Error {
  readonly because: WhyAProviderDidNotFinish;

  constructor(because: WhyAProviderDidNotFinish) {
    super(because);
    this.name = 'TheProviderSignInDidNotFinish';
    this.because = because;
  }
}

/** Her tokens and the address the provider vouched for, or nothing where she closed the sheet. */
export type WhatTheProviderLeftHerWith =
  | {
      readonly kind: 'sheIsSignedIn';
      readonly held: TheTokensSheHolds;
      readonly address: string;
    }
  | { readonly kind: 'sheTurnedBack' };

/** What a sign in with Apple or Google on the phone goes through. */
export interface TheProviderSignIn {
  readonly openTheSession: OpenTheSession;
  readonly how?: HowItAsks;
}

/**
 * The email claim of an id token. The account screen shows her address, so a token that carries
 * none cannot finish a sign in. The signature is not checked here: the token came straight from
 * the pool over the exchange, and the phone reads it for nothing but the address it shows her.
 */
export function theAddressIn(idToken: string): string {
  const payload = idToken.split('.')[1] ?? '';
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

  let claims: unknown;

  try {
    claims = JSON.parse(
      new TextDecoder().decode(
        bytesFromBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')),
      ),
    );
  } catch {
    throw new TheProviderSignInDidNotFinish('itDidNotFinish');
  }

  const address =
    typeof claims === 'object' && claims !== null
      ? (claims as Readonly<Record<string, unknown>>).email
      : undefined;

  if (typeof address !== 'string' || address === '') {
    throw new TheProviderSignInDidNotFinish('itDidNotFinish');
  }

  return address;
}

/**
 * A sign in with Apple or with Google, from the press to her tokens.
 *
 * The state is checked before anything leaves the phone. A code exchanged for a state this press
 * did not write would sign her in to whichever account started that sign in.
 */
export async function signInWithAProvider(
  provider: AProvider,
  using: TheProviderSignIn,
): Promise<WhatTheProviderLeftHerWith> {
  const state = aValueNobodyCanGuess(STATE_BYTES);
  const verifier = aValueNobodyCanGuess(VERIFIER_BYTES);
  const address = whereThePoolAsksHerFor({
    clientId: THE_IPHONE_CLIENT_ID,
    way: theWayInOf[provider],
    redirectUri: WHERE_THE_POOL_SENDS_THE_PHONE_BACK,
    state,
    codeChallenge: await theChallengeFor(verifier),
  });

  const ended = await using.openTheSession(address, WHERE_THE_POOL_SENDS_THE_PHONE_BACK);

  if (ended.type !== 'success' || ended.url === undefined) {
    return { kind: 'sheTurnedBack' };
  }

  const came = whatAnAddressCarries(ended.url);

  if (came.state !== state || came.error !== null || came.code === null || came.code === '') {
    throw new TheProviderSignInDidNotFinish('itDidNotFinish');
  }

  let held: TheTokensSheHolds;

  try {
    held = await theTokensForTheCode(
      {
        clientId: THE_IPHONE_CLIENT_ID,
        code: came.code,
        redirectUri: WHERE_THE_POOL_SENDS_THE_PHONE_BACK,
        verifier,
      },
      using.how ?? fetch,
    );
  } catch (problem) {
    throw new TheProviderSignInDidNotFinish(
      problem instanceof TheSignInDidNotFinish && problem.because === 'nothingReachedTheService'
        ? 'nothingReachedTheService'
        : 'itDidNotFinish',
    );
  }

  return { kind: 'sheIsSignedIn', held, address: theAddressIn(held.idToken) };
}
