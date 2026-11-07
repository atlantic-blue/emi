/**
 * The conversation myemi.app has with Amazon Cognito when a woman signs in with a code sent to her
 * email address.
 *
 * Three calls and nothing else. One makes the user if the address has none, one asks for the code,
 * and one answers it. The pool holds her address and a subject. It holds no vault key, no day and
 * no account identifier, so nothing here can open a record: the recovery code is still the only
 * thing that wraps the vault key, and `docs/design/accounts.md` says so.
 *
 * The pool lists PASSWORD as a first factor because the service refuses a list that leaves it out.
 * No screen of Emi asks for one, this module never sends one, and the website client allows no
 * password flow, so the factor has nothing to accept.
 *
 * The two identifiers below are public. Each one travels in every request a browser makes, and the
 * website client is made with no client secret, so neither is a secret and this repository holds
 * none.
 *
 * What is proved, and what is not. Every path below is driven end to end in
 * `test/theSignIn.test.ts` against a stub of the service, because the pool cannot send an email
 * yet: steps 28.8 to 28.10 connect it to the myemi.app sender. The shapes here are the shapes the
 * service documents. Nobody has read a real answer from the live pool with this code.
 */

/** The region the pool and the vault both run in. */
export const THE_POOL_REGION = 'eu-central-1';

/** The pool every way into the account goes through. */
export const THE_POOL_ID = 'eu-central-1_KZWW91L98';

/** The client myemi.app signs in with, which is made with no client secret. */
export const THE_WEBSITE_CLIENT_ID = '2enb4g3qtp6urb099srdq749o6';

/**
 * The one host this module reaches, which is the one host the content policy allows it.
 *
 * Written out whole rather than built from the region, so a reader of this file and a reader of
 * the policy see the same characters, and the check that refuses a host of another company can
 * read it. The test holds it against the region beside it.
 */
export const THE_POOL_HOST = 'https://cognito-idp.eu-central-1.amazonaws.com';

/** How the service reads a body. */
const THE_BODY_KIND = 'application/x-amz-json-1.1';

/** How a call is named inside a request, which is the service and then the call. */
const THE_SERVICE = 'AWSCognitoIdentityProviderService';

/**
 * The factor she signs in with. The pool offers PASSWORD and EMAIL_OTP, and this module asks for
 * the code every time, so the other factor is never reached.
 */
const THE_CODE_FACTOR = 'EMAIL_OTP';

/** The flow a one time code travels in, which is the only flow either client allows. */
const THE_CHOICE_FLOW = 'USER_AUTH';

/** How long the code is good for, which is the session the client is given. */
export const THE_CODE_LASTS_MINUTES = 15;

/** How many digits the code has, which is what the field takes and what the words promise. */
export const THE_CODE_IS_THIS_LONG = 6;

/**
 * How long a username is, in characters. The username carries nothing about her: the account
 * identifier of the vault may not appear in the pool, and her address is the alias she types.
 */
const A_USERNAME_IS_THIS_LONG = 26;

/** The letters a username is written in: Crockford base 32, which has no I, L, O or U. */
const THE_USERNAME_LETTERS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** What a reader is told when a sign in does not go through. One cause, one sentence. */
export type WhatWentWrong =
  'theCodeIsWrong' | 'theCodeHasExpired' | 'tooManyTries' | 'nothingReachedTheService';

/**
 * A sign in that did not go through, carrying the cause and nothing else.
 *
 * The address, the code and the session never reach it, because a message reaches a log and this
 * site writes nothing of hers anywhere. Where the service leaves her session open to answer the
 * same box again, the new session travels here too, and it is a value the service made rather than
 * anything she typed.
 */
export class ASignInProblem extends Error {
  readonly because: WhatWentWrong;

  /** The session to answer the next code with, where the service left one open. */
  readonly tryAgainWith: string | undefined;

  constructor(because: WhatWentWrong, tryAgainWith?: string) {
    super(because);
    this.name = 'ASignInProblem';
    this.because = because;
    this.tryAgainWith = tryAgainWith;
  }
}

/** What the service hands back when she answers the code. */
export interface TheTokensSheHolds {
  readonly idToken: string;
  readonly accessToken: string;
  readonly refreshToken: string;
}

/** Where she is between asking for a code and answering it. */
export interface TheCodeSheWaitsFor {
  readonly address: string;
  readonly session: string;
}

/** How this module reaches the service. A test hands it one that answers without a network. */
export type HowItAsks = typeof fetch;

/** What the service answers with, read as far as this module reads it and no further. */
interface WhatTheServiceSaid {
  readonly Session?: string;
  readonly ChallengeName?: string;
  readonly __type?: string;
  readonly message?: string;
  readonly AuthenticationResult?: {
    readonly IdToken?: string;
    readonly AccessToken?: string;
    readonly RefreshToken?: string;
  };
}

/** One answer: whether the service took the call, and what it said either way. */
interface TheAnswer {
  readonly took: boolean;
  readonly said: WhatTheServiceSaid;
}

/**
 * The name the service gives a refusal. It arrives either as `__type` or at the end of it, so the
 * part after the last hash or dot is the name.
 */
