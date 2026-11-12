import {
  ASignInProblem,
  THE_POOL_HOST,
  THE_POOL_ID,
  THE_POOL_REGION,
  THE_SIGN_IN_CODE_IS_THIS_LONG,
  THE_SIGN_UP_CODE_IS_THIS_LONG,
  THE_WEBSITE_CLIENT_ID,
  type TheCodeSheWaitsFor,
  type WhatWentWrong,
  aUsername,
  askForACode,
  sendHerAnotherCode,
  signInWithTheCode,
  signOut,
} from '../lib/theSignIn';

/**
 * The sign in, driven end to end against a stub of Amazon Cognito.
 *
 * It is a stub and not the live pool, because a run against the live pool makes a user and sends
 * an email to whoever owns the address. Every shape below is one the service documents.
 *
 * Two readings sit behind these cases and neither can be made from the repository, so they are
 * written out here. An address that already belongs to an account is signed up again without a
 * refusal, because the pool carries the address as an alias, and the collision is raised by the
 * confirmation as `AliasExistsException`. And an address with no user at all is answered by
 * `InitiateAuth` with a whole email one time password challenge and no email, which was read from
 * the live pool on 2026-11-11. Together they are why no call can tell the two apart before the
 * first email goes out.
 *
 * The count of email causing calls is what most of this file is about. One sign in sends one
 * email, so each case reads the calls that went out and says how many of them reach her inbox.
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

/**
 * The calls that put an email in her inbox. `SignUp` sends the code that confirms the address, and
 * `InitiateAuth` with a preferred challenge sends the code that signs her in. Nothing else the
 * module calls sends anything.
 */
const THE_CALLS_THAT_SEND_AN_EMAIL = ['SignUp', 'InitiateAuth'];

/** How many of the calls that went out reached her inbox. */
function howManyEmails(went: readonly ACallThatWentOut[]): number {
  return went.filter(
    (each) =>
      THE_CALLS_THAT_SEND_AN_EMAIL.includes(each.call) &&
      // An `InitiateAuth` carrying a session is the sign in off a confirmation, and the service
      // takes the code she already gave rather than sending another.
      each.body.Session === undefined,
  ).length;
}

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

/**
 * The answer to a sign up, which carries the session the confirmation signs her in with. The
 * service writes one for a pool that signs a woman in without a password.
 */
const sheIsSignedUp = took({
  UserSub: 'a-subject',
  UserConfirmed: false,
  CodeDeliveryDetails: {
    AttributeName: 'email',
    DeliveryMedium: 'EMAIL',
    Destination: 'i***@e***',
  },
  Session: 'the-sign-up-session',
});

/** The answer to a confirmation, which carries the session that stands in for the code. */
const sheIsConfirmed = took({ Session: 'the-confirmed-session' });

/** The challenge the service hands back when the sign in code is on its way to her address. */
const theSignInCodeIsOnItsWay = took({
  ChallengeName: 'EMAIL_OTP',
  Session: 'the-sign-in-session',
  ChallengeParameters: {
    CODE_DELIVERY_DELIVERY_MEDIUM: 'EMAIL',
    CODE_DELIVERY_DESTINATION: 'i***@e***',
  },
});

/** The tokens the service hands back when she is through. */
const theTokens = took({
  AuthenticationResult: {
    IdToken: 'an-id-token',
    AccessToken: 'an-access-token',
    RefreshToken: 'a-refresh-token',
  },
});

const HER_ADDRESS = 'iuliia@example.com';

/** The code that confirms a sign up, which the service writes six digits long. */
const SIX_DIGITS = '482913';

/** The code that signs her in, which the service writes eight digits long. */
const EIGHT_DIGITS = '48291374';

/** The box a woman is in front of while she holds a sign in code, with the session it answers. */
const theBoxForASignInCode: TheCodeSheWaitsFor = {
  address: HER_ADDRESS,
  username: '',
  session: 'the-sign-in-session',
  digits: THE_SIGN_IN_CODE_IS_THIS_LONG,
  answers: 'theSignInCode',
};

/** Her tokens out of an answer, where the answer is the one that signs her in. */
function theTokensIn(answer: Awaited<ReturnType<typeof signInWithTheCode>>) {
  if (answer.kind !== 'sheIsSignedIn') {
    throw new Error(`She is not signed in: the answer was ${answer.kind}.`);
  }

  return answer.held;
}

