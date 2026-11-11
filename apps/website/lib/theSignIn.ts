/**
 * The conversation myemi.app has with Amazon Cognito when a woman signs in with a code sent to her
 * email address.
 *
 * One email reaches her for one sign in. The service decides which of its two codes that is, and
 * the two are not the same length: a sign up is confirmed with six digits, and a sign in with an
 * email one time password takes eight. So the box she types into is as long as the code she was
 * actually sent, and the words beside it name no number.
 *
 * Her first sign in is the passwordless sign up of the service. `SignUp` makes her user and sends
 * the one email. `ConfirmSignUp` takes the code she types and hands back a session. `InitiateAuth`
 * takes that session and hands back her tokens, and the service asks for no second code because
 * the session is the proof she already gave.
 *
 * A woman who has signed in before cannot be told apart from a new one before that first email
 * goes out. The pool carries her address as an alias, so `SignUp` on an address that already has
 * an account is answered the same way as `SignUp` on a new one, which is what stops anybody
 * testing who uses Emi. The two part company at `ConfirmSignUp`, which refuses with
 * `AliasExistsException`, and only for somebody who typed the right code. So the page learns which
 * she was from her, never from the service, and a reader who cannot read her email learns nothing.
 * That refusal sends her a sign in code of eight digits and leaves her on the same box.
 *
 * The pool holds her address and a subject. It holds no vault key, no day and no account
 * identifier, so nothing here can open a record: the recovery code is still the only thing that
 * wraps the vault key, and `docs/design/accounts.md` says so.
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
 * `test/theSignIn.test.ts` against a stub of the service, and the shapes are the shapes the
 * service documents. The one answer read from the live pool is the one for an address that has no
 * user: the service hands back a whole email one time password challenge and sends no email, which
 * is why no call here can tell a new address from a known one.
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

/**
 * How many digits the code that confirms a sign up has. The service fixes this number and no
 * setting of the pool moves it.
 */
export const THE_SIGN_UP_CODE_IS_THIS_LONG = 6;

/**
 * How many digits the code that signs her in has. The service fixes this one too, at a different
 * number from the one above, which is why the box cannot be one fixed width.
 */
export const THE_SIGN_IN_CODE_IS_THIS_LONG = 8;

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

/** How many digits the box takes, which is one of the two numbers the service sends. */
export type HowLongTheCodeIs =
  typeof THE_SIGN_UP_CODE_IS_THIS_LONG | typeof THE_SIGN_IN_CODE_IS_THIS_LONG;

/** Which of the two codes she is holding, and so which call answers it. */
export type WhichCodeSheHolds = 'theSignUpCode' | 'theSignInCode';

/** Where she is between asking for a code and answering it. */
export interface TheCodeSheWaitsFor {
  /** The address she typed, which the page writes back to her and the service signs her in by. */
  readonly address: string;

  /**
   * The name the service knows her new user by, which only a sign up code needs. The service
   * refuses an unverified address as a name, so the confirmation names this instead.
   */
  readonly username: string;

  readonly session: string;
  readonly digits: HowLongTheCodeIs;
  readonly answers: WhichCodeSheHolds;
}

/** What answering a code leaves her with: her tokens, or one more code on its way to her. */
export type WhatTheCodeLeftHerWith =
  | { readonly kind: 'sheIsSignedIn'; readonly held: TheTokensSheHolds }
  | { readonly kind: 'anotherCodeIsOnItsWay'; readonly waitsFor: TheCodeSheWaitsFor };

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

/** The three tokens out of an answer, or a problem where the answer carried fewer than three. */
function theTokensIn(said: WhatTheServiceSaid): TheTokensSheHolds {
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
 * The code, sent to the address she typed.
 *
 * One call, so one email. No password is sent, because the pool carries a one time code as a first
 * factor and there is no password anywhere in Emi. The address is written as the one attribute the
 * client may write, and the service marks it verified when she answers the code.
 *
 * The answer says nothing about whether the address had an account, and nothing the page draws
 * afterwards says it either.
 */
export async function askForACode(
  address: string,
  how: HowItAsks = fetch,
): Promise<TheCodeSheWaitsFor> {
  const username = aUsername();
  const { took, said } = await ask(how, 'SignUp', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    Username: username,
    UserAttributes: [{ Name: 'email', Value: address }],
  });

  if (!took) {
    throw new ASignInProblem(whatWentWrong(said));
  }

  return {
    address,
    username,
    // The service hands back a session only where it can sign her in off the confirmation. Without
    // one she is confirmed first and sent a sign in code after, which the next function does.
    session: said.Session ?? '',
    digits: THE_SIGN_UP_CODE_IS_THIS_LONG,
    answers: 'theSignUpCode',
  };
}

/**
 * The sign in code, sent to an address the pool already holds an account for.
 *
 * This is the only call that sends a code of eight digits, and it is reached in two ways: the
 * confirmation above refusing an address that already has an account, and her pressing for a new
 * code while she is holding one of these.
 */
async function askForASignInCode(address: string, how: HowItAsks): Promise<TheCodeSheWaitsFor> {
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

  return {
    address,
    username: '',
    session: said.Session,
    digits: THE_SIGN_IN_CODE_IS_THIS_LONG,
    answers: 'theSignInCode',
  };
}

