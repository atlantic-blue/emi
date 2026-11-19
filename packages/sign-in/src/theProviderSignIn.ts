import type { TheTokensSheHolds } from './theSignIn';

/**
 * What the website and the application both need to sign in with Apple or with Google: the address
 * a press opens, and the exchange of the code the pool sends her back with.
 *
 * Each surface keeps its own state and its own verifier, and checks the state before it calls the
 * exchange. Only the client and the address she comes back to differ between the two, so both are
 * parameters here.
 */

/** The address the pool answers on, which Apple and Google both return to. */
export const THE_SIGN_IN_HOST = 'https://auth.myemi.app';

/** Where a press sends her, which is the authorization endpoint of the pool. */
export const WHERE_THE_POOL_ASKS_HER = `${THE_SIGN_IN_HOST}/oauth2/authorize`;

/** Where a code is exchanged for her tokens. */
export const WHERE_THE_POOL_EXCHANGES_A_CODE = `${THE_SIGN_IN_HOST}/oauth2/token`;

/** The name the service fixes for each way in, which the address she leaves on carries. */
export type AWayIn = 'SignInWithApple' | 'Google';

/** The subject and the address, which is everything the account holds. */
export const THE_SCOPES = ['openid', 'email'] as const;

/** Why a return did not sign her in. It is read by a test and never written on a screen. */
export type WhyItDidNotFinish =
  | 'nothingWasStarted'
  | 'theStateDidNotMatch'
  | 'theProviderSaidNo'
  | 'noCodeCameBack'
  | 'theServiceRefused'
  | 'nothingReachedTheService';

/**
 * A return that did not sign her in, carrying the cause and nothing else. The code, the state and
 * the verifier never reach it, because a message reaches a log.
 */
export class TheSignInDidNotFinish extends Error {
  readonly because: WhyItDidNotFinish;

  constructor(because: WhyItDidNotFinish) {
    super(because);
    this.name = 'TheSignInDidNotFinish';
    this.because = because;
  }
}

/** The values a press puts in the address it opens. */
export interface WhatAProviderPressAsksFor {
  readonly clientId: string;
  readonly way: AWayIn;
  readonly redirectUri: string;
  readonly state: string;
  readonly codeChallenge: string;
}

/**
 * The authorization address a press opens. The provider is named in it, so she goes straight to
 * Apple or to Google and never reads a page of the pool.
 */
export function whereThePoolAsksHerFor(asked: WhatAProviderPressAsksFor): string {
  return `${WHERE_THE_POOL_ASKS_HER}?${new URLSearchParams([
    ['response_type', 'code'],
    ['client_id', asked.clientId],
    ['identity_provider', asked.way],
    ['scope', THE_SCOPES.join(' ')],
    ['redirect_uri', asked.redirectUri],
    ['state', asked.state],
    ['code_challenge', asked.codeChallenge],
    ['code_challenge_method', 'S256'],
  ]).toString()}`;
}

/** What an exchange sends: the code, and the client, address and verifier the press used. */
export interface TheCodeToExchange {
  readonly clientId: string;
  readonly code: string;
  readonly redirectUri: string;
  readonly verifier: string;
}

/** What the pool answers an exchange with, read as far as this module reads it and no further. */
interface WhatThePoolSaid {
  readonly id_token?: string;
  readonly access_token?: string;
  readonly refresh_token?: string;
}

/** Her tokens, from a code whose state the caller has already checked. */
export async function theTokensForTheCode(
  exchanged: TheCodeToExchange,
  how: typeof fetch = fetch,
): Promise<TheTokensSheHolds> {
  let answer: Response;

  try {
    answer = await how(WHERE_THE_POOL_EXCHANGES_A_CODE, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams([
        ['grant_type', 'authorization_code'],
        ['client_id', exchanged.clientId],
        ['code', exchanged.code],
        ['redirect_uri', exchanged.redirectUri],
        ['code_verifier', exchanged.verifier],
      ]).toString(),
    });
  } catch {
    // A runtime that reached nobody throws rather than answering, so this is the one place a lost
    // connection is told apart from a refusal.
    throw new TheSignInDidNotFinish('nothingReachedTheService');
  }

  const said = (await answer.json().catch(() => ({}))) as WhatThePoolSaid;

  if (
    !answer.ok ||
    said.id_token === undefined ||
    said.access_token === undefined ||
    said.refresh_token === undefined
  ) {
    throw new TheSignInDidNotFinish('theServiceRefused');
  }

  return {
    idToken: said.id_token,
    accessToken: said.access_token,
    refreshToken: said.refresh_token,
  };
}
