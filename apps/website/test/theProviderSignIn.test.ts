import {
  RANDOM_BYTES,
  THE_SCOPES,
  THE_SIGN_IN_HOST,
  TheSignInDidNotFinish,
  WHAT_SHE_STARTED_ENTRY,
  WHERE_SHE_COMES_BACK_TO,
  aValueNobodyCanGuess,
  forgetWhatSheStarted,
  theChallengeFor,
  theTokensSheCameBackWith,
  whatSheStarted,
  whereAPressTakesHer,
  whereSheComesBackTo,
} from '../lib/theProviderSignIn';
import { THE_WEBSITE_CLIENT_ID } from '../lib/theSignIn';

/**
 * The sign in with Apple and with Google, driven end to end against a stub of the pool.
 *
 * A stub and not the live pool, for the reason the code sign in uses one: nobody has signed in
 * through the live pool with this code, and a run against it would prove that a credential of
 * Apple is not registered yet and nothing else. The stub answers the shapes the service
 * documents.
 *
 * The case that matters most is the state. The pool hands back the value her browser made, so a
 * return carrying any other value is a return this browser did not start, and that case reads the
 * calls the stub was given and asserts there were none.
 */

/**
 * The store a browser keeps the state and the verifier in, stood in for this run.
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
  readonly body: string;
}

/** The stub: a queue of answers, and the record of every call that was made. */
function aPool(answers: readonly { status: number; said: Record<string, unknown> }[]) {
  const went: ACallThatWentOut[] = [];
  const left = [...answers];

  const how: typeof fetch = async (where, asked) => {
    const headers = new Headers(asked?.headers);

    expect(asked?.method).toBe('POST');
    expect(headers.get('content-type')).toBe('application/x-www-form-urlencoded');

    went.push({ where: String(where), body: String(asked?.body) });

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

const theTokens = {
  status: 200,
  said: {
    id_token: 'an-id-token',
    access_token: 'an-access-token',
    refresh_token: 'a-refresh-token',
  },
};

const THE_ORIGIN = 'https://myemi.app';

/** What the press kept, read out of the store the press wrote it to. */
const whatWasKept = () => whatSheStarted();

/** The address a press hands the browser, read as its parts. */
async function thePressTakingHerTo(way: 'SignInWithApple' | 'Google'): Promise<URL> {
  return new URL(await whereAPressTakesHer(way, 'en', THE_ORIGIN));
}

describe('what a press on Apple or on Google does', () => {
  beforeEach(() => {
    forgetWhatSheStarted();
  });

  it.each(['SignInWithApple', 'Google'] as const)(
    'sends her straight to %s, so she never reads a page of the pool',
    async (way) => {
      const address = await thePressTakingHerTo(way);

      expect(`${address.origin}${address.pathname}`).toBe(`${THE_SIGN_IN_HOST}/oauth2/authorize`);
      expect(address.searchParams.get('identity_provider')).toBe(way);
      expect(address.searchParams.get('response_type')).toBe('code');
      expect(address.searchParams.get('client_id')).toBe(THE_WEBSITE_CLIENT_ID);
    },
  );

  it('asks for the subject and the address, and for nothing else', async () => {
    const address = await thePressTakingHerTo('Google');

    expect(address.searchParams.get('scope')).toBe('openid email');
    expect(THE_SCOPES).toEqual(['openid', 'email']);
    expect(address.searchParams.get('scope')).not.toContain('profile');
  });

  it('comes back to the page of the language she was reading', async () => {
    const address = await thePressTakingHerTo('Google');

    expect(address.searchParams.get('redirect_uri')).toBe(
      `${THE_ORIGIN}/en/${WHERE_SHE_COMES_BACK_TO}`,
    );
    expect(whereSheComesBackTo('ru', THE_ORIGIN)).toBe(`${THE_ORIGIN}/ru/sign-in/returning/`);
  });

  it('keeps a state and a verifier, and hands the pool the digest of the verifier', async () => {
    const address = await thePressTakingHerTo('SignInWithApple');
    const kept = whatWasKept();

    expect(kept?.way).toBe('SignInWithApple');
    expect(address.searchParams.get('state')).toBe(kept?.state);
    expect(address.searchParams.get('code_challenge_method')).toBe('S256');
    expect(address.searchParams.get('code_challenge')).toBe(
      await theChallengeFor(kept?.verifier ?? ''),
    );
    // The verifier itself stays in her browser until the exchange. An address carrying it would
    // hand the proof to whoever read the address.
    expect(address.search).not.toContain(kept?.verifier ?? 'nothing');
  });

  it('makes a value nobody can guess, and a fresh one each time', () => {
    const made = Array.from({ length: 50 }, aValueNobodyCanGuess);

    expect(new Set(made).size).toBe(made.length);
    // Base 64 of 32 bytes is 43 characters once the padding is off, and the three characters an
    // address reads are the only ones in it.
    for (const value of made) {
      expect(value).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(value.length).toBeGreaterThanOrEqual(Math.ceil((RANDOM_BYTES * 8) / 6));
    }
  });
});

describe('what the return does with the code', () => {
  beforeEach(() => {
    forgetWhatSheStarted();
  });

  it('exchanges the code for her tokens, and sends the verifier with it', async () => {
    const address = await thePressTakingHerTo('Google');
    const kept = whatWasKept();
    const pool = aPool([theTokens]);

    const held = await theTokensSheCameBackWith(
      `?code=a-code&state=${encodeURIComponent(kept?.state ?? '')}`,
      pool.how,
    );

    expect(held).toEqual({
      idToken: 'an-id-token',
      accessToken: 'an-access-token',
      refreshToken: 'a-refresh-token',
    });
    expect(pool.went).toHaveLength(1);
    expect(pool.went[0]?.where).toBe(`${THE_SIGN_IN_HOST}/oauth2/token`);

    const sent = new URLSearchParams(pool.went[0]?.body ?? '');

    expect(Object.fromEntries(sent)).toEqual({
      grant_type: 'authorization_code',
      client_id: THE_WEBSITE_CLIENT_ID,
      code: 'a-code',
      redirect_uri: `${address.searchParams.get('redirect_uri') ?? ''}`,
      code_verifier: kept?.verifier ?? '',
    });
  });

  it('refuses a state that is not the one this browser kept, and asks the pool nothing', async () => {
    await thePressTakingHerTo('Google');

    const pool = aPool([theTokens]);

    await expect(
      theTokensSheCameBackWith('?code=a-code&state=a-state-somebody-else-wrote', pool.how),
    ).rejects.toMatchObject({ because: 'theStateDidNotMatch' });
    // The whole point of the state. A code exchanged for a state this browser did not write would
    // sign her in to whichever account started that sign in.
    expect(pool.went).toEqual([]);
  });

  it('refuses a return with no state at all, and asks the pool nothing', async () => {
    await thePressTakingHerTo('Google');

    const pool = aPool([theTokens]);

    await expect(theTokensSheCameBackWith('?code=a-code', pool.how)).rejects.toMatchObject({
      because: 'theStateDidNotMatch',
    });
    expect(pool.went).toEqual([]);
  });

  it('refuses a return that no press of this browser started', async () => {
    const pool = aPool([theTokens]);

    await expect(
      theTokensSheCameBackWith('?code=a-code&state=a-state', pool.how),
    ).rejects.toMatchObject({ because: 'nothingWasStarted' });
    expect(pool.went).toEqual([]);
  });

  it('refuses a return that carries a refusal from the company, and asks the pool nothing', async () => {
    await thePressTakingHerTo('SignInWithApple');

    const kept = whatWasKept();
    const pool = aPool([theTokens]);

    await expect(
      theTokensSheCameBackWith(
        `?error=access_denied&state=${encodeURIComponent(kept?.state ?? '')}`,
        pool.how,
      ),
    ).rejects.toMatchObject({ because: 'theProviderSaidNo' });
    expect(pool.went).toEqual([]);
  });

  it('refuses a return with the right state and no code', async () => {
    await thePressTakingHerTo('Google');

    const kept = whatWasKept();
    const pool = aPool([theTokens]);

    await expect(
      theTokensSheCameBackWith(`?state=${encodeURIComponent(kept?.state ?? '')}`, pool.how),
    ).rejects.toMatchObject({ because: 'noCodeCameBack' });
    expect(pool.went).toEqual([]);
  });

  it.each([
    { what: 'a refusal from the pool', answer: { status: 400, said: { error: 'invalid_grant' } } },
    {
      what: 'an answer carrying one token and not the three',
      answer: { status: 200, said: { id_token: 'one token and no other' } },
    },
  ])('reads $what as a sign in that did not finish', async ({ answer }) => {
    await thePressTakingHerTo('Google');

    const kept = whatWasKept();
    const pool = aPool([answer]);

    await expect(
      theTokensSheCameBackWith(
        `?code=a-code&state=${encodeURIComponent(kept?.state ?? '')}`,
        pool.how,
      ),
    ).rejects.toMatchObject({ because: 'theServiceRefused' });
    expect(pool.went).toHaveLength(1);
  });

  it('tells a lost connection apart from a refusal', async () => {
    await thePressTakingHerTo('Google');

    const kept = whatWasKept();

    await expect(
      theTokensSheCameBackWith(
        `?code=a-code&state=${encodeURIComponent(kept?.state ?? '')}`,
        reachedNobody,
      ),
    ).rejects.toMatchObject({ because: 'nothingReachedTheService' });
  });

  it('reads nothing out of a kept value somebody rewrote', async () => {
    await thePressTakingHerTo('Google');

    expect(whatSheStarted()).not.toBeNull();

    globalThis.sessionStorage.setItem(WHAT_SHE_STARTED_ENTRY, 'not a sign in at all');

    expect(whatSheStarted()).toBeNull();

    globalThis.sessionStorage.setItem(WHAT_SHE_STARTED_ENTRY, JSON.stringify({ state: 'a-state' }));

    expect(whatSheStarted()).toBeNull();
  });

  it('carries the cause and nothing of hers', () => {
    const refused = new TheSignInDidNotFinish('theStateDidNotMatch');

    expect(refused.because).toBe('theStateDidNotMatch');
    expect(refused.name).toBe('TheSignInDidNotFinish');
    expect(refused).toBeInstanceOf(Error);
  });
});