/**
 * One more code, on the address she is already waiting on.
 *
 * Which call sends it follows which code she is holding, so the press sends one email and the box
 * keeps the width it had.
 */
export async function sendHerAnotherCode(
  waiting: TheCodeSheWaitsFor,
  how: HowItAsks = fetch,
): Promise<TheCodeSheWaitsFor> {
  return waiting.answers === 'theSignInCode'
    ? askForASignInCode(waiting.address, how)
    : askForACode(waiting.address, how);
}

/**
 * Her tokens, from the digits she typed.
 *
 * A sign in code is answered in one call. A sign up code is answered in two: the confirmation, and
 * then the sign in that the session off the confirmation is the whole proof for, so she is never
 * asked for a second code.
 *
 * Where the confirmation refuses because the address already has an account, she is sent a sign in
 * code and left on the same box. That refusal reaches nobody who did not type the right code, so
 * it tells a reader of the page nothing it did not already know.
 */
export async function signInWithTheCode(
  waiting: TheCodeSheWaitsFor,
  code: string,
  how: HowItAsks = fetch,
): Promise<WhatTheCodeLeftHerWith> {
  if (waiting.answers === 'theSignInCode') {
    const { took, said } = await ask(how, 'RespondToAuthChallenge', {
      ClientId: THE_WEBSITE_CLIENT_ID,
      ChallengeName: THE_CODE_FACTOR,
      Session: waiting.session,
      ChallengeResponses: { USERNAME: waiting.address, EMAIL_OTP_CODE: code },
    });

    if (!took) {
      // The service hands back a fresh session with a refusal she may answer again, and a page
      // that kept the old one would answer with a session the service has already closed.
      throw new ASignInProblem(whatWentWrong(said), said.Session);
    }

    return { kind: 'sheIsSignedIn', held: theTokensIn(said) };
  }

  const confirmed = await ask(how, 'ConfirmSignUp', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    Username: waiting.username,
    ConfirmationCode: code,
    ...(waiting.session === '' ? {} : { Session: waiting.session }),
  });

  if (!confirmed.took) {
    if (theNameOfTheRefusal(confirmed.said) === 'AliasExistsException') {
      return {
        kind: 'anotherCodeIsOnItsWay',
        waitsFor: await askForASignInCode(waiting.address, how),
      };
    }

    // A refusal here closes no session, so she answers the next code with the one she holds.
    throw new ASignInProblem(whatWentWrong(confirmed.said));
  }

  if (confirmed.said.Session === undefined) {
    return {
      kind: 'anotherCodeIsOnItsWay',
      waitsFor: await askForASignInCode(waiting.address, how),
    };
  }

  const { took, said } = await ask(how, 'InitiateAuth', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    AuthFlow: THE_CHOICE_FLOW,
    AuthParameters: { USERNAME: waiting.username },
    Session: confirmed.said.Session,
  });

  if (!took) {
    throw new ASignInProblem(whatWentWrong(said));
  }

  return { kind: 'sheIsSignedIn', held: theTokensIn(said) };
}

/**
 * The flow a one time answer travels in, which the Telegram sign in is the one reader of. The
 * pool authenticates nobody here: the sign in function of the api authenticates her against
 * Telegram, and this flow turns that into tokens of the pool.
 */
const THE_CUSTOM_FLOW = 'CUSTOM_AUTH';

/** The one challenge the three triggers of the pool issue, which asks her nothing. */
const THE_CUSTOM_CHALLENGE = 'CUSTOM_CHALLENGE';

/**
 * Her tokens, from a user name and one answer the sign in function of the api made.
 *
 * Two calls. The first starts the custom flow and the pool answers with the challenge and a
 * session. The second answers the challenge, and the verify trigger spends the answer by deleting
 * the item its digest names.
 *
 * She types nothing here and holds nothing she has to remember. The answer is good for one
 * challenge inside two minutes, so a refusal means the two minutes passed or the answer was
 * already spent, and in both of those the next thing she does is press again.
 */
export async function signInWithTheOneTimeAnswer(
  userName: string,
  oneTimeAnswer: string,
  how: HowItAsks = fetch,
): Promise<TheTokensSheHolds> {
  const started = await ask(how, 'InitiateAuth', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    AuthFlow: THE_CUSTOM_FLOW,
    AuthParameters: { USERNAME: userName, CHALLENGE_NAME: THE_CUSTOM_CHALLENGE },
  });

  if (!started.took) {
    throw new ASignInProblem(whatWentWrong(started.said));
  }

  if (started.said.ChallengeName !== THE_CUSTOM_CHALLENGE || started.said.Session === undefined) {
    throw new ASignInProblem('tooManyTries');
  }

  const answered = await ask(how, 'RespondToAuthChallenge', {
    ClientId: THE_WEBSITE_CLIENT_ID,
    ChallengeName: THE_CUSTOM_CHALLENGE,
    Session: started.said.Session,
    ChallengeResponses: { USERNAME: userName, ANSWER: oneTimeAnswer },
  });

  if (!answered.took) {
    throw new ASignInProblem(whatWentWrong(answered.said));
  }

  const held = answered.said.AuthenticationResult;

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
