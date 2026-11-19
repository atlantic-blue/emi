import { WHERE_THE_POOL_EXCHANGES_A_CODE } from '@emi/sign-in';

/**
 * A stand in for the token endpoint of the pool, put where the phone's own `fetch` is. Nothing here
 * reaches the network, Apple, Google or the pool.
 */

/** One exchange the stand in was given, with its form body read as its parts. */
export interface AnExchangeThatWentOut {
  readonly where: string;
  readonly contentType: string;
  readonly body: Readonly<Record<string, string>>;
}

/** The refresh token the stand in hands back. It is made up and opens nothing. */
export const theRefreshTokenThePoolHandsBack = 'a-refresh-token-made-up-for-apple-and-google';

export const theAddressTheProviderVouchedFor = 'julia@example.com';

function asAnAddressCarriesIt(text: string): string {
  return Buffer.from(text, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** An id token with the claims it is handed. It is signed by nobody and opens nothing. */
export function anIdTokenCarrying(claims: Readonly<Record<string, unknown>>): string {
  return [
    asAnAddressCarriesIt(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    asAnAddressCarriesIt(JSON.stringify({ sub: 'a-made-up-subject', ...claims })),
    'a-made-up-signature',
  ].join('.');
}

type HowItAnswers =
  | { readonly kind: 'tokens'; readonly idToken: string }
  | { readonly kind: 'refusal' }
  | { readonly kind: 'nobody' };

interface TheStandIn {
  readonly went: AnExchangeThatWentOut[];
  /** Answers the exchange as the pool does for a code it will not take. */
  readonly refuseTheCode: () => void;
  /** Throws as a phone with no connection does. */
  readonly reachNobody: () => void;
  /** Hands back an id token with these claims in place of one that carries her address. */
  readonly handBackAnIdTokenCarrying: (claims: Readonly<Record<string, unknown>>) => void;
}

/** Puts the stand in where `fetch` is, for the test that calls it. */
export function theProviderSignInSheReaches(): TheStandIn {
  const went: AnExchangeThatWentOut[] = [];
  let answers: HowItAnswers = {
    kind: 'tokens',
    idToken: anIdTokenCarrying({ email: theAddressTheProviderVouchedFor }),
  };

  jest.spyOn(globalThis, 'fetch').mockImplementation(async (where, asked) => {
    const address = String(where);

    if (address !== WHERE_THE_POOL_EXCHANGES_A_CODE) {
      throw new Error(`the stand in was asked for ${address}, which it does not answer`);
    }

    const headers = (asked?.headers ?? {}) as Readonly<Record<string, string>>;

    went.push({
      where: address,
      contentType: headers['content-type'] ?? '',
      body: Object.fromEntries(new URLSearchParams(String(asked?.body))),
    });

    if (answers.kind === 'nobody') {
      throw new TypeError('Network request failed');
    }

    const said =
      answers.kind === 'tokens'
        ? {
            id_token: answers.idToken,
            access_token: 'an-access-token',
            refresh_token: theRefreshTokenThePoolHandsBack,
          }
        : { error: 'invalid_grant' };
    const status = answers.kind === 'tokens' ? 200 : 400;

    return Promise.resolve({
      ok: status === 200,
      status,
      json: async () => Promise.resolve(said),
    } as unknown as Response);
  });

  return {
    went,
    refuseTheCode: () => {
      answers = { kind: 'refusal' };
    },
    reachNobody: () => {
      answers = { kind: 'nobody' };
    },
    handBackAnIdTokenCarrying: (claims) => {
      answers = { kind: 'tokens', idToken: anIdTokenCarrying(claims) };
    },
  };
}
