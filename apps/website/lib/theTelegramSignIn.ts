import { type Language, isLanguage } from '@/app/words';

import { aValueNobodyCanGuess, theChallengeFor } from './theProviderSignIn';
import { ASignInProblem, type TheTokensSheHolds, signInWithTheOneTimeAnswer } from './theSignIn';

/**
 * The conversation myemi.app has with Telegram, and with the sign in function of the api, when a
 * woman logs in with Telegram.
 *
 * It is the one way in that never opens a page of the pool. She presses, her browser leaves for
 * `oauth.telegram.org`, Telegram asks her once, and Telegram sends her back to the relay page with
 * a code. That page hands the code to the sign in function, which exchanges it with Telegram and
 * answers with a user name of the pool and one answer good for one challenge. Two calls to the
 * pool then turn that answer into her tokens.
 *
 * The identity token Telegram signs never reaches this browser. The function reads it and answers
 * with none of it, so the subject of a woman reading a period tracker is in no browser and on no
 * page of this site.
 *
 * Three values travel with the press and are read when she comes back.
 *
 * The state is the language she is reading in and a value her browser made. Telegram hands it back
 * untouched, so a return carrying any other value is a return this browser did not start, and
 * nothing is sent anywhere for it. The language is in it because Telegram redirects to one
 * registered address, which is under `en`, and the relay has to send her on in her own language.
 *
 * The code challenge is the proof key for code exchange. The press keeps a long random value,
 * sends Telegram a digest of it, and the sign in function sends the value itself.
 *
 * The nonce is the one check that proves the least, and it is kept because it costs nothing. The
 * discovery document of Telegram names no nonce among its claims, so Telegram may return none at
 * all, and the function refuses a token only when it carries a different one.
 *
 * What is proved, and what is not. Every path below is driven end to end in
 * `test/theTelegramSignIn.test.ts` and in `e2e/features/theSignInWithTelegram.feature`, against a
 * stub of Telegram, of the api and of the pool. Nobody has logged in through Telegram with this
 * code: the client secret and the two allowed addresses are made by hand in the BotFather mini
 * application, and the pool does not name the three triggers yet.
 */

/** The host Telegram answers its own sign in on, which no page of this site ever calls. */
export const THE_TELEGRAM_HOST = 'https://oauth.telegram.org';

/** Where a press sends her, which is the authorization endpoint the discovery document names. */
export const WHERE_TELEGRAM_ASKS_HER = `${THE_TELEGRAM_HOST}/auth`;

/**
 * The api the sign in function answers on, which the content policy names so her browser may
 * reach it. It is public configuration of this site, the way the pool host and the website client
 * are: every request a browser makes carries it, and the route it calls takes no authorizer.
 *
 * Written out whole rather than built from the region, so a reader of this file and a reader of
 * the policy see the same characters. `infra/README.md` names the same address.
 */
export const THE_API_HOST = 'https://2pumohtm7l.execute-api.eu-central-1.amazonaws.com';

/** The route the sign in function answers, which takes a code and a verifier and no signature. */
export const WHERE_THE_SIGN_IN_FUNCTION_ANSWERS = `${THE_API_HOST}/v1/sign-in/telegram`;

/**
 * The bot of Emi, as the client identifier of this sign in and as the audience its token carries.
 *
 * It is public configuration, read here the way the pool client identifier is read: a named value
 * of this site rather than a number written into the address the press builds. Telegram shows it
 * beside the client secret in the BotFather mini application, the parameter store of the account
 * holds it at `/emi/accounts/telegram/bot-id`, and `infra/README.md` names it. The client secret
 * is the value nothing in this repository holds, and no browser needs it.
 */
export const THE_EMI_BOT_ID = '9068004348';

/** The one scope Emi asks for, which returns a subject and three instants and nothing of her. */
export const THE_TELEGRAM_SCOPE = 'openid';

/** The page Telegram sends her back to, which is a relay and not a page she reads. */
export const WHERE_TELEGRAM_SENDS_HER_BACK = 'sign-in/telegram/';

