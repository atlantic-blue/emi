import { aValueNobodyCanGuess } from '../lib/theProviderSignIn';
import { THE_POOL_HOST } from '../lib/theSignIn';
import {
  STATE_BYTES,
  THE_API_HOST,
  THE_EMI_BOT_ID,
  THE_TELEGRAM_SCOPE,
  TheTelegramSignInDidNotFinish,
  VERIFIER_BYTES,
  WHERE_TELEGRAM_ASKS_HER,
  WHERE_TELEGRAM_SENDS_HER_BACK,
  WHERE_THE_SIGN_IN_FUNCTION_ANSWERS,
  forgetWhatSheStarted,
  theEntryFor,
  theLanguageIn,
  theTokensSheCameBackWith,
  whatSheStarted,
  whereAPressTakesHer,
  whereTelegramSendsHerBack,
} from '../lib/theTelegramSignIn';

/**
 * The sign in with Telegram, driven end to end against a stub of the api and of the pool.
 *
 * A stub and not the live account, for two reasons. The client secret of the bot and the two
 * allowed addresses are made by hand in the BotFather mini application, so a press against
 * Telegram would prove that an address is not registered yet and nothing else. And the pool does
 * not name the three triggers of the custom sign in, so the two calls below would be refused for
 * a reason that has nothing to do with this code. Every shape here is one the service documents
 * or one the sign in function of this repository already answers with.
 *
 * The case that matters most is the state. Telegram hands back the value her browser made, so a
 * return carrying any other value is a return this browser did not start, and that case reads the
 * calls the stub was given and asserts there were none.
 */

/**
 * The store a browser keeps the three values in, stood in for this run.
 *
 * These cases run where the cryptography of the platform is, because the press makes a digest and
 * a document standing in for a browser offers none. That leaves the run without a store, so one is
 * stood in here, with the five things a browser's own store answers.
 */
function aStoreOfItsOwn(): Storage {
  const held = new Map<string, string>();

  return {
    get length() {
      return held.size;
    },
    clear: () => held.clear(),
    getItem: (name: string) => held.get(name) ?? null,
    key: (at: number) => [...held.keys()][at] ?? null,
    removeItem: (name: string) => held.delete(name) as unknown as void,
    setItem: (name: string, value: string) => held.set(name, value) as unknown as void,
  };
}

globalThis.sessionStorage = aStoreOfItsOwn();

/** One call the stub was given, kept so a case can read what really went out. */
interface ACallThatWentOut {
  readonly where: string;
  readonly call: string;
  readonly body: string;
}

/** What the pool answers each of the two calls of the custom sign in with. */
const theChallenge = {
  status: 200,
  said: { ChallengeName: 'CUSTOM_CHALLENGE', Session: 'a-session-the-pool-made' },
};

const theTokens = {
  status: 200,
  said: {
    AuthenticationResult: {
      IdToken: 'an-id-token',
      AccessToken: 'an-access-token',
      RefreshToken: 'a-refresh-token',
    },
  },
};

/** What the sign in function answers with: a user name of the pool, and one answer. */
const theUserNameAndTheAnswer = {
  status: 200,
  said: { userName: 'tg_7Z8K2PQR4MNWXYVB3HJ5CD6TFG', answer: 'an-answer-good-for-one-challenge' },
};

/** The stub: a queue of answers, and the record of every call that was made. */
function anApiAndAPool(answers: readonly { status: number; said: Record<string, unknown> }[]) {
  const went: ACallThatWentOut[] = [];
  const left = [...answers];

  const how: typeof fetch = async (where, asked) => {
    const headers = new Headers(asked?.headers);

    expect(asked?.method).toBe('POST');

    went.push({
      where: String(where),
      call: (headers.get('x-amz-target') ?? '').split('.').pop() ?? '',
      body: String(asked?.body),
    });

    const next = left.shift();

    if (next === undefined) {
      throw new Error(`The stub was asked for ${String(where)} and had no answer left.`);
    }

    return new Response(JSON.stringify(next.said), { status: next.status });
  };

  return { how, went };
}

/** A browser that reached nobody, which throws rather than answering. */
const reachedNobody: typeof fetch = () => Promise.reject(new TypeError('Failed to fetch'));

const THE_ORIGIN = 'https://myemi.app';

/** The address a press hands the browser, read as its parts. */
async function thePressIn(language: 'en' | 'ru' | 'es' = 'en'): Promise<URL> {
  return new URL(await whereAPressTakesHer(language, THE_ORIGIN));
}

/** Everything the three languages could have kept, cleared between cases. */
function forgetEverything(): void {
  for (const language of ['en', 'ru', 'es'] as const) {
    forgetWhatSheStarted(language);
  }
}

