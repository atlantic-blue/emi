import { THE_POOL_HOST } from '@emi/sign-in';

/**
 * A stand in for Amazon Cognito, put where the phone's own `fetch` is. Nothing here reaches the
 * network, and no user is made in the pool. The answers are the shapes the service documents, and
 * the shapes `packages/sign-in` reads.
 */

/** One call the stand in was given, kept so a test can read what really went out. */
export interface ACallThatWentOut {
  readonly call: string;
  readonly body: Readonly<Record<string, unknown>>;
}

/** The six digit code that confirms a sign up, which is the one the stand in takes. */
export const theRightCode = '482913';

/** A code of the right length that the stand in refuses as wrong. */
export const aWrongCode = '111111';

/** The refresh token the stand in hands back. It is made up and opens nothing. */
export const theRefreshTokenItHandsBack = 'a-refresh-token-made-up-for-the-test';

/** The refresh token the stand in rotates to, which a refresh hands back in place of the one above. */
export const theRefreshTokenARefreshRotatesTo = 'a-rotated-refresh-token-made-up-for-the-test';

interface WhatItSays {
  readonly status: number;
  readonly said: Readonly<Record<string, unknown>>;
}

const took = (said: Readonly<Record<string, unknown>>): WhatItSays => ({ status: 200, said });

const refused = (type: string): WhatItSays => ({
  status: 400,
  said: { __type: `com.amazon.coral.service#${type}`, message: '' },
});

/** The eight digit code that signs in an address the pool already holds an account for. */
export const theRightSignInCode = '48291357';

const herTokens = took({
  AuthenticationResult: {
    IdToken: 'an-id-token',
    AccessToken: 'an-access-token',
    RefreshToken: theRefreshTokenItHandsBack,
  },
});

/** How the pool is set up for one test, which is what makes its answers differ. */
interface HowThePoolIsSet {
  readonly hasAnAccount: boolean;
  readonly rotates: boolean;
  readonly acceptsTheToken: boolean;
}

function answerTo(
  call: string,
  body: Readonly<Record<string, unknown>>,
  set: HowThePoolIsSet,
): WhatItSays {
  if (call === 'SignUp') {
    return took({ UserConfirmed: false, Session: 'the-sign-up-session' });
  }

  if (call === 'ConfirmSignUp') {
    if (body.ConfirmationCode !== theRightCode) {
      return refused('CodeMismatchException');
    }

    return set.hasAnAccount
      ? refused('AliasExistsException')
      : took({ Session: 'the-confirmed-session' });
  }

  if (call === 'InitiateAuth') {
    return body.Session === undefined
      ? took({ ChallengeName: 'EMAIL_OTP', Session: 'the-sign-in-session' })
      : herTokens;
  }

  if (call === 'GetTokensFromRefreshToken') {
    if (!set.acceptsTheToken || body.RefreshToken !== theRefreshTokenItHandsBack) {
      return refused('NotAuthorizedException');
    }

    return took({
      AuthenticationResult: {
        IdToken: 'a-refreshed-id-token',
        AccessToken: 'a-refreshed-access-token',
        ...(set.rotates ? { RefreshToken: theRefreshTokenARefreshRotatesTo } : {}),
      },
    });
  }

  if (call === 'RespondToAuthChallenge') {
    const responses = body.ChallengeResponses as Readonly<Record<string, unknown>> | undefined;

    return responses?.EMAIL_OTP_CODE === theRightSignInCode
      ? herTokens
      : refused('CodeMismatchException');
  }

  return refused('InvalidParameterException');
}

interface TheStandIn {
  /** Every call that went out, in order. */
  readonly went: ACallThatWentOut[];
  /** Holds every answer back until `letItAnswer` is called, so a test can press twice meanwhile. */
  readonly holdTheAnswers: () => void;
  readonly letItAnswer: () => void;
  /** Answers every call as a phone with no connection does, by throwing. */
  readonly loseTheConnection: () => void;
  /** Answers the confirmation as the pool does for an address that already has an account. */
  readonly holdAnAccountForTheAddress: () => void;
  /** Hands back a new refresh token on a refresh, as a client with rotation on does. */
  readonly rotateTheRefreshToken: () => void;
  /** Refuses the refresh token, as the pool does for one that is expired, replaced or revoked. */
  readonly stopAcceptingTheRefreshToken: () => void;
}

/** Puts the stand in where `fetch` is, for the test that calls it. */
export function theCognitoSheReaches(): TheStandIn {
  const went: ACallThatWentOut[] = [];
  let isHeld = false;
  let isOffline = false;
  let hasAnAccount = false;
  let rotates = false;
  let acceptsTheToken = true;
  const held: (() => void)[] = [];

  const how = async (where: unknown, asked?: RequestInit): Promise<Response> => {
    if (where !== THE_POOL_HOST) {
      throw new Error(`the stand in was asked for ${String(where)}, which is not the pool`);
    }

    const headers = (asked?.headers ?? {}) as Readonly<Record<string, string>>;
    const call = (headers['x-amz-target'] ?? '').split('.').pop() ?? '';
    const body = JSON.parse(String(asked?.body)) as Readonly<Record<string, unknown>>;

    went.push({ call, body });

    if (isOffline) {
      throw new TypeError('Network request failed');
    }

    if (isHeld) {
      // The real service answers a cancelled request by raising, so a call with a deadline on it
      // has to be able to run out here. A double that answered anyway would make a timeout
      // untestable and the suite green over a phone that waits forever.
      await new Promise<void>((resolve, reject) => {
        const signal = asked?.signal;

        held.push(resolve);
        signal?.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
      });
    }

    const { status, said } = answerTo(call, body, { hasAnAccount, rotates, acceptsTheToken });

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => Promise.resolve(said),
    } as unknown as Response;
  };

  jest.spyOn(globalThis, 'fetch').mockImplementation(how);

  return {
    went,
    holdTheAnswers: () => {
      isHeld = true;
    },
    letItAnswer: () => {
      isHeld = false;
      held.splice(0).forEach((resolve) => resolve());
    },
    loseTheConnection: () => {
      isOffline = true;
    },
    holdAnAccountForTheAddress: () => {
      hasAnAccount = true;
    },
    rotateTheRefreshToken: () => {
      rotates = true;
    },
    stopAcceptingTheRefreshToken: () => {
      acceptsTheToken = false;
    },
  };
}