function theNameOfTheRefusal(said: WhatTheServiceSaid): string {
  return (said.__type ?? '').split(/[#.]/).pop() ?? '';
}

/**
 * Which sentence a refusal becomes.
 *
 * A session the service has closed reads as expired rather than as wrong, because the next thing
 * she does differs: she sends a new code instead of retyping the one she has.
 *
 * A refusal for a reason not listed here is read as too many tries, which is the one sentence that
 * is true of every remaining refusal: she waits a few minutes and sends a new code.
 */
function whatWentWrong(said: WhatTheServiceSaid): WhatWentWrong {
  const refusal = theNameOfTheRefusal(said);
  const sentence = (said.message ?? '').toLowerCase();

  if (refusal === 'CodeMismatchException') {
    return 'theCodeIsWrong';
  }

  if (refusal === 'ExpiredCodeException' || sentence.includes('expired')) {
    return 'theCodeHasExpired';
  }

  return 'tooManyTries';
}

/** One call to the service, with the call named the way the service names it. */
async function ask(
  how: HowItAsks,
  call: string,
  body: Readonly<Record<string, unknown>>,
): Promise<TheAnswer> {
  let answer: Response;

  try {
    answer = await how(THE_POOL_HOST, {
      method: 'POST',
      headers: { 'content-type': THE_BODY_KIND, 'x-amz-target': `${THE_SERVICE}.${call}` },
      body: JSON.stringify(body),
    });
  } catch {
    // A browser that reached nobody throws rather than answering, so this is the one place a lost
    // connection is told apart from a refusal.
    throw new ASignInProblem('nothingReachedTheService');
  }

  const said = (await answer.json().catch(() => ({}))) as WhatTheServiceSaid;

  return { took: answer.ok, said };
}

/** A username of the length above, from the random source of the platform. */
export function aUsername(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(A_USERNAME_IS_THIS_LONG));

  return [...bytes]
    .map((byte) => THE_USERNAME_LETTERS[byte % THE_USERNAME_LETTERS.length] ?? '0')
    .join('');
}

/**
 * The user behind an address, made where the address has none.
 *
 * The pool answers the same way whether or not an address has an account, so this module cannot
 * ask it and has to try. A try that comes back with the address already taken is the ordinary case
 * of a woman who has signed in before, and it is read as nothing happening at all.
 *
 * No password is sent, because the pool carries a one time code as a first factor and there is no
 * password anywhere in Emi. The address is written as the one attribute the client may write, and
 * the service marks it verified the first time she answers a code.
 */
async function makeHerUserIfSheHasNone(how: HowItAsks, address: string): Promise<void> {
  const { took, said } = await ask(how, 'SignUp', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    Username: aUsername(),
    UserAttributes: [{ Name: 'email', Value: address }],
  });

  if (took || theNameOfTheRefusal(said) === 'UsernameExistsException') {
    return;
  }

  throw new ASignInProblem(whatWentWrong(said));
}

/**
 * The code, sent to the address she typed.
 *
 * A new address and an address she has used before both end here, holding a session and waiting
 * for six digits. Nothing in the answer says which of the two she was, and nothing the page draws
 * afterwards says it either.
 */
export async function askForACode(
  address: string,
  how: HowItAsks = fetch,
): Promise<TheCodeSheWaitsFor> {
  await makeHerUserIfSheHasNone(how, address);

  const { took, said } = await ask(how, 'InitiateAuth', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    AuthFlow: THE_CHOICE_FLOW,
    AuthParameters: { USERNAME: address, PREFERRED_CHALLENGE: THE_CODE_FACTOR },
  });

  if (!took) {
    throw new ASignInProblem(whatWentWrong(said));
  }

  if (said.ChallengeName !== THE_CODE_FACTOR || said.Session === undefined) {
    throw new ASignInProblem('tooManyTries');
  }

  return { address, session: said.Session };
}

/**
 * Her tokens, from the six digits she typed.
 *
 * The service hands back a fresh session with a refusal she may answer again, and that session
 * replaces the one she was holding. A page that kept the old one would answer with a session the
 * service has already closed, and read the answer as a second wrong code.
 */
export async function signInWithTheCode(
  waiting: TheCodeSheWaitsFor,
  code: string,
  how: HowItAsks = fetch,
): Promise<TheTokensSheHolds> {
  const { took, said } = await ask(how, 'RespondToAuthChallenge', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    ChallengeName: THE_CODE_FACTOR,
    Session: waiting.session,
    ChallengeResponses: { USERNAME: waiting.address, EMAIL_OTP_CODE: code },
  });

  if (!took) {
    throw new ASignInProblem(whatWentWrong(said), said.Session);
  }

  const held = said.AuthenticationResult;

  if (
    held?.IdToken === undefined ||
    held.AccessToken === undefined ||
    held.RefreshToken === undefined
  ) {
    throw new ASignInProblem('tooManyTries');
  }

  return { idToken: held.IdToken, accessToken: held.AccessToken, refreshToken: held.RefreshToken };
}

/**
 * The end of a sign in. The refresh token is the one that outlives the window, so it is the one
 * the service is asked to revoke. A sign out that only forgot the tokens would leave a token
 * working for thirty days on whatever had read it.
 */
export async function signOut(refreshToken: string, how: HowItAsks = fetch): Promise<void> {
  const { took, said } = await ask(how, 'RevokeToken', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    Token: refreshToken,
  });

  if (!took) {
    throw new ASignInProblem(whatWentWrong(said));
  }
}
