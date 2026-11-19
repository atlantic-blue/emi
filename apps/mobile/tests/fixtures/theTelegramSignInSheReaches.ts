import { THE_POOL_HOST, WHERE_THE_SIGN_IN_FUNCTION_ANSWERS } from '@emi/sign-in';

/**
 * A stand in for the sign in function of the api and for the custom sign in of the pool, put where
 * the phone's own `fetch` is. Nothing here reaches the network, Telegram or the pool.
 */

/** One call the stand in was given. `call` is the call of the pool, empty for the api. */
export interface ACallThatWentOut {
  readonly where: string;
  readonly call: string;
  readonly body: Readonly<Record<string, unknown>>;
}

/** The refresh token the stand in hands back. It is made up and opens nothing. */
export const theRefreshTokenTelegramHandsBack = 'a-refresh-token-made-up-for-telegram';

export const theUserNameOfThePool = 'tg_7Z8K2PQR4MNWXYVB3HJ5CD6TFG';

export const theOneTimeAnswer = 'an-answer-good-for-one-challenge';

interface WhatItSays {
  readonly status: number;
  readonly said: Readonly<Record<string, unknown>>;
}

interface TheStandIn {
  readonly went: ACallThatWentOut[];
  /** Answers the challenge as the pool does for an answer already spent. */
  readonly refuseTheAnswer: () => void;
}

function answerTo(where: string, call: string, isTheAnswerRefused: boolean): WhatItSays {
  if (where === WHERE_THE_SIGN_IN_FUNCTION_ANSWERS) {
    return { status: 200, said: { userName: theUserNameOfThePool, answer: theOneTimeAnswer } };
  }

  if (call === 'InitiateAuth') {
    return {
      status: 200,
      said: { ChallengeName: 'CUSTOM_CHALLENGE', Session: 'a-session-the-pool-made' },
    };
  }

  if (call === 'RespondToAuthChallenge' && !isTheAnswerRefused) {
    return {
      status: 200,
      said: {
        AuthenticationResult: {
          IdToken: 'an-id-token',
          AccessToken: 'an-access-token',
          RefreshToken: theRefreshTokenTelegramHandsBack,
        },
      },
    };
  }

  return {
    status: 400,
    said: { __type: 'NotAuthorizedException', message: 'Incorrect username or password.' },
  };
}

/** Puts the stand in where `fetch` is, for the test that calls it. */
export function theTelegramSignInSheReaches(): TheStandIn {
  const went: ACallThatWentOut[] = [];
  let isTheAnswerRefused = false;

  jest.spyOn(globalThis, 'fetch').mockImplementation(async (where, asked) => {
    const address = String(where);

    if (address !== WHERE_THE_SIGN_IN_FUNCTION_ANSWERS && address !== THE_POOL_HOST) {
      throw new Error(`the stand in was asked for ${address}, which it does not answer`);
    }

    const headers = (asked?.headers ?? {}) as Readonly<Record<string, string>>;
    const call = (headers['x-amz-target'] ?? '').split('.').pop() ?? '';
    const body = JSON.parse(String(asked?.body)) as Readonly<Record<string, unknown>>;

    went.push({ where: address, call, body });

    const { status, said } = answerTo(address, call, isTheAnswerRefused);

    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => Promise.resolve(said),
    } as unknown as Response);
  });

  return {
    went,
    refuseTheAnswer: () => {
      isTheAnswerRefused = true;
    },
  };
}