/** The box she is left in front of, where the answer left her waiting rather than signed in. */
function theBoxSheIsLeftWith(
  answer: Awaited<ReturnType<typeof signInWithTheCode>>,
): TheCodeSheWaitsFor {
  if (answer.kind !== 'anotherCodeIsOnItsWay') {
    throw new Error(`She was not left waiting: the answer was ${answer.kind}.`);
  }

  return answer.waitsFor;
}

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

    it('holds the two lengths the service sends, which are not the same length', () => {
      expect(THE_SIGN_UP_CODE_IS_THIS_LONG).toBe(6);
      expect(THE_SIGN_IN_CODE_IS_THIS_LONG).toBe(8);
      expect(SIX_DIGITS).toHaveLength(THE_SIGN_UP_CODE_IS_THIS_LONG);
      expect(EIGHT_DIGITS).toHaveLength(THE_SIGN_IN_CODE_IS_THIS_LONG);
    });
  });

  describe('an address that has never signed in', () => {
    it('sends her one email and nothing else, and leaves her waiting for six digits', async () => {
      const service = aService([sheIsSignedUp]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      expect(service.went.map((each) => each.call)).toEqual(['SignUp']);
      expect(howManyEmails(service.went)).toBe(1);
      expect(waiting.digits).toBe(THE_SIGN_UP_CODE_IS_THIS_LONG);
      expect(waiting.answers).toBe('theSignUpCode');
      expect(waiting).toMatchObject({ address: HER_ADDRESS, session: 'the-sign-up-session' });
      expect(service.whatIsLeft()).toBe(0);
    });

    it('asks for her address and for no password, and names her user at random', async () => {
      const service = aService([sheIsSignedUp]);

      const waiting = await askForACode(HER_ADDRESS, service.how);
      const [signUp] = service.went;

      expect(signUp?.body).not.toHaveProperty('Password');
      expect(signUp?.body).toMatchObject({
        ClientId: THE_WEBSITE_CLIENT_ID,
        Username: waiting.username,
        UserAttributes: [{ Name: 'email', Value: HER_ADDRESS }],
      });
      expect(waiting.username).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
      expect(JSON.stringify(service.went)).not.toContain('PASSWORD');
    });

    it('takes the six digits she types and hands her the three tokens, with no second code', async () => {
      const service = aService([sheIsSignedUp, sheIsConfirmed, theTokens]);

      const waiting = await askForACode(HER_ADDRESS, service.how);
      const answer = await signInWithTheCode(waiting, SIX_DIGITS, service.how);

      expect(theTokensIn(answer)).toEqual({
        idToken: 'an-id-token',
        accessToken: 'an-access-token',
        refreshToken: 'a-refresh-token',
      });
      expect(service.went.map((each) => each.call)).toEqual([
        'SignUp',
        'ConfirmSignUp',
        'InitiateAuth',
      ]);
      // One email for the whole sign in. The second call answers the code she was sent and the
      // third signs her in off the session that answer carried.
      expect(howManyEmails(service.went)).toBe(1);
      expect(service.whatIsLeft()).toBe(0);
    });

    it('confirms her by the name the service knows her by, carrying the session it gave', async () => {
      const service = aService([sheIsSignedUp, sheIsConfirmed, theTokens]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      await signInWithTheCode(waiting, SIX_DIGITS, service.how);

      const [, confirmed, signedIn] = service.went;

      expect(confirmed?.body).toEqual({
        ClientId: THE_WEBSITE_CLIENT_ID,
        Username: waiting.username,
        ConfirmationCode: SIX_DIGITS,
        Session: 'the-sign-up-session',
      });
      expect(signedIn?.body).toEqual({
        ClientId: THE_WEBSITE_CLIENT_ID,
        AuthFlow: 'USER_AUTH',
        AuthParameters: { USERNAME: waiting.username },
        Session: 'the-confirmed-session',
      });
    });

    it('confirms her without a session where the service gave none, and sends the sign in code', async () => {
      const service = aService([
        took({ UserSub: 'a-subject', UserConfirmed: false }),
        took({}),
        theSignInCodeIsOnItsWay,
        theTokens,
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      expect(waiting.session).toBe('');

      const left = theBoxSheIsLeftWith(await signInWithTheCode(waiting, SIX_DIGITS, service.how));

      expect(service.went[1]?.body).not.toHaveProperty('Session');
      expect(left.digits).toBe(THE_SIGN_IN_CODE_IS_THIS_LONG);
      expect(theTokensIn(await signInWithTheCode(left, EIGHT_DIGITS, service.how))).toMatchObject({
        idToken: 'an-id-token',
      });
    });
  });

  describe('an address that already has a user', () => {
    it('is signed up the same way, because the service refuses nothing until she proves the address', async () => {
      const brandNew = aService([sheIsSignedUp]);
      const knownAlready = aService([sheIsSignedUp]);

      await askForACode(HER_ADDRESS, brandNew.how);
      await askForACode(HER_ADDRESS, knownAlready.how);

      // The username is the one value that differs, and it is written at random, so it carries
      // nothing about her and nothing about which of the two she was.
      const withoutTheUsername = (went: ACallThatWentOut[]) =>
        went.map(({ call, body }) => ({ call, body: { ...body, Username: 'a-username' } }));

      expect(withoutTheUsername(brandNew.went)).toEqual(withoutTheUsername(knownAlready.went));
      expect(String(brandNew.went[0]?.body.Username)).not.toBe(
        String(knownAlready.went[0]?.body.Username),
      );
    });

    it('sends her the sign in code once she types the first one, and takes eight digits', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('AliasExistsException', 'An account with the email already exists.'),
        theSignInCodeIsOnItsWay,
        theTokens,
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);
      const left = theBoxSheIsLeftWith(await signInWithTheCode(waiting, SIX_DIGITS, service.how));

      expect(left).toEqual({
        address: HER_ADDRESS,
        username: '',
        session: 'the-sign-in-session',
        digits: THE_SIGN_IN_CODE_IS_THIS_LONG,
        answers: 'theSignInCode',
      });

      const answer = await signInWithTheCode(left, EIGHT_DIGITS, service.how);

      expect(theTokensIn(answer)).toEqual({
        idToken: 'an-id-token',
        accessToken: 'an-access-token',
        refreshToken: 'a-refresh-token',
      });
      expect(service.went.map((each) => each.call)).toEqual([
        'SignUp',
        'ConfirmSignUp',
        'InitiateAuth',
        'RespondToAuthChallenge',
      ]);
      expect(service.whatIsLeft()).toBe(0);
    });

    it('asks for the code factor and for no password, and answers with the address she typed', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('AliasExistsException'),
        theSignInCodeIsOnItsWay,
        theTokens,
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);
      const left = theBoxSheIsLeftWith(await signInWithTheCode(waiting, SIX_DIGITS, service.how));

      await signInWithTheCode(left, EIGHT_DIGITS, service.how);

      const [, , asked, answered] = service.went;

      expect(asked?.body).toEqual({
        ClientId: THE_WEBSITE_CLIENT_ID,
        AuthFlow: 'USER_AUTH',
        AuthParameters: { USERNAME: HER_ADDRESS, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
      });
      expect(answered?.body).toEqual({
        ClientId: THE_WEBSITE_CLIENT_ID,
        ChallengeName: 'EMAIL_OTP',
        Session: 'the-sign-in-session',
        ChallengeResponses: { USERNAME: HER_ADDRESS, EMAIL_OTP_CODE: EIGHT_DIGITS },
      });
      expect(JSON.stringify(service.went)).not.toContain('PASSWORD');
    });

    it('sends one email for each code, and never two at once', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('AliasExistsException'),
        theSignInCodeIsOnItsWay,
        theTokens,
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      // The one call that went out is the one that emailed her. Asking for a code used to send
      // two, and the second of the two was the one she could answer.
      expect(howManyEmails(service.went)).toBe(1);

      const left = theBoxSheIsLeftWith(await signInWithTheCode(waiting, SIX_DIGITS, service.how));

      expect(howManyEmails(service.went)).toBe(2);

      await signInWithTheCode(left, EIGHT_DIGITS, service.how);

      // Answering the second code sends nothing, so the whole run emailed her twice: once for the
      // address, and once to sign her in.
      expect(howManyEmails(service.went)).toBe(2);
    });

    it('says to wait where the service refuses to send the sign in code', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('AliasExistsException'),
        refused('LimitExceededException', 'Attempt limit exceeded, please try after some time.'),
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toMatchObject({
        because: 'tooManyTries',
      });
    });

    it('refuses a challenge that carries no session, because there would be nothing to answer with', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('AliasExistsException'),
        took({ ChallengeName: 'EMAIL_OTP' }),
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toBeInstanceOf(
        ASignInProblem,
      );
    });
  });

  describe('a code she typed wrong', () => {
    it('leaves a sign up code answerable again, on the session she is holding', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('CodeMismatchException'),
        sheIsConfirmed,
        theTokens,
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);

      await expect(signInWithTheCode(waiting, '000000', service.how)).rejects.toMatchObject({
        because: 'theCodeIsWrong',
        tryAgainWith: undefined,
      });

      // The refusal closed nothing, so the session she was holding answers the next try, and it
      // sent her no second email.
      expect(theTokensIn(await signInWithTheCode(waiting, SIX_DIGITS, service.how))).toMatchObject({
        idToken: 'an-id-token',
      });
      expect(service.went.at(-2)?.body).toMatchObject({ Session: 'the-sign-up-session' });
      expect(howManyEmails(service.went)).toBe(1);
    });

    it('carries the fresh session the service left open for a sign in code', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('AliasExistsException'),
        theSignInCodeIsOnItsWay,
        { status: 400, said: { __type: 'CodeMismatchException', Session: 'another-session' } },
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);
      const left = theBoxSheIsLeftWith(await signInWithTheCode(waiting, SIX_DIGITS, service.how));

      await expect(signInWithTheCode(left, '00000000', service.how)).rejects.toMatchObject({
        because: 'theCodeIsWrong',
        tryAgainWith: 'another-session',
      });
    });

    it('says the code has expired, and says it for the session the service closed', async () => {
      const expired: readonly AnAnswer[] = [
        refused('ExpiredCodeException'),
        refused('NotAuthorizedException', 'Invalid session for the user, session is expired.'),
      ];

      for (const answer of expired) {
        const forTheSignUp = aService([sheIsSignedUp, answer]);
        const waiting = await askForACode(HER_ADDRESS, forTheSignUp.how);

        await expect(
          signInWithTheCode(waiting, SIX_DIGITS, forTheSignUp.how),
        ).rejects.toMatchObject({ because: 'theCodeHasExpired' });

        const forTheSignIn = aService([answer]);

        await expect(
          signInWithTheCode(
            {
              address: HER_ADDRESS,
              username: '',
              session: 'the-sign-in-session',
              digits: THE_SIGN_IN_CODE_IS_THIS_LONG,
              answers: 'theSignInCode',
            },
            EIGHT_DIGITS,
            forTheSignIn.how,
          ),
        ).rejects.toMatchObject({ because: 'theCodeHasExpired' });
      }
    });

    it('says to wait when she has tried too many times', async () => {
      const service = aService([sheIsSignedUp, refused('TooManyFailedAttemptsException')]);
      const waiting = await askForACode(HER_ADDRESS, service.how);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toMatchObject({
        because: 'tooManyTries',
      });
    });

    it('refuses an answer that carries no tokens, so no empty session is ever held', async () => {
      const service = aService([
        sheIsSignedUp,
        sheIsConfirmed,
        took({ AuthenticationResult: { IdToken: 'one' } }),
      ]);
      const waiting = await askForACode(HER_ADDRESS, service.how);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toBeInstanceOf(
        ASignInProblem,
      );
    });
  });

  /**
   * The pool allows an email code to no user Google or Apple made. It answers the challenge and
   * sends her the eight digits like any other address, and refuses the digits she types whatever
   * she types, so no new code can work and the page may not tell her to wait for one.
   *
   * The refusal arrives at the one call that answers the code, which she reaches only by typing
   * the first code out of her own email, so the sentence reaches nobody who cannot read it.
   */
  describe('an address she signs in with Google or Apple', () => {
    const theProviderRefusal = refused(
      'NotAuthorizedException',
      'EXTERNAL_PROVIDER user is not authorized to authenticate with EMAIL_OTP.',
    );

    it('says she signs in with Google or Apple, where the refusal names the provider', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('AliasExistsException'),
        theSignInCodeIsOnItsWay,
        theProviderRefusal,
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);
      const left = theBoxSheIsLeftWith(await signInWithTheCode(waiting, SIX_DIGITS, service.how));

      await expect(signInWithTheCode(left, EIGHT_DIGITS, service.how)).rejects.toMatchObject({
        because: 'sheSignsInWithGoogleOrApple',
      });
    });

    it('leaves every other refusal of the same name the sentence it had', async () => {
      const otherRefusals: readonly [AnAnswer, WhatWentWrong][] = [
        [
          refused('NotAuthorizedException', 'Invalid session for the user, session is expired.'),
          'theCodeHasExpired',
        ],
        [refused('NotAuthorizedException', 'Incorrect username or password.'), 'tooManyTries'],
        [refused('NotAuthorizedException'), 'tooManyTries'],
      ];

      for (const [answer, because] of otherRefusals) {
        const service = aService([answer]);

        await expect(
          signInWithTheCode(theBoxForASignInCode, EIGHT_DIGITS, service.how),
        ).rejects.toMatchObject({ because });
      }
    });
  });

  describe('a browser that reached nobody', () => {
    it('says so when she asks for a code', async () => {
      const service = aService([NOTHING_IS_THERE]);

      await expect(askForACode(HER_ADDRESS, service.how)).rejects.toMatchObject({
        because: 'nothingReachedTheService',
      });
    });

    it('says so when she answers one', async () => {
      const service = aService([sheIsSignedUp, NOTHING_IS_THERE]);
      const waiting = await askForACode(HER_ADDRESS, service.how);

      await expect(signInWithTheCode(waiting, SIX_DIGITS, service.how)).rejects.toMatchObject({
        because: 'nothingReachedTheService',
      });
    });
  });

  describe('she sends a new code, and she uses another address', () => {
    it('sends a new sign up code, and the second session replaces the first', async () => {
      const service = aService([
        sheIsSignedUp,
        took({ UserSub: 'a-subject', Session: 'a-second-sign-up-session' }),
        sheIsConfirmed,
        theTokens,
      ]);

      const first = await askForACode(HER_ADDRESS, service.how);
      const second = await sendHerAnotherCode(first, service.how);

      expect([first.session, second.session]).toEqual([
        'the-sign-up-session',
        'a-second-sign-up-session',
      ]);
      expect(second.digits).toBe(THE_SIGN_UP_CODE_IS_THIS_LONG);
      expect(service.went.map((each) => each.call)).toEqual(['SignUp', 'SignUp']);

      await signInWithTheCode(second, SIX_DIGITS, service.how);

      expect(service.went.at(-2)?.body).toMatchObject({ Session: 'a-second-sign-up-session' });
    });

    it('sends a new sign in code the way the sign in code was sent, and not by signing her up', async () => {
      const service = aService([
        sheIsSignedUp,
        refused('AliasExistsException'),
        theSignInCodeIsOnItsWay,
        took({ ChallengeName: 'EMAIL_OTP', Session: 'a-second-sign-in-session' }),
        theTokens,
      ]);

      const waiting = await askForACode(HER_ADDRESS, service.how);
      const left = theBoxSheIsLeftWith(await signInWithTheCode(waiting, SIX_DIGITS, service.how));
      const again = await sendHerAnotherCode(left, service.how);

      expect(service.went.map((each) => each.call)).toEqual([
        'SignUp',
        'ConfirmSignUp',
        'InitiateAuth',
        'InitiateAuth',
      ]);
      expect(again.session).toBe('a-second-sign-in-session');
      expect(again.digits).toBe(THE_SIGN_IN_CODE_IS_THIS_LONG);

      await signInWithTheCode(again, EIGHT_DIGITS, service.how);

      expect(service.went.at(-1)?.body).toMatchObject({ Session: 'a-second-sign-in-session' });
    });

    it('starts again on another address, and answers with that address and not the first', async () => {
      const service = aService([sheIsSignedUp, sheIsConfirmed, theTokens]);

      const waiting = await askForACode('another@example.com', service.how);

      await signInWithTheCode(waiting, SIX_DIGITS, service.how);

      expect(service.went[0]?.body).toMatchObject({
        UserAttributes: [{ Name: 'email', Value: 'another@example.com' }],
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
      const service = aService([sheIsSignedUp, refused('CodeMismatchException')]);

      let problem: ASignInProblem | null = null;

      try {
        const waiting = await askForACode(HER_ADDRESS, service.how);

        await signInWithTheCode(waiting, SIX_DIGITS, service.how);
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
