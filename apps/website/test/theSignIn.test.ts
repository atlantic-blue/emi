import {
  ASignInProblem,
  THE_CODE_IS_THIS_LONG,
  THE_POOL_HOST,
  THE_POOL_ID,
  THE_POOL_REGION,
  THE_WEBSITE_CLIENT_ID,
  aUsername,
  askForACode,
  signInWithTheCode,
  signOut,
} from '../lib/theSignIn';

/**
 * The sign in, driven end to end against a stub of Amazon Cognito.
 *
 * It is a stub and not the live pool on purpose. The pool cannot send an email until steps 28.8 to
 * 28.10 connect it to the myemi.app sender, so a run against the live pool would prove that an
 * email did not arrive and nothing else. The stub answers the shapes the service documents, one
 * call at a time, and every path a reader can take is driven through it.
 *
 * The two paths that matter most are the new address and the address she has used before. The pool
 * answers the same way for both, so this reads the calls that went out and asserts that the two
 * runs are the same two calls, carrying no sign of which she was.
 */

/** One call the stub was given, kept so a case can read what really went out. */
interface ACallThatWentOut {
  readonly call: string;
  readonly body: Record<string, unknown>;
}

/** What the stub answers one call with: the status, and the body the service would write. */
interface AnAnswer {
  readonly status: number;
  readonly said: Record<string, unknown>;
}

/** A service that is not there at all, which is a browser that reached nobody. */
const NOTHING_IS_THERE = Symbol('nothing is there');

type WhatTheStubDoes = AnAnswer | typeof NOTHING_IS_THERE;

/** The stub: a queue of answers, and the record of every call that was made. */
function aService(answers: readonly WhatTheStubDoes[]) {
  const went: ACallThatWentOut[] = [];
  const left = [...answers];

  const how: typeof fetch = async (where, asked) => {
    const headers = new Headers(asked?.headers);
    const named = headers.get('x-amz-target') ?? '';

    expect(where).toBe(THE_POOL_HOST);
    expect(asked?.method).toBe('POST');
    expect(headers.get('content-type')).toBe('application/x-amz-json-1.1');

    went.push({
      call: named.split('.').pop() ?? '',
      body: JSON.parse(String(asked?.body)) as Record<string, unknown>,
    });

    const next = left.shift();

    if (next === undefined) {
      throw new Error(`The stub was asked for ${named} and had no answer left.`);
    }

    if (next === NOTHING_IS_THERE) {
      throw new TypeError('Failed to fetch');
    }

    return new Response(JSON.stringify(next.said), { status: next.status });
  };

  return { how, went, whatIsLeft: () => left.length };
}

/** The answer the service gives when a call went through and it has nothing to add. */
const took = (said: Record<string, unknown>): AnAnswer => ({ status: 200, said });

/** The answer the service gives when it refuses a call, which is a status and a named refusal. */
const refused = (type: string, message = ''): AnAnswer => ({
  status: 400,
  said: { __type: `com.amazon.coral.service#${type}`, message },
});

/** The challenge the service hands back when the code is on its way to her address. */
const theCodeIsOnItsWay = (session: string) =>
  took({ ChallengeName: 'EMAIL_OTP', Session: session, ChallengeParameters: {} });

/** The tokens the service hands back when she answered the code. */
const theTokens = took({
  AuthenticationResult: {
    IdToken: 'an-id-token',
    AccessToken: 'an-access-token',
    RefreshToken: 'a-refresh-token',
  },
});

const HER_ADDRESS = 'iuliia@example.com';

const SIX_DIGITS = '482913';

