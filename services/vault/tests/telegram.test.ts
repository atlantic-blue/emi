import { generateKeyPairSync, sign } from 'node:crypto';

import { base64Of, type RandomSource } from '@emi/crypto';

import { type HttpResponse } from '../src/api';
import {
  signInTelegram,
  signInWithTelegram,
  theBodyASignInTakes,
  thatCodeSignedNobodyIn,
} from '../src/handlers/signInWithTelegram';
import {
  type AskedOf,
  type PublishedKey,
  publishedKeysAddress,
  publishedKeysOnce,
  type ReachesTelegram,
  redirectAddress,
  telegramIssuer,
  tokenAddress,
} from '../src/telegram/exchange';
import { subjectIn } from '../src/telegram/identityToken';
import {
  digestOfOneTimeAnswer,
  oneTimeAnswerLivesForSeconds,
  type OneTimeAnswerWriter,
  type WrittenOneTimeAnswer,
} from '../src/telegram/oneTimeAnswer';
import {
  botIdentifierParameter,
  clientSecretParameter,
  type ParameterStore,
  type ParameterWrite,
  saltBytes,
  saltParameter,
} from '../src/telegram/parameters';
import { type MadeThePoolUser, type PoolUser, type UserPool } from '../src/telegram/pool';
import { poolUserNameFor, telegramUserNamePrefix } from '../src/telegram/userName';
import { requestEvent } from './fixtures/requests';

/**
 * The function that answers a Telegram code, driven end to end against four doubles: a token
 * endpoint, a published set signed by a key pair this file makes, a parameter store and a pool.
 *
 * Nothing here reaches Telegram, the parameter store or the pool, and no case needs a live sign in
 * to refuse something. Rules 27 to 33 of the design each have a case below.
 */

const signedAt = new Date('2026-11-08T10:00:00.000Z');
const atSeconds = Math.floor(signedAt.getTime() / 1000);

/** The bot identifier Emi holds, which is the client identifier and the audience in one value. */
const botIdentifier = '9068004348';
/** A stand in for the value a person copies off the screen that shows it. Not a credential. */
const clientSecret = 'not-the-real-one';
const subject = '482910384';
const anotherSubject = '913847563';
const keyIdentifier = 'the-one-telegram-signs-with';

const theSalt = new Uint8Array(saltBytes).map((_, at) => (at * 11 + 3) % 256);
const anotherSalt = new Uint8Array(saltBytes).map((_, at) => (at * 13 + 7) % 256);

const signer = generateKeyPairSync('rsa', { modulusLength: 2048 });
const stranger = generateKeyPairSync('rsa', { modulusLength: 2048 });

