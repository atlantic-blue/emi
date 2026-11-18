import { base64Of } from '@emi/crypto';
import {
  ASignInProblem,
  type HowItAsks,
  STATE_BYTES,
  THE_REGISTERED_RETURN_ADDRESS,
  type TheSignIn,
  type TheTokensSheHolds,
  VERIFIER_BYTES,
  WHERE_THE_APPLICATION_COMES_BACK,
  WHERE_THE_SIGN_IN_FUNCTION_ANSWERS,
  anApplicationStateFor,
  whatAnAddressCarries,
  whereTelegramAsksHerFor,
} from '@emi/sign-in';
import {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomValues,
} from 'expo-crypto';

import type { Language } from '../../language';

/** How the session ended: `success` with the address it ended on, or how she closed it. */
export interface HowTheSessionEnded {
  readonly type: string;
  readonly url?: string;
}

/** The authentication session the phone owns, which ends on the address it is handed second. */
export type OpenTheSession = (address: string, endsOn: string) => Promise<HowTheSessionEnded>;

/** Why a return did not sign her in. Every cause but a lost connection reads as one sentence. */
export type WhyTelegramDidNotFinish = 'itDidNotFinish' | 'nothingReachedTheService';

/** A return that did not sign her in, carrying the cause and nothing of hers. */
export class TheTelegramSignInDidNotFinish extends Error {
  readonly because: WhyTelegramDidNotFinish;

  constructor(because: WhyTelegramDidNotFinish) {
    super(because);
    this.name = 'TheTelegramSignInDidNotFinish';
    this.because = because;
  }
}

/** Her tokens, or nothing at all where she closed the sheet. */
export type WhatTelegramLeftHerWith =
  | { readonly kind: 'sheIsSignedIn'; readonly held: TheTokensSheHolds }
  | { readonly kind: 'sheTurnedBack' };

/** What a Telegram sign in on the phone goes through. */
export interface TheTelegramSignIn {
  readonly signIn: TheSignIn;
  readonly openTheSession: OpenTheSession;
  readonly how?: HowItAsks;
}

function asAnAddressCarriesIt(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function aValueNobodyCanGuess(bytes: number): string {
  return asAnAddressCarriesIt(base64Of(getRandomValues(new Uint8Array(bytes))));
}

/** The S256 code challenge of a verifier. */
export async function theChallengeFor(verifier: string): Promise<string> {
  return asAnAddressCarriesIt(
    await digestStringAsync(CryptoDigestAlgorithm.SHA256, verifier, {
      encoding: CryptoEncoding.BASE64,
    }),
  );
}

interface WhatTheFunctionSaid {
  readonly userName?: string;
  readonly answer?: string;
}

async function whatTheFunctionAnswers(
  sent: { readonly code: string; readonly verifier: string; readonly nonce: string },
  how: HowItAsks,
): Promise<{ readonly userName: string; readonly answer: string }> {
  let answered: Response;

  try {
    answered = await how(WHERE_THE_SIGN_IN_FUNCTION_ANSWERS, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: sent.code, codeVerifier: sent.verifier, nonce: sent.nonce }),
    });
  } catch {
    throw new TheTelegramSignInDidNotFinish('nothingReachedTheService');
  }

  const said = (await answered.json().catch(() => ({}))) as WhatTheFunctionSaid;

  if (!answered.ok || said.userName === undefined || said.answer === undefined) {
    throw new TheTelegramSignInDidNotFinish('itDidNotFinish');
  }

  return { userName: said.userName, answer: said.answer };
}

/**
 * A sign in with Telegram, from the press to her tokens.
 *
 * The state is checked before anything leaves the phone. A code sent for a state this press did not
 * write would sign her in to whichever account started that sign in.
 */
export async function signInWithTelegram(
  language: Language,
  using: TheTelegramSignIn,
): Promise<WhatTelegramLeftHerWith> {
  const how = using.how ?? fetch;
  const state = anApplicationStateFor(language, aValueNobodyCanGuess(STATE_BYTES));
  const verifier = aValueNobodyCanGuess(VERIFIER_BYTES);
  const nonce = aValueNobodyCanGuess(STATE_BYTES);
  const address = whereTelegramAsksHerFor({
    redirectUri: THE_REGISTERED_RETURN_ADDRESS,
    state,
    codeChallenge: await theChallengeFor(verifier),
  });

  const ended = await using.openTheSession(address, WHERE_THE_APPLICATION_COMES_BACK);

  if (ended.type !== 'success' || ended.url === undefined) {
    return { kind: 'sheTurnedBack' };
  }

  const came = whatAnAddressCarries(ended.url);

  if (came.state !== state || came.error !== null || came.code === null || came.code === '') {
    throw new TheTelegramSignInDidNotFinish('itDidNotFinish');
  }

  const said = await whatTheFunctionAnswers({ code: came.code, verifier, nonce }, how);

  try {
    return {
      kind: 'sheIsSignedIn',
      held: await using.signIn.signInWithTheOneTimeAnswer(said.userName, said.answer, how),
    };
  } catch (problem) {
    throw new TheTelegramSignInDidNotFinish(
      problem instanceof ASignInProblem && problem.because === 'nothingReachedTheService'
        ? 'nothingReachedTheService'
        : 'itDidNotFinish',
    );
  }
}