/**
 * The one language the registered address carries. Telegram processes a login only for an address
 * registered in advance, and it matches the address rather than the page, so every language of the
 * site comes back through this one and the relay sends her on from there. A fourth language
 * therefore costs nothing in BotFather.
 */
export const THE_LANGUAGE_OF_THE_REGISTERED_ADDRESS: Language = 'en';

/** How many bytes the verifier is made of. 32 bytes is 256 bits. */
export const VERIFIER_BYTES = 32;

/** How many bytes the state value and the nonce are each made of. 16 bytes is 128 bits. */
export const STATE_BYTES = 16;

/**
 * The name a press keeps its three values under, with the language she is reading in after it.
 *
 * One entry for each language rather than one for the site. The relay reads the language out of
 * the state value and then reads the entry of that language, so a press made in one language
 * cannot be finished with what a press in another language kept.
 */
export const WHAT_SHE_STARTED_ENTRY = 'emi.signing-in.telegram';

/** What the state value joins its two halves with, which base 64 of an address never writes. */
const BESIDE_THE_LANGUAGE = '.';

export function theEntryFor(language: Language): string {
  return `${WHAT_SHE_STARTED_ENTRY}${BESIDE_THE_LANGUAGE}${language}`;
}

/** Why a return did not sign her in. It is read by a test and never written on the page. */
export type WhyItDidNotFinish =
  | 'nothingWasStarted'
  | 'theStateDidNotMatch'
  | 'telegramSaidNo'
  | 'noCodeCameBack'
  | 'theServiceRefused'
  | 'nothingReachedTheService';

/**
 * A return that did not sign her in, carrying the cause and nothing else. The code, the state and
 * the verifier never reach it: a message reaches a log, and this site writes nothing of hers
 * anywhere.
 */
export class TheTelegramSignInDidNotFinish extends Error {
  readonly because: WhyItDidNotFinish;

  constructor(because: WhyItDidNotFinish) {
    super(because);
    this.name = 'TheTelegramSignInDidNotFinish';
    this.because = because;
  }
}

/** What a press kept, so the return can prove it started the sign in it is finishing. */
export interface WhatSheStarted {
  readonly state: string;
  readonly verifier: string;
  readonly nonce: string;
  readonly language: Language;
}

/** What a finished sign in leaves: her tokens, and the language to send her on in. */
export interface WhereTheSignInLeavesHer {
  readonly tokens: TheTokensSheHolds;
  readonly language: Language;
}

/** How this module reaches the api and the pool. A test hands it one that answers nothing. */
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

/** A state value: the language she is reading in, and a value nobody can guess after it. */
export function aStateFor(language: Language): string {
  return `${language}${BESIDE_THE_LANGUAGE}${aValueNobodyCanGuess(STATE_BYTES)}`;
}

/** The language a state value carries, or nothing at all where it carries none of the three. */
export function theLanguageIn(state: string | null): Language | null {
  const named = (state ?? '').split(BESIDE_THE_LANGUAGE)[0] ?? '';

  return isLanguage(named) ? named : null;
}

/** The address Telegram registers and redirects to, which every language comes back through. */
export function whereTelegramSendsHerBack(origin: string): string {
  return `${origin}/${THE_LANGUAGE_OF_THE_REGISTERED_ADDRESS}/${WHERE_TELEGRAM_SENDS_HER_BACK}`;
}

/**
 * Where a press takes her, and what the press keeps.
 *
 * The scope is `openid` and nothing else, so the whole of what Telegram answers with is one
 * subject and three instants. The three other scopes Telegram offers return her name, her user
 * name, the address of her photograph, her verified telephone number and the right for the bot to
 * write to her, and Emi asks for none of them.
 */
export async function whereAPressTakesHer(language: Language, origin: string): Promise<string> {
  const started: WhatSheStarted = {
    state: aStateFor(language),
    verifier: aValueNobodyCanGuess(VERIFIER_BYTES),
    nonce: aValueNobodyCanGuess(STATE_BYTES),
    language,
  };

  const asked = new URLSearchParams({
    client_id: THE_EMI_BOT_ID,
    redirect_uri: whereTelegramSendsHerBack(origin),
    response_type: 'code',
    scope: THE_TELEGRAM_SCOPE,
    state: started.state,
    code_challenge: await theChallengeFor(started.verifier),
    code_challenge_method: 'S256',
  });

  theStore()?.setItem(theEntryFor(language), JSON.stringify(started));

  return `${WHERE_TELEGRAM_ASKS_HER}?${asked.toString()}`;
}