function asAnAddressCarriesIt(bytes: Uint8Array): string {
  return base64Of(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function partOf(value: unknown): string {
  return asAnAddressCarriesIt(new TextEncoder().encode(JSON.stringify(value)));
}

/** The set as Telegram publishes it, with the identifier and the algorithm named on the member. */
function thePublishedSet(): readonly PublishedKey[] {
  const held = signer.publicKey.export({ format: 'jwk' });

  return [{ ...held, kid: keyIdentifier, alg: 'RS256' }];
}

interface ATokenToSign {
  readonly claims?: Readonly<Record<string, unknown>>;
  readonly header?: Readonly<Record<string, unknown>>;
  readonly signedBy?: 'telegram' | 'a-stranger' | 'nobody';
}

/** An identity token as Telegram mints one, with any part of it moved for a case. */
function aTelegramToken(moved: ATokenToSign = {}): string {
  const header = partOf({ alg: 'RS256', kid: keyIdentifier, typ: 'JWT', ...moved.header });
  const claims = partOf({
    iss: telegramIssuer,
    aud: botIdentifier,
    sub: subject,
    iat: atSeconds,
    exp: atSeconds + 300,
    ...moved.claims,
  });

  if (moved.signedBy === 'nobody') {
    return `${header}.${claims}.${asAnAddressCarriesIt(new Uint8Array(256).fill(9))}`;
  }

  const signed = sign(
    'sha256',
    new TextEncoder().encode(`${header}.${claims}`),
    moved.signedBy === 'a-stranger' ? stranger.privateKey : signer.privateKey,
  );

  return `${header}.${claims}.${asAnAddressCarriesIt(new Uint8Array(signed))}`;
}

interface FakeParameters extends ParameterStore {
  /** Every name a read asked for, in order, so a test counts the reads of one parameter. */
  reads(): readonly string[];
  /** Every write that was attempted, as the name and the value. */
  writes(): readonly { readonly name: string; readonly value: string }[];
}

function fakeParameters(held: Readonly<Record<string, string>> = {}): FakeParameters {
  const values = new Map(Object.entries(held));
  const read: string[] = [];
  const written: { name: string; value: string }[] = [];

  return {
    reads: () => [...read],
    writes: () => [...written],

    read: (name: string): Promise<string | undefined> => {
      read.push(name);

      return Promise.resolve(values.get(name));
    },

    writeIfAbsent: (name: string, value: string): Promise<ParameterWrite> => {
      written.push({ name, value });

      if (values.has(name)) {
        return Promise.resolve('already-there');
      }

      values.set(name, value);

      return Promise.resolve('written');
    },
  };
}

interface WhatTelegramAnswers {
  /** The token the exchange answers with. Nothing at all leaves the exchange refused. */
  readonly token?: string | null;
  /** The status the exchange answers with, where a case needs a refusal. */
  readonly exchangeStatus?: number;
  /** The set the read answers with, where a case needs another one. */
  readonly publishedKeys?: readonly PublishedKey[];
}

interface FakeTelegram {
  readonly reaches: ReachesTelegram;
  /** Every call made, as the address and what was sent, so a test reads the request itself. */
  calls(): readonly { readonly address: string; readonly asked: AskedOf }[];
}

function fakeTelegram(answers: WhatTelegramAnswers = {}): FakeTelegram {
  const made: { address: string; asked: AskedOf }[] = [];

  return {
    calls: () => [...made],

    reaches: (address: string, asked: AskedOf) => {
      made.push({ address, asked });

      if (address === publishedKeysAddress) {
        return Promise.resolve({
          status: 200,
          body: JSON.stringify({ keys: answers.publishedKeys ?? thePublishedSet() }),
        });
      }

      const token = answers.token === undefined ? aTelegramToken() : answers.token;

      return Promise.resolve({
        status: answers.exchangeStatus ?? 200,
        body: JSON.stringify(token === null ? { error: 'invalid_grant' } : { id_token: token }),
      });
    },
  };
}

interface FakePool extends UserPool {
  /** Every create that was attempted, in order. */
  made(): readonly PoolUser[];
  /** Every user name a permanent password was set on. */
  gainedAPassword(): readonly string[];
}

interface WhatThePoolDoes {
  /** True where the pool refuses a user with no password, which is the second path. */
  readonly needsAPassword?: boolean;
  /** User names the pool holds already, which is a woman signing in again. */
  readonly holdsAlready?: readonly string[];
}

function fakePool(does: WhatThePoolDoes = {}): FakePool {
  const held = new Set(does.holdsAlready ?? []);
  const asked: PoolUser[] = [];
  const passwords: string[] = [];

  return {
    made: () => [...asked],
    gainedAPassword: () => [...passwords],

    createUser: (user: PoolUser): Promise<MadeThePoolUser> => {
      asked.push(user);

      if (held.has(user.userName)) {
        return Promise.resolve('already-there');
      }

      if (does.needsAPassword === true && user.password === undefined) {
        return Promise.resolve('a-password-is-needed');
      }

      held.add(user.userName);

      return Promise.resolve('made');
    },

    setPermanentPassword: (userName: string): Promise<void> => {
      passwords.push(userName);

      return Promise.resolve();
    },
  };
}

interface FakeAnswers extends OneTimeAnswerWriter {
  /** Every answer written down, as the record the table would hold. */
  written(): readonly WrittenOneTimeAnswer[];
}

function fakeAnswers(): FakeAnswers {
  const held: WrittenOneTimeAnswer[] = [];

  return {
    written: () => [...held],

    writeOneTimeAnswer: (written: WrittenOneTimeAnswer): Promise<void> => {
      held.push(written);

      return Promise.resolve();
    },
  };
}

/** A source that answers differently each time, so one request's values are told apart. */
function risingBytes(): (count: number) => Uint8Array {
  let drawn = 0;

  return (count: number) => {
    drawn += 1;

    return new Uint8Array(count).map((_, at) => (at + drawn * 29) % 256);
  };
}

/** What a case changes about the sign in it drives. Everything it leaves out is an ordinary one. */
interface HowItIsBound {
  readonly parameters?: FakeParameters;
  readonly reaches?: ReachesTelegram;
  readonly pool?: FakePool;
  readonly answers?: FakeAnswers;
  readonly random?: RandomSource;
  /** The parameters the store holds, where a case needs one of them absent or wrong. */
  readonly held?: Readonly<Record<string, string>>;
}

interface TheSignInUnderTest {
  readonly answer: (body: unknown) => Promise<HttpResponse>;
  readonly parameters: FakeParameters;
  readonly telegram: FakeTelegram;
  readonly pool: FakePool;
  readonly answers: FakeAnswers;
}

const everythingItNeeds = {
  [botIdentifierParameter]: botIdentifier,
  [clientSecretParameter]: clientSecret,
  [saltParameter]: base64Of(theSalt),
};

function aSignIn(how: HowItIsBound = {}): TheSignInUnderTest {
  const parameters = how.parameters ?? fakeParameters(how.held ?? everythingItNeeds);
  const telegram = fakeTelegram();
  const reaches = how.reaches ?? telegram.reaches;
  const pool = how.pool ?? fakePool();
  const answers = how.answers ?? fakeAnswers();
  const random = how.random ?? risingBytes();

  const bound = signInTelegram({ parameters, reaches, pool, answers, random }, () => signedAt);

  return {
    answer: (body: unknown) =>
      bound(
        requestEvent(
          {
            method: 'POST',
            path: '/v1/sign-in/telegram',
            body: typeof body === 'string' ? body : JSON.stringify(body),
            instant: signedAt,
          },
          {},
        ),
      ),
    parameters,
    telegram,
    pool,
    answers,
  };
}

const sheCameBackWith = { code: 'the-code-telegram-gave-her', codeVerifier: 'the-value-she-kept' };

const bodyOf = (response: { body: string }): Record<string, unknown> =>
  JSON.parse(response.body) as Record<string, unknown>;

describe('the function that answers a Telegram code', () => {
  describe('a code Telegram exchanges for a token it signed', () => {
    it('answers with the pool user name the salt and the subject make', async () => {
      const signIn = aSignIn();

      const response = await signIn.answer(sheCameBackWith);

      expect(response.statusCode).toBe(200);
      expect(bodyOf(response).userName).toBe(poolUserNameFor(subject, theSalt));
    });

    it('answers with a one time answer, and writes down only its digest', async () => {
      const signIn = aSignIn();

      const response = await signIn.answer(sheCameBackWith);
      const given = bodyOf(response).answer as string;
      const [written] = signIn.answers.written();

      expect(given.length).toBeGreaterThan(0);
      expect(written?.digest).toBe(digestOfOneTimeAnswer(given));
      expect(JSON.stringify(written)).not.toContain(given);
    });

    it('writes the answer down under the user name, and lets it go in two minutes', async () => {
      const signIn = aSignIn();

      await signIn.answer(sheCameBackWith);
      const [written] = signIn.answers.written();

      expect(written?.userName).toBe(poolUserNameFor(subject, theSalt));
      expect(written?.issuedAt).toBe(signedAt.toISOString());
      expect(written?.expiresAt).toBe(atSeconds + oneTimeAnswerLivesForSeconds);
    });

    it('makes the pool user, asking the pool for no password and no attribute', async () => {
      const signIn = aSignIn();

      await signIn.answer(sheCameBackWith);

      expect(signIn.pool.made()).toEqual([{ userName: poolUserNameFor(subject, theSalt) }]);
      expect(signIn.pool.gainedAPassword()).toEqual([]);
    });

    it('finds the user rather than making one when she signs in again', async () => {
      const pool = fakePool({ holdsAlready: [poolUserNameFor(subject, theSalt)] });
      const signIn = aSignIn({ pool });

      const response = await signIn.answer(sheCameBackWith);

      expect(response.statusCode).toBe(200);
      expect(pool.made()).toHaveLength(1);
      expect(pool.gainedAPassword()).toEqual([]);
    });
  });

  describe('a pool that refuses a user with no password', () => {
    it('sends a generated one and makes it permanent, so the user is confirmed', async () => {
      const pool = fakePool({ needsAPassword: true });
      const signIn = aSignIn({ pool });

      const response = await signIn.answer(sheCameBackWith);
      const userName = poolUserNameFor(subject, theSalt);

      expect(response.statusCode).toBe(200);
      expect(pool.made()).toHaveLength(2);
      expect(pool.made()[1]?.password).toEqual(expect.any(String));
      expect(pool.gainedAPassword()).toEqual([userName]);
    });

    it('tells the caller nothing about the password, and writes it nowhere', async () => {
      const pool = fakePool({ needsAPassword: true });
      const signIn = aSignIn({ pool });

      const response = await signIn.answer(sheCameBackWith);
      const password = pool.made()[1]?.password as string;

      expect(response.body).not.toContain(password);
      expect(JSON.stringify(signIn.answers.written())).not.toContain(password);
      expect(JSON.stringify(signIn.parameters.writes())).not.toContain(password);
    });
  });

  describe('what it sends Telegram', () => {
    it('sends the client secret as basic authorization, and in nothing else', async () => {
      const signIn = aSignIn();

      await signIn.answer(sheCameBackWith);
      const exchange = signIn.telegram.calls().find((call) => call.address === tokenAddress);
      const expected = base64Of(new TextEncoder().encode(`${botIdentifier}:${clientSecret}`));

      expect(exchange?.asked.headers.authorization).toBe(`Basic ${expected}`);
      expect(exchange?.asked.body).not.toContain(clientSecret);
      expect(exchange?.address).not.toContain(clientSecret);
    });

    it('sends the redirect address it holds itself, whatever the body asks for', async () => {
      const signIn = aSignIn();

      await signIn.answer({
        ...sheCameBackWith,
        redirectUri: 'https://somewhere-else.example/sign-in/',
      });
      const exchange = signIn.telegram.calls().find((call) => call.address === tokenAddress);
      const sent = new URLSearchParams(exchange?.asked.body ?? '');

      expect(sent.get('redirect_uri')).toBe(redirectAddress);
      expect(exchange?.asked.body).not.toContain('somewhere-else.example');
    });

    it('sends the code and the value she kept, and asks for an authorization code', async () => {
      const signIn = aSignIn();

      await signIn.answer(sheCameBackWith);
      const exchange = signIn.telegram.calls().find((call) => call.address === tokenAddress);
      const sent = new URLSearchParams(exchange?.asked.body ?? '');

      expect(sent.get('code')).toBe(sheCameBackWith.code);
      expect(sent.get('code_verifier')).toBe(sheCameBackWith.codeVerifier);
      expect(sent.get('grant_type')).toBe('authorization_code');
    });
  });

  describe('the published set', () => {
    it('is read once for a container, however many sign ins it answers', async () => {
      const signIn = aSignIn();

      await signIn.answer(sheCameBackWith);
      await signIn.answer(sheCameBackWith);

      const reads = signIn.telegram.calls().filter((call) => call.address === publishedKeysAddress);

      expect(reads).toHaveLength(1);
      expect(signIn.telegram.calls().filter((call) => call.address === tokenAddress)).toHaveLength(
        2,
      );
    });

    it('is read again by the next sign in when the read answered with nothing', async () => {
      let answered = 0;
      const reaches: ReachesTelegram = (address) => {
        if (address !== publishedKeysAddress) {
          return Promise.resolve({ status: 200, body: JSON.stringify({ id_token: 'a.b.c' }) });
        }

        answered += 1;

        return Promise.resolve(
          answered === 1 ? { status: 500, body: '' } : { status: 200, body: '{"keys":[]}' },
        );
      };
      const read = publishedKeysOnce(reaches);

      expect(await read()).toEqual([]);
      expect(await read()).toEqual([]);
      expect(answered).toBe(2);
    });
  });

  describe('a token it refuses', () => {
    const refusalFor = async (moved: ATokenToSign): Promise<{ statusCode: number }> => {
      const telegram = fakeTelegram({ token: aTelegramToken(moved) });
      const signIn = aSignIn({ reaches: telegram.reaches });

      return signIn.answer(sheCameBackWith);
    };

    const readWith = (moved: ATokenToSign, nonce?: string) =>
      subjectIn(aTelegramToken(moved), {
        publishedKeys: thePublishedSet(),
        botIdentifier,
        now: signedAt,
        ...(nonce === undefined ? {} : { nonce }),
      });

    it('reads the subject when every rule holds', () => {
      expect(readWith({})).toEqual({ subject });
    });

    it('refuses a token whose life has run out', async () => {
      const moved = { claims: { exp: atSeconds - 1 } };

      expect(readWith(moved)).toEqual({ refusal: 'the-token-has-expired' });
      expect((await refusalFor(moved)).statusCode).toBe(403);
    });

    it('refuses a token made more than five minutes ago, though it has not expired', async () => {
      const moved = { claims: { iat: atSeconds - 301, exp: atSeconds + 600 } };

      expect(readWith(moved)).toEqual({ refusal: 'the-token-was-not-made-just-now' });
      expect((await refusalFor(moved)).statusCode).toBe(403);
    });

    it('refuses a token minted for another bot, signed by the same set', async () => {
      const moved = { claims: { aud: '1234567890' } };

      expect(readWith(moved)).toEqual({ refusal: 'the-audience-is-not-this-bot' });
      expect((await refusalFor(moved)).statusCode).toBe(403);
    });

    it('refuses a token naming an issuer that is not the login', async () => {
      const moved = { claims: { iss: 'https://oauth.telegram.example' } };

      expect(readWith(moved)).toEqual({ refusal: 'the-issuer-is-not-telegram' });
      expect((await refusalFor(moved)).statusCode).toBe(403);
    });

    it('refuses a token another key pair signed', async () => {
      const moved = { signedBy: 'a-stranger' } as const;

      expect(readWith(moved)).toEqual({ refusal: 'the-signature-does-not-verify' });
      expect((await refusalFor(moved)).statusCode).toBe(403);
    });

    it('refuses a token whose signature is not a signature at all', async () => {
      const moved = { signedBy: 'nobody' } as const;

      expect(readWith(moved)).toEqual({ refusal: 'the-signature-does-not-verify' });
      expect((await refusalFor(moved)).statusCode).toBe(403);
    });

    it('refuses a token whose header names a key the set does not hold', async () => {
      const moved = { header: { kid: 'one-nobody-published' } };

      expect(readWith(moved)).toEqual({ refusal: 'no-published-key-has-that-identifier' });
      expect((await refusalFor(moved)).statusCode).toBe(403);
    });

    it('refuses a token that names no key at all', () => {
      expect(readWith({ header: { kid: undefined } })).toEqual({
        refusal: 'no-published-key-has-that-identifier',
      });
    });

    it('refuses a token signed with no algorithm, and one signed with another', async () => {
      expect(readWith({ header: { alg: 'none' } })).toEqual({
        refusal: 'the-algorithm-is-not-the-one-telegram-signs-with',
      });
      expect(readWith({ header: { alg: 'HS256' } })).toEqual({
        refusal: 'the-algorithm-is-not-the-one-telegram-signs-with',
      });
      expect((await refusalFor({ header: { alg: 'none' } })).statusCode).toBe(403);
    });

    it('refuses a token carrying a nonce that is not the one the surface sent', () => {
      expect(readWith({ claims: { nonce: 'another' } }, 'the-one-she-sent')).toEqual({
        refusal: 'the-nonce-is-not-the-one-that-was-sent',
      });
      expect(readWith({ claims: { nonce: 'the-one-she-sent' } }, 'the-one-she-sent')).toEqual({
        subject,
      });
    });

    it('refuses a token carrying no subject, and one that is not three parts', () => {
      expect(readWith({ claims: { sub: '' } })).toEqual({
        refusal: 'the-token-carries-no-subject',
      });
      expect(
        subjectIn('two.parts', { publishedKeys: thePublishedSet(), botIdentifier, now: signedAt }),
      ).toEqual({ refusal: 'the-token-is-not-three-parts' });
    });

    it('writes nothing down and makes no pool user when the token is refused', async () => {
      const telegram = fakeTelegram({ token: aTelegramToken({ claims: { aud: 'another-bot' } }) });
      const signIn = aSignIn({ reaches: telegram.reaches });

      const response = await signIn.answer(sheCameBackWith);

      expect(response.statusCode).toBe(403);
      expect(bodyOf(response).error).toBe(thatCodeSignedNobodyIn);
      expect(signIn.answers.written()).toEqual([]);
      expect(signIn.pool.made()).toEqual([]);
    });
  });

  describe('a code Telegram will not exchange', () => {
    it('is refused in the words a refused token is refused in', async () => {
      const telegram = fakeTelegram({ token: null, exchangeStatus: 400 });
      const signIn = aSignIn({ reaches: telegram.reaches });

      const response = await signIn.answer(sheCameBackWith);

      expect(response.statusCode).toBe(403);
      expect(bodyOf(response).error).toBe(thatCodeSignedNobodyIn);
    });

    it('is refused when nothing reaches Telegram at all', async () => {
      const reaches: ReachesTelegram = (address) =>
        address === publishedKeysAddress
          ? Promise.resolve({ status: 200, body: JSON.stringify({ keys: thePublishedSet() }) })
          : Promise.reject(new Error('nothing answered'));
      const signIn = aSignIn({ reaches });

      const response = await signIn.answer(sheCameBackWith);

      expect(response.statusCode).toBe(403);
      expect(bodyOf(response).error).toBe(thatCodeSignedNobodyIn);
    });
  });

  describe('a body that is not a code and a verifier', () => {
    it('is refused with the two fields named, and nothing is sent to Telegram', async () => {
      const signIn = aSignIn();

      const response = await signIn.answer({ code: 'she-sent-no-verifier' });

      expect(response.statusCode).toBe(400);
      expect(bodyOf(response).error).toBe(theBodyASignInTakes);
      expect(signIn.telegram.calls().filter((call) => call.address === tokenAddress)).toEqual([]);
    });

    it('is refused when the body is not readable at all', async () => {
      const signIn = aSignIn();

      const response = await signIn.answer('{');

      expect(response.statusCode).toBe(400);
      expect(bodyOf(response).error).toBe(theBodyASignInTakes);
    });
  });

  describe('the pool user name', () => {
    it('opens with the three characters that say which way in she came', () => {
      expect(poolUserNameFor(subject, theSalt).startsWith(telegramUserNamePrefix)).toBe(true);
      expect(poolUserNameFor(subject, theSalt)).toHaveLength(29);
    });

    it('is the same name every time for one subject, and a different one for another', () => {
      expect(poolUserNameFor(subject, theSalt)).toBe(poolUserNameFor(subject, theSalt));
      expect(poolUserNameFor(anotherSubject, theSalt)).not.toBe(poolUserNameFor(subject, theSalt));
    });

    it('moves for both subjects when the salt moves, so the salt is never replaced', () => {
      expect(poolUserNameFor(subject, anotherSalt)).not.toBe(poolUserNameFor(subject, theSalt));
      expect(poolUserNameFor(anotherSubject, anotherSalt)).not.toBe(
        poolUserNameFor(anotherSubject, theSalt),
      );
    });

    it('carries no part of the subject it was made from', () => {
      expect(poolUserNameFor(subject, theSalt)).not.toContain(subject);
    });

    it('is refused where the salt is not the length a salt is', () => {
      expect(() => poolUserNameFor(subject, new Uint8Array(8))).toThrow(
        `a salt is ${saltBytes} bytes and this one is 8`,
      );
    });
  });

  describe('the salt', () => {
    it('is made once, with no overwrite, however many sign ins find it absent', async () => {
      const parameters = fakeParameters({
        [botIdentifierParameter]: botIdentifier,
        [clientSecretParameter]: clientSecret,
      });
      const signIn = aSignIn({ parameters });

      const first = await signIn.answer(sheCameBackWith);
      const second = await signIn.answer(sheCameBackWith);

      expect(parameters.writes().map((written) => written.name)).toEqual([saltParameter]);
      expect(bodyOf(first).userName).toBe(bodyOf(second).userName);
    });

    it('is made of the bytes of the platform, as base 64 of a value this long', async () => {
      const parameters = fakeParameters({
        [botIdentifierParameter]: botIdentifier,
        [clientSecretParameter]: clientSecret,
      });

      await aSignIn({ parameters }).answer(sheCameBackWith);
      const [written] = parameters.writes();

      expect(written?.name).toBe(saltParameter);
      expect(new Uint8Array(Buffer.from(written?.value ?? '', 'base64'))).toHaveLength(saltBytes);
    });

    it('is read rather than replaced where a sign in finds one, and nothing is written', async () => {
      const signIn = aSignIn();

      await signIn.answer(sheCameBackWith);

      expect(signIn.parameters.writes()).toEqual([]);
      expect(signIn.parameters.reads()).toContain(saltParameter);
    });

    it('is the value that won where another container wrote one first', async () => {
      const parameters = fakeParameters({
        [botIdentifierParameter]: botIdentifier,
        [clientSecretParameter]: clientSecret,
      });
      const anotherContainerGetsThereFirst: FakeParameters = {
        reads: parameters.reads,
        writes: parameters.writes,
        read: parameters.read,
        writeIfAbsent: async (name, value) => {
          await parameters.writeIfAbsent(saltParameter, base64Of(theSalt));

          return parameters.writeIfAbsent(name, value);
        },
      };
      const signIn = aSignIn({ parameters: anotherContainerGetsThereFirst });

      const response = await signIn.answer(sheCameBackWith);

      expect(bodyOf(response).userName).toBe(poolUserNameFor(subject, theSalt));
    });
  });

  describe('what the caller is told', () => {
    it('is the user name and the answer, and no third field', async () => {
      const signIn = aSignIn();

      const response = await signIn.answer(sheCameBackWith);

      expect(Object.keys(bodyOf(response)).sort()).toEqual(['answer', 'userName']);
    });

    it('carries no field of the identity token, and no part of the token itself', async () => {
      const telegram = fakeTelegram();
      const signIn = aSignIn({ reaches: telegram.reaches });
      const token = aTelegramToken();

      const response = await signIn.answer(sheCameBackWith);

      expect(response.body).not.toContain(subject);
      expect(response.body).not.toContain(telegramIssuer);
      for (const part of token.split('.')) {
        expect(response.body).not.toContain(part);
      }
    });

    it('carries nothing that was read from the parameter store', async () => {
      const signIn = aSignIn();

      const response = await signIn.answer(sheCameBackWith);

      expect(response.body).not.toContain(clientSecret);
      expect(response.body).not.toContain(base64Of(theSalt));
      expect(response.body).not.toContain(botIdentifier);
    });
  });

  describe('what reaches a log line', () => {
    it('is nothing at all, on a sign in and on a refusal', async () => {
      const written: unknown[] = [];
      const watching = (['log', 'info', 'warn', 'error', 'debug'] as const).map((name) =>
        jest.spyOn(console, name).mockImplementation((...said: unknown[]) => {
          written.push(...said);
        }),
      );

      try {
        await aSignIn().answer(sheCameBackWith);
        const telegram = fakeTelegram({ token: aTelegramToken({ claims: { aud: 'another' } }) });

        await aSignIn({ reaches: telegram.reaches }).answer(sheCameBackWith);

        expect(written).toEqual([]);
      } finally {
        for (const watch of watching) {
          watch.mockRestore();
        }
      }
    });
  });

  describe('a parameter the sign in cannot work without', () => {
    it('stops the sign in, and the message names the parameter and never a value', async () => {
      const signIn = aSignIn({ held: { [botIdentifierParameter]: botIdentifier } });

      await expect(signIn.answer(sheCameBackWith)).rejects.toThrow(
        `the parameter ${clientSecretParameter} holds no value`,
      );
    });

    it('stops the sign in where the salt it holds is not a salt', async () => {
      const signIn = aSignIn({
        held: { ...everythingItNeeds, [saltParameter]: base64Of(new Uint8Array(8)) },
      });

      await expect(signIn.answer(sheCameBackWith)).rejects.toThrow(
        `the parameter ${saltParameter} holds 8 bytes and a salt is ${saltBytes}`,
      );
    });
  });

  describe('the function the api is given', () => {
    it('reads the clock itself, so a request carries no instant of its own', async () => {
      const parameters = fakeParameters(everythingItNeeds);
      const rightNow = Math.floor(new Date().getTime() / 1000);
      const telegram = fakeTelegram({
        token: aTelegramToken({ claims: { iat: rightNow, exp: rightNow + 300 } }),
      });
      const answers = fakeAnswers();
      const bound = signInTelegram({
        parameters,
        reaches: telegram.reaches,
        pool: fakePool(),
        answers,
        random: risingBytes(),
      });

      await bound(
        requestEvent(
          {
            method: 'POST',
            path: '/v1/sign-in/telegram',
            body: JSON.stringify(sheCameBackWith),
            instant: signedAt,
          },
          {},
        ),
      );

      const issued = new Date(answers.written()[0]?.issuedAt ?? 0).getTime();

      expect(Math.abs(issued - rightNow * 1000)).toBeLessThan(60000);
    });

    it('is the same function the api route names, driven with the instant it is given', async () => {
      const telegram = fakeTelegram();
      const answers = fakeAnswers();

      const response = await signInWithTelegram(
        requestEvent(
          {
            method: 'POST',
            path: '/v1/sign-in/telegram',
            body: JSON.stringify(sheCameBackWith),
            instant: signedAt,
          },
          {},
        ),
        {
          parameters: fakeParameters(everythingItNeeds),
          reaches: telegram.reaches,
          pool: fakePool(),
          answers,
          random: risingBytes(),
          publishedKeys: () => Promise.resolve(thePublishedSet()),
        },
        signedAt,
      );

      expect(response.statusCode).toBe(200);
      expect(answers.written()[0]?.issuedAt).toBe(signedAt.toISOString());
    });
  });
});
