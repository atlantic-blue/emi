import type { Language } from '@/app/words';

import { SITE_ORIGIN } from './addresses';
import {
  type AWayIn,
  THE_WEBSITE_CLIENT_ID,
  TheSignInDidNotFinish,
  type TheTokensSheHolds,
  theTokensForTheCode,
  whereThePoolAsksHerFor,
} from './theSignIn';

export {
  type AWayIn,
  THE_SCOPES,
  THE_SIGN_IN_HOST,
  TheSignInDidNotFinish,
  type WhyItDidNotFinish,
} from './theSignIn';

/**
 * The conversation myemi.app has with the pool when a woman signs in with Apple or with Google.
 *
 * She presses, her browser leaves for the pool, the pool sends her to Apple or to Google, and the
 * company sends her back to the pool, which sends her to the page below with a code in the
 * address. The page exchanges that code for her tokens. Emi never holds a credential of either
 * company, and neither company ever receives a day, a symptom or a date.
 *
 * Two values travel with the press and are read when she comes back.
 *
 * The state is a value her browser made and kept. The pool hands it back untouched, so a return
 * carrying another value is a return this browser did not start, and nothing is exchanged for it.
 *
 * The code challenge is the proof key for code exchange. This client keeps no secret, because a
 * page of this site keeps nothing a reader cannot read, so the exchange proves instead that it was
 * started by whoever is now finishing it: the press keeps a long random value, sends the pool a
 * digest of it, and the exchange sends the value itself.
 *
 * Both are kept in `sessionStorage`, which is where the tokens are kept and for the same reason.
 * It survives the trip to the other company in that tab and it does not survive the tab closing.
 *
 * What is proved, and what is not. Every path below is driven end to end in
 * `test/theProviderSignIn.test.ts` and in `features/website/` against a stub of the pool. The
 * shapes are the shapes the service documents. Nobody has signed in through the live pool with
 * this code.
 */

/** The page the pool sends her back to, under the language she was reading. */
export const WHERE_SHE_COMES_BACK_TO = 'sign-in/returning/';

/** The one name the pool reads a kept value under, so a sign out removes one thing. */
export const WHAT_SHE_STARTED_ENTRY = 'emi.signing-in';

/** How many bytes a state and a verifier are made of. 32 bytes is 256 bits. */
export const RANDOM_BYTES = 32;

/** What a press kept, so the return can prove it started the sign in it is finishing. */
export interface WhatSheStarted {
  readonly way: AWayIn;
  readonly state: string;
  readonly verifier: string;
  readonly language: Language;
}

/** How this module reaches the pool. A test hands it one that answers without a network. */
export type HowItAsks = typeof fetch;

/**
 * Where the kept value lives. Absent on a server, where there is nothing to hold it.
 *
 * It is read off the global rather than off `window`, which is the same object in a browser. The
 * press makes a digest, and a digest needs the real cryptography of the platform, which a document
 * standing in for a browser does not carry. So the cases of this module run where that
 * cryptography is and stand a store in, and reading the global is what lets them.
 */
function theStore(): Storage | null {
  try {
    return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    // A browser told to keep nothing at all throws on the read rather than answering with
    // nothing, and a reader who turned storage off should read a sentence rather than a crash.
    return null;
  }
}

/** Bytes as an address may carry them: base 64, with the three characters an address reads. */
function asAnAddressCarriesIt(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * A value nobody can guess, from the random source of the platform. The count of bytes is a
 * parameter because the Telegram sign in beside this one makes a shorter state value than it makes
 * a verifier, and one implementation of the random source and of the writing is worth more than
 * two.
 */
export function aValueNobodyCanGuess(bytes: number = RANDOM_BYTES): string {
  return asAnAddressCarriesIt(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** The digest of a verifier, which is what the press hands the pool in place of the value. */
export async function theChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));

  return asAnAddressCarriesIt(new Uint8Array(digest));
}

/** The address the pool sends her back to, which is this page on the host she is reading. */
export function whereSheComesBackTo(language: Language, origin: string): string {
  return `${origin}/${language}/${WHERE_SHE_COMES_BACK_TO}`;
}

/**
 * Where a press takes her, and what the press keeps.
 *
 * The provider is named in the address, so her browser goes straight to Apple or to Google and
 * never reads a page of the pool. A woman who pressed Apple has chosen Apple, and a page in
 * between asking her again is a page that answers nothing.
 */
export async function whereAPressTakesHer(
  way: AWayIn,
  language: Language,
  origin: string,
): Promise<string> {
  const started: WhatSheStarted = {
    way,
    state: aValueNobodyCanGuess(),
    verifier: aValueNobodyCanGuess(),
    language,
  };

  const address = whereThePoolAsksHerFor({
    clientId: THE_WEBSITE_CLIENT_ID,
    way,
    redirectUri: whereSheComesBackTo(language, origin),
    state: started.state,
    codeChallenge: await theChallengeFor(started.verifier),
  });

  theStore()?.setItem(WHAT_SHE_STARTED_ENTRY, JSON.stringify(started));

  return address;
}

/** What the press kept, or nothing at all where the entry is absent or unreadable. */
export function whatSheStarted(): WhatSheStarted | null {
  const written = theStore()?.getItem(WHAT_SHE_STARTED_ENTRY);

  if (written === null || written === undefined) {
    return null;
  }

  try {
    const read = JSON.parse(written) as Partial<WhatSheStarted>;

    return typeof read.state === 'string' &&
      typeof read.verifier === 'string' &&
      typeof read.language === 'string' &&
      (read.way === 'SignInWithApple' || read.way === 'Google')
      ? { way: read.way, state: read.state, verifier: read.verifier, language: read.language }
      : null;
  } catch {
    return null;
  }
}

export function forgetWhatSheStarted(): void {
  theStore()?.removeItem(WHAT_SHE_STARTED_ENTRY);
}

/**
 * Her tokens, from the code the pool sent her back with.
 *
 * The state is read before anything leaves the browser. A return whose state is not the one this
 * browser kept is a return somebody else started, and a code exchanged for it would sign her in to
 * an account that is not hers, so nothing is sent at all.
 */
export async function theTokensSheCameBackWith(
  address: string,
  how: HowItAsks = fetch,
): Promise<TheTokensSheHolds> {
  const came = new URLSearchParams(address);
  const started = whatSheStarted();

  if (started === null) {
    throw new TheSignInDidNotFinish('nothingWasStarted');
  }

  if (came.get('state') !== started.state) {
    throw new TheSignInDidNotFinish('theStateDidNotMatch');
  }

  if (came.get('error') !== null) {
    throw new TheSignInDidNotFinish('theProviderSaidNo');
  }

  const code = came.get('code');

  if (code === null || code === '') {
    throw new TheSignInDidNotFinish('noCodeCameBack');
  }

  return theTokensForTheCode(
    {
      clientId: THE_WEBSITE_CLIENT_ID,
      code,
      redirectUri: whereSheComesBackTo(started.language, theOriginSheIsOn()),
      verifier: started.verifier,
    },
    how,
  );
}

/**
 * The host she is reading, which is the host the pool was told to come back to. The exchange has
 * to send the same address the press sent, so both are built from one place.
 */
export function theOriginSheIsOn(): string {
  return typeof window === 'undefined' ? SITE_ORIGIN : window.location.origin;
}