describe('what a press on Telegram does', () => {
  beforeEach(forgetEverything);

  it('sends her to the authorization endpoint of Telegram, as the bot Emi holds', async () => {
    const address = await thePressIn();

    expect(`${address.origin}${address.pathname}`).toBe(WHERE_TELEGRAM_ASKS_HER);
    expect(WHERE_TELEGRAM_ASKS_HER).toBe('https://oauth.telegram.org/auth');
    expect(address.searchParams.get('client_id')).toBe(THE_EMI_BOT_ID);
    expect(address.searchParams.get('response_type')).toBe('code');
  });

  it('carries every parameter the design names, and S256, and nothing else', async () => {
    const address = await thePressIn();
    const kept = whatSheStarted('en');

    expect([...address.searchParams.keys()].sort()).toEqual([
      'client_id',
      'code_challenge',
      'code_challenge_method',
      'redirect_uri',
      'response_type',
      'scope',
      'state',
    ]);
    expect(Object.fromEntries(address.searchParams)).toEqual({
      client_id: THE_EMI_BOT_ID,
      code_challenge: await theChallengeOf(kept?.verifier ?? ''),
      code_challenge_method: 'S256',
      redirect_uri: `${THE_ORIGIN}/en/${WHERE_TELEGRAM_SENDS_HER_BACK}`,
      response_type: 'code',
      scope: 'openid',
      state: kept?.state ?? '',
    });
  });

  it('asks for the subject and the instants, and for nothing else of hers', async () => {
    const address = await thePressIn();

    expect(address.searchParams.get('scope')).toBe(THE_TELEGRAM_SCOPE);
    expect(THE_TELEGRAM_SCOPE).toBe('openid');
    // The three scopes Emi refuses, each of which would return her name, her telephone number or
    // the right for the bot to write to her.
    for (const refused of ['profile', 'phone', 'telegram:bot_access']) {
      expect(address.searchParams.get('scope')).not.toContain(refused);
    }
  });

  it('carries no nonce in the address, and keeps one for the function to read', async () => {
    const address = await thePressIn();

    expect(address.searchParams.get('nonce')).toBeNull();
    expect((whatSheStarted('en')?.nonce ?? '').length).toBeGreaterThan(20);
  });

  it.each(['en', 'ru', 'es'] as const)(
    'comes back to the one registered address from %s, which is under en',
    async (language) => {
      const address = await thePressIn(language);

      expect(address.searchParams.get('redirect_uri')).toBe(
        `${THE_ORIGIN}/en/${WHERE_TELEGRAM_SENDS_HER_BACK}`,
      );
      expect(whereTelegramSendsHerBack(THE_ORIGIN)).toBe('https://myemi.app/en/sign-in/telegram/');
    },
  );

  it.each(['en', 'ru', 'es'] as const)(
    'writes the language %s into the state, so the relay sends her on in it',
    async (language) => {
      const address = await thePressIn(language);

      expect(theLanguageIn(address.searchParams.get('state'))).toBe(language);
      expect(whatSheStarted(language)?.language).toBe(language);
    },
  );

  it('keeps the three values under the language she is reading in', async () => {
    await thePressIn('ru');

    expect(theEntryFor('ru')).toBe('emi.signing-in.telegram.ru');
    expect(globalThis.sessionStorage.getItem(theEntryFor('ru'))).not.toBeNull();
    // A press in one language keeps nothing for another, so a return cannot be finished with what
    // a different press kept.
    expect(whatSheStarted('en')).toBeNull();
    expect(whatSheStarted('es')).toBeNull();
  });

  it('hands Telegram the digest of the verifier and never the verifier', async () => {
    const address = await thePressIn();
    const kept = whatSheStarted('en');

    expect(address.searchParams.get('code_challenge_method')).toBe('S256');
    expect(address.searchParams.get('code_challenge')).toBe(
      await theChallengeOf(kept?.verifier ?? ''),
    );
    expect(address.search).not.toContain(kept?.verifier ?? 'nothing');
  });

  it('makes a verifier of 32 bytes and a state of 16, and a fresh pair each time', async () => {
    const states = new Set<string>();
    const verifiers = new Set<string>();

    for (let press = 0; press < 20; press += 1) {
      forgetEverything();
      await thePressIn();

      const kept = whatSheStarted('en');

      states.add(kept?.state ?? '');
      verifiers.add(kept?.verifier ?? '');
    }

    expect(states.size).toBe(20);
    expect(verifiers.size).toBe(20);
    expect(VERIFIER_BYTES).toBe(32);
    expect(STATE_BYTES).toBe(16);
    // Base 64 of a count of bytes is four characters for every three, once the padding is off.
    expect((whatSheStarted('en')?.verifier ?? '').length).toBe(Math.ceil((VERIFIER_BYTES * 8) / 6));
    expect(((whatSheStarted('en')?.state ?? '').split('.')[1] ?? '').length).toBe(
      Math.ceil((STATE_BYTES * 8) / 6),
    );
  });

  it('reads no language out of a state no press of this site wrote', () => {
    expect(theLanguageIn('fr.a-value')).toBeNull();
    expect(theLanguageIn('a-state-another-browser-wrote')).toBeNull();
    expect(theLanguageIn(null)).toBeNull();
  });
});