/** What the press kept, or nothing at all where the entry is absent or unreadable. */
export function whatSheStarted(language: Language): WhatSheStarted | null {
  const written = theStore()?.getItem(theEntryFor(language));

  if (written === null || written === undefined) {
    return null;
  }

  try {
    const read = JSON.parse(written) as Partial<WhatSheStarted>;

    return typeof read.state === 'string' &&
      typeof read.verifier === 'string' &&
      typeof read.nonce === 'string' &&
      read.language === language
      ? { state: read.state, verifier: read.verifier, nonce: read.nonce, language }
      : null;
  } catch {
    return null;
  }
}

export function forgetWhatSheStarted(language: Language): void {
  theStore()?.removeItem(theEntryFor(language));
}

/** What the sign in function answers with, read as far as this module reads it and no further. */
interface WhatTheFunctionSaid {
  readonly userName?: string;
  readonly answer?: string;
}

/** The one call this browser makes to the api: the code, the verifier, and the nonce it sent. */
async function whatTheFunctionAnswers(
  code: string,
  started: WhatSheStarted,
  how: HowItAsks,
): Promise<{ readonly userName: string; readonly answer: string }> {
  let answered: Response;

  try {
    answered = await how(WHERE_THE_SIGN_IN_FUNCTION_ANSWERS, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier: started.verifier, nonce: started.nonce }),
    });
  } catch {
    // A browser that reached nobody throws rather than answering, so this is the one place a lost
    // connection is told apart from a refusal.
    throw new TheTelegramSignInDidNotFinish('nothingReachedTheService');
  }

  const said = (await answered.json().catch(() => ({}))) as WhatTheFunctionSaid;

  if (!answered.ok || said.userName === undefined || said.answer === undefined) {
    throw new TheTelegramSignInDidNotFinish('theServiceRefused');
  }

  return { userName: said.userName, answer: said.answer };
}

/**
 * Her tokens, from the code Telegram sent her back with.
 *
 * The state is read before anything leaves the browser, and it is read twice: once for the
 * language it names, and once against the value the press of that language kept. A code sent to
 * the sign in function for a state this browser did not write would sign her in to whichever
 * account started that sign in, so nothing is sent at all.
 */
export async function theTokensSheCameBackWith(
  address: string,
  how: HowItAsks = fetch,
): Promise<WhereTheSignInLeavesHer> {
  const came = new URLSearchParams(address);
  const language = theLanguageIn(came.get('state'));

  if (language === null) {
    throw new TheTelegramSignInDidNotFinish('theStateDidNotMatch');
  }

  const started = whatSheStarted(language);

  if (started === null) {
    throw new TheTelegramSignInDidNotFinish('nothingWasStarted');
  }

  if (came.get('state') !== started.state) {
    throw new TheTelegramSignInDidNotFinish('theStateDidNotMatch');
  }

  if (came.get('error') !== null) {
    throw new TheTelegramSignInDidNotFinish('telegramSaidNo');
  }

  const code = came.get('code');

  if (code === null || code === '') {
    throw new TheTelegramSignInDidNotFinish('noCodeCameBack');
  }

  const said = await whatTheFunctionAnswers(code, started, how);

  try {
    return {
      tokens: await signInWithTheOneTimeAnswer(said.userName, said.answer, how),
      language,
    };
  } catch (problem) {
    // Every way the pool can refuse the one time answer leaves her doing the same thing, which is
    // pressing again, so the refusals are read as one outcome. A connection that went is the one
    // the module tells apart, the same as it does on the call to the api above.
    throw new TheTelegramSignInDidNotFinish(
      problem instanceof ASignInProblem && problem.because === 'nothingReachedTheService'
        ? 'nothingReachedTheService'
        : 'theServiceRefused',
    );
  }
}