describe('a woman signs in to myemi.app with a code sent to her address', () => {
  describe('the pool the site signs her in to', () => {
    it('is the live pool, in the region the vault runs in, with a client that keeps no secret', () => {
      expect({ pool: THE_POOL_ID, region: THE_POOL_REGION, host: THE_POOL_HOST }).toEqual({
        pool: 'eu-central-1_KZWW91L98',
        region: 'eu-central-1',
        host: 'https://cognito-idp.eu-central-1.amazonaws.com',
      });
      expect(THE_WEBSITE_CLIENT_ID).toBe('2enb4g3qtp6urb099srdq749o6');
      // The host is written out whole, so this is what keeps it and the region together.
      expect(THE_POOL_HOST).toBe(`https://cognito-idp.${THE_POOL_REGION}.amazonaws.com`);
      expect(THE_POOL_ID.startsWith(`${THE_POOL_REGION}_`)).toBe(true);
    });

    it('writes a username that carries nothing of her, and a different one every time', () => {
      const one = aUsername();
      const other = aUsername();

      expect(one).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
      expect(one).not.toBe(other);
      expect(one.toLowerCase()).not.toContain('iuliia');
    });
  });

  describe('she asks for a code', () => {
    it('sends a code to an address that has never signed in, and leaves her waiting for it', async () => {
      const service = aService([took({ UserSub: 'a-subject' }), theCodeIsOnItsWay('a-session')]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      expect(waiting).toEqual({ address: HER_ADDRESS, session: 'a-session' });
      expect(service.went.map((each) => each.call)).toEqual(['SignUp', 'InitiateAuth']);
      expect(service.whatIsLeft()).toBe(0);
    });

    it('sends a code to an address that has signed in before, and leaves her in the same place', async () => {
      const service = aService([
        refused('UsernameExistsException'),
        theCodeIsOnItsWay('a-session'),
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      expect(waiting).toEqual({ address: HER_ADDRESS, session: 'a-session' });
      expect(service.went.map((each) => each.call)).toEqual(['SignUp', 'InitiateAuth']);
    });

    it('makes the same two calls for a new address and a known one, so neither can be told from the other', async () => {
      const brandNew = aService([took({ UserSub: 'a-subject' }), theCodeIsOnItsWay('one')]);
      const knownAlready = aService([refused('UsernameExistsException'), theCodeIsOnItsWay('two')]);

      await askForACode(HER_ADDRESS, brandNew.how);
      await askForACode(HER_ADDRESS, knownAlready.how);

      const withoutTheUsername = (went: ACallThatWentOut[]) =>
        went.map(({ call, body }) => ({ call, body: { ...body, Username: 'a-username' } }));

      expect(withoutTheUsername(brandNew.went)).toEqual(withoutTheUsername(knownAlready.went));
    });

    it('asks for the code factor and never for a password', async () => {
      const service = aService([took({}), theCodeIsOnItsWay('a-session')]);

      await askForACode(HER_ADDRESS, service.how);

      const [signUp, started] = service.went;

      expect(signUp?.body).not.toHaveProperty('Password');
      expect(signUp?.body.UserAttributes).toEqual([{ Name: 'email', Value: HER_ADDRESS }]);
      expect(started?.body).toEqual({
        ClientId: THE_WEBSITE_CLIENT_ID,
        AuthFlow: 'USER_AUTH',
        AuthParameters: { USERNAME: HER_ADDRESS, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
      });
      expect(JSON.stringify(service.went)).not.toContain('PASSWORD');
    });

    it('says nothing reached the service when her browser reached nobody', async () => {
      const service = aService([NOTHING_IS_THERE]);

      await expect(askForACode(HER_ADDRESS, service.how)).rejects.toMatchObject({
        because: 'nothingReachedTheService',
      });
    });

    it('says to wait when the service refuses to send another code', async () => {
      const service = aService([
        refused('UsernameExistsException'),
        refused('LimitExceededException', 'Attempt limit exceeded, please try after some time.'),
      ]);

      await expect(askForACode(HER_ADDRESS, service.how)).rejects.toMatchObject({
        because: 'tooManyTries',
      });
    });

    it('refuses an answer that carries no session, because there would be nothing to answer with', async () => {
      const service = aService([took({}), took({ ChallengeName: 'EMAIL_OTP' })]);

      await expect(askForACode(HER_ADDRESS, service.how)).rejects.toBeInstanceOf(ASignInProblem);
    });
  });

  describe('she answers the code', () => {
    const waiting = { address: HER_ADDRESS, session: 'a-session' };

    it('hands her the three tokens, from the session she was given', async () => {
      const service = aService([theTokens]);

      const held = await signInWithTheCode(waiting, SIX_DIGITS, service.how);

      expect(held).toEqual({
        idToken: 'an-id-token',
        accessToken: 'an-access-token',
        refreshToken: 'a-refresh-token',
      });
      expect(service.went[0]).toEqual({
        call: 'RespondToAuthChallenge',
        body: {
          ClientId: THE_WEBSITE_CLIENT_ID,
          ChallengeName: 'EMAIL_OTP',
          Session: 'a-session',
          ChallengeResponses: { USERNAME: HER_ADDRESS, EMAIL_OTP_CODE: SIX_DIGITS },
        },
      });
    });

    it('says the code is wrong, and carries the session the service left open for the next try', async () => {
      const service = aService([
        { status: 400, said: { __type: 'CodeMismatchException', Session: 'another-session' } },
      ]);

      await expect(signInWithTheCode(waiting, '000000', service.how)).rejects.toMatchObject({
        because: 'theCodeIsWrong',
        tryAgainWith: 'another-session',
      });
    });

    it('says the code has expired', async () => {
      const service = aService([refused('ExpiredCodeException')]);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toMatchObject({
        because: 'theCodeHasExpired',
      });
    });

    it('says the code has expired when the service closed the session it was answered in', async () => {
      const service = aService([
        refused('NotAuthorizedException', 'Invalid session for the user, session is expired.'),
      ]);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toMatchObject({
        because: 'theCodeHasExpired',
      });
    });

    it('says to wait when she has tried too many times', async () => {
      const service = aService([refused('TooManyFailedAttemptsException')]);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toMatchObject({
        because: 'tooManyTries',
      });
    });

    it('says nothing reached the service when her browser reached nobody', async () => {
      const service = aService([NOTHING_IS_THERE]);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toMatchObject({
        because: 'nothingReachedTheService',
      });
    });

    it('refuses an answer that carries no tokens, so no empty session is ever held', async () => {
      const service = aService([took({ AuthenticationResult: { IdToken: 'one' } })]);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toBeInstanceOf(
        ASignInProblem,
      );
    });

    it('answers the code that is six digits long, which is the length the words promise', () => {
      expect(THE_CODE_IS_THIS_LONG).toBe(6);
      expect(SIX_DIGITS).toHaveLength(THE_CODE_IS_THIS_LONG);
    });
  });

  describe('she sends a new code, and she uses another address', () => {
    it('sends a new code on the same address, and the second session replaces the first', async () => {
      const service = aService([
        refused('UsernameExistsException'),
        theCodeIsOnItsWay('one'),
        refused('UsernameExistsException'),
        theCodeIsOnItsWay('two'),
        theTokens,
      ]);

      const first = await askForACode(HER_ADDRESS, service.how);
      const second = await askForACode(HER_ADDRESS, service.how);

      expect([first.session, second.session]).toEqual(['one', 'two']);

      await signInWithTheCode(second, SIX_DIGITS, service.how);

      expect(service.went.at(-1)?.body).toMatchObject({ Session: 'two' });
    });

    it('starts again on another address, and answers with that address and not the first', async () => {
      const service = aService([
        took({ UserSub: 'a-subject' }),
        theCodeIsOnItsWay('a-session'),
        theTokens,
      ]);

      const waiting = await askForACode('another@example.com', service.how);

      await signInWithTheCode(waiting, SIX_DIGITS, service.how);

      expect(service.went.at(-1)?.body).toMatchObject({
        ChallengeResponses: { USERNAME: 'another@example.com', EMAIL_OTP_CODE: SIX_DIGITS },
      });
      expect(JSON.stringify(service.went)).not.toContain(HER_ADDRESS);
    });
  });

  describe('she signs out', () => {
    it('asks the service to revoke the token that outlives the window', async () => {
      const service = aService([took({})]);

      await signOut('a-refresh-token', service.how);

      expect(service.went).toEqual([
        {
          call: 'RevokeToken',
          body: { ClientId: THE_WEBSITE_CLIENT_ID, Token: 'a-refresh-token' },
        },
      ]);
    });

    it('says nothing reached the service when her browser reached nobody', async () => {
      const service = aService([NOTHING_IS_THERE]);

      await expect(signOut('a-refresh-token', service.how)).rejects.toMatchObject({
        because: 'nothingReachedTheService',
      });
    });

    it('raises a problem when the service refuses the revoke', async () => {
      const service = aService([refused('TooManyRequestsException')]);

      await expect(signOut('a-refresh-token', service.how)).rejects.toBeInstanceOf(ASignInProblem);
    });
  });

  describe('what never leaves her browser', () => {
    it('never puts her address, her code or a token into the words of a problem', async () => {
      const service = aService([
        refused('UsernameExistsException'),
        refused('CodeMismatchException'),
      ]);

      let problem: ASignInProblem | null = null;

      try {
        await askForACode(HER_ADDRESS, service.how);
      } catch (raised) {
        problem = raised as ASignInProblem;
      }

      expect(problem).toBeInstanceOf(ASignInProblem);
      expect(problem?.message).toBe(problem?.because);
      expect(JSON.stringify({ ...problem, message: problem?.message })).not.toContain(HER_ADDRESS);
      expect(problem?.message).not.toContain(SIX_DIGITS);
    });
  });
});