describe('what the relay page does with the code', () => {
  beforeEach(forgetEverything);

  it('hands the code and the verifier to the function, then finishes the two pool calls', async () => {
    await thePressIn('ru');

    const kept = whatSheStarted('ru');
    const stub = anApiAndAPool([theUserNameAndTheAnswer, theChallenge, theTokens]);

    const came = await theTokensSheCameBackWith(
      `?code=a-code&state=${encodeURIComponent(kept?.state ?? '')}`,
      stub.how,
    );

    expect(came).toEqual({
      language: 'ru',
      tokens: {
        idToken: 'an-id-token',
        accessToken: 'an-access-token',
        refreshToken: 'a-refresh-token',
      },
    });
    expect(stub.went).toHaveLength(3);

    // One call to the api, carrying the code, the verifier and the nonce. The identity token
    // Telegram signs is read by the function and is in nothing this browser sent or received.
    expect(stub.went[0]?.where).toBe(WHERE_THE_SIGN_IN_FUNCTION_ANSWERS);
    expect(JSON.parse(stub.went[0]?.body ?? '{}')).toEqual({
      code: 'a-code',
      codeVerifier: kept?.verifier ?? '',
      nonce: kept?.nonce ?? '',
    });

    // Then the two calls of the custom sign in, both to the pool and to no other host.
    expect(stub.went[1]?.where).toBe(THE_POOL_HOST);
    expect(stub.went[1]?.call).toBe('InitiateAuth');
    expect(JSON.parse(stub.went[1]?.body ?? '{}')).toMatchObject({
      AuthFlow: 'CUSTOM_AUTH',
      AuthParameters: {
        USERNAME: theUserNameAndTheAnswer.said.userName,
        CHALLENGE_NAME: 'CUSTOM_CHALLENGE',
      },
    });

    expect(stub.went[2]?.where).toBe(THE_POOL_HOST);
    expect(stub.went[2]?.call).toBe('RespondToAuthChallenge');
    expect(JSON.parse(stub.went[2]?.body ?? '{}')).toMatchObject({
      ChallengeName: 'CUSTOM_CHALLENGE',
      Session: 'a-session-the-pool-made',
      ChallengeResponses: {
        USERNAME: theUserNameAndTheAnswer.said.userName,
        ANSWER: theUserNameAndTheAnswer.said.answer,
      },
    });
  });

  it('refuses a state that is not the one this browser kept, and asks nobody anything', async () => {
    await thePressIn('en');

    const stub = anApiAndAPool([theUserNameAndTheAnswer, theChallenge, theTokens]);
    const anotherBrowser = `en.${aValueNobodyCanGuess(STATE_BYTES)}`;

    await expect(
      theTokensSheCameBackWith(
        `?code=a-code&state=${encodeURIComponent(anotherBrowser)}`,
        stub.how,
      ),
    ).rejects.toMatchObject({ because: 'theStateDidNotMatch' });
    // The whole point of the state. A code sent to the function for a state this browser did not
    // write would sign her in to whichever account started that sign in.
    expect(stub.went).toEqual([]);
  });

  it('refuses a return with no state at all, and asks nobody anything', async () => {
    await thePressIn('en');

    const stub = anApiAndAPool([theUserNameAndTheAnswer]);

    await expect(theTokensSheCameBackWith('?code=a-code', stub.how)).rejects.toMatchObject({
      because: 'theStateDidNotMatch',
    });
    expect(stub.went).toEqual([]);
  });

  it('refuses a return whose state names a language this site does not serve', async () => {
    await thePressIn('en');

    const stub = anApiAndAPool([theUserNameAndTheAnswer]);

    await expect(
      theTokensSheCameBackWith('?code=a-code&state=fr.a-value', stub.how),
    ).rejects.toMatchObject({ because: 'theStateDidNotMatch' });
    expect(stub.went).toEqual([]);
  });

  it('refuses a return that no press of this browser started', async () => {
    const stub = anApiAndAPool([theUserNameAndTheAnswer]);

    await expect(
      theTokensSheCameBackWith('?code=a-code&state=en.a-value', stub.how),
    ).rejects.toMatchObject({ because: 'nothingWasStarted' });
    expect(stub.went).toEqual([]);
  });

  it('refuses a return whose state was kept for another language', async () => {
    await thePressIn('ru');

    const kept = whatSheStarted('ru');
    const stub = anApiAndAPool([theUserNameAndTheAnswer]);
    const asEnglish = `en.${(kept?.state ?? '').split('.')[1] ?? ''}`;

    await expect(
      theTokensSheCameBackWith(`?code=a-code&state=${encodeURIComponent(asEnglish)}`, stub.how),
    ).rejects.toMatchObject({ because: 'nothingWasStarted' });
    expect(stub.went).toEqual([]);
  });

  it('refuses a return that carries a refusal from Telegram, and asks nobody anything', async () => {
    await thePressIn('en');

    const kept = whatSheStarted('en');
    const stub = anApiAndAPool([theUserNameAndTheAnswer]);

    await expect(
      theTokensSheCameBackWith(
        `?error=access_denied&state=${encodeURIComponent(kept?.state ?? '')}`,
        stub.how,
      ),
    ).rejects.toMatchObject({ because: 'telegramSaidNo' });
    expect(stub.went).toEqual([]);
  });

  it('refuses a return with the right state and no code', async () => {
    await thePressIn('en');

    const kept = whatSheStarted('en');
    const stub = anApiAndAPool([theUserNameAndTheAnswer]);

    await expect(
      theTokensSheCameBackWith(`?state=${encodeURIComponent(kept?.state ?? '')}`, stub.how),
    ).rejects.toMatchObject({ because: 'noCodeCameBack' });
    expect(stub.went).toEqual([]);
  });

  it.each([
    {
      what: 'a refusal from the function',
      answers: [{ status: 403, said: { error: 'that code did not sign anybody in' } }],
      calls: 1,
    },
    {
      what: 'an answer carrying a user name and no one time answer',
      answers: [{ status: 200, said: { userName: 'tg_7Z8K2PQR4MNWXYVB3HJ5CD6TFG' } }],
      calls: 1,
    },
    {
      what: 'a refusal from the pool on the first call',
      answers: [
        theUserNameAndTheAnswer,
        { status: 400, said: { __type: 'NotAuthorizedException' } },
      ],
      calls: 2,
    },
    {
      what: 'a refusal from the pool on the answer, which is a one time answer already spent',
      answers: [
        theUserNameAndTheAnswer,
        theChallenge,
        { status: 400, said: { __type: 'NotAuthorizedException' } },
      ],
      calls: 3,
    },
  ])('reads $what as a sign in that did not finish', async ({ answers, calls }) => {
    await thePressIn('en');

    const kept = whatSheStarted('en');
    const stub = anApiAndAPool(answers);

    await expect(
      theTokensSheCameBackWith(
        `?code=a-code&state=${encodeURIComponent(kept?.state ?? '')}`,
        stub.how,
      ),
    ).rejects.toMatchObject({ because: 'theServiceRefused' });
    expect(stub.went).toHaveLength(calls);
  });

  it('tells a lost connection apart from a refusal', async () => {
    await thePressIn('en');

    const kept = whatSheStarted('en');

    await expect(
      theTokensSheCameBackWith(
        `?code=a-code&state=${encodeURIComponent(kept?.state ?? '')}`,
        reachedNobody,
      ),
    ).rejects.toMatchObject({ because: 'nothingReachedTheService' });
  });

  it('reads nothing out of a kept value somebody rewrote', async () => {
    await thePressIn('en');

    expect(whatSheStarted('en')).not.toBeNull();

    globalThis.sessionStorage.setItem(theEntryFor('en'), 'not a sign in at all');

    expect(whatSheStarted('en')).toBeNull();

    globalThis.sessionStorage.setItem(
      theEntryFor('en'),
      JSON.stringify({ state: 'en.a-value', verifier: 'a-verifier' }),
    );

    expect(whatSheStarted('en')).toBeNull();
  });

  it('carries the cause and nothing of hers', () => {
    const refused = new TheTelegramSignInDidNotFinish('theStateDidNotMatch');

    expect(refused.because).toBe('theStateDidNotMatch');
    expect(refused.name).toBe('TheTelegramSignInDidNotFinish');
    expect(refused).toBeInstanceOf(Error);
  });
});

describe('the host the browser is allowed to reach', () => {
  it('names the api of Emi and reaches it over a connection nobody can read', () => {
    expect(new URL(THE_API_HOST).protocol).toBe('https:');
    expect(WHERE_THE_SIGN_IN_FUNCTION_ANSWERS).toBe(`${THE_API_HOST}/v1/sign-in/telegram`);
    // The route the api answers it on, which `infra/api.tf` names and which takes no authorizer.
    expect(new URL(WHERE_THE_SIGN_IN_FUNCTION_ANSWERS).pathname).toBe('/v1/sign-in/telegram');
  });
});

/** The digest a press hands Telegram, made here the way the press makes it. */
async function theChallengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
