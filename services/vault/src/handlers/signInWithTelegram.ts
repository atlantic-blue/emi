import type { RandomSource } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { OneTimeAnswerStore } from '../store/answers';
import {
  identityTokenFor,
  type PublishedKey,
  publishedKeysOnce,
  type ReachesTelegram,
} from '../telegram/exchange';
import { subjectIn } from '../telegram/identityToken';
import { oneTimeAnswerFor } from '../telegram/oneTimeAnswer';
import {
  botIdentifierParameter,
  clientSecretParameter,
  type ParameterStore,
  parameterHeld,
  saltHeldOrMade,
} from '../telegram/parameters';
import { poolUserHeldOrMade, type UserPool } from '../telegram/pool';
import { poolUserNameFor } from '../telegram/userName';

/**
 * The sign in with Telegram, which is the one way into the account that never opens a page of the
 * pool. It is the second call of this api with no authorizer: a woman signing in holds no device
 * key for the account she is reaching, so there is no signature to check her against.
 *
 * She presses, Telegram answers her surface with a code, and this function turns that code into a
 * pool user name and one answer that is good for one challenge. Telegram learns nothing about her
 * days, and Emi learns nothing about her but a subject it immediately hashes under a salt.
 *
 * The identity token stops here. No part of it reaches a caller, a log line or the table.
 */

/** What a sign in body holds: the code, the value its challenge was made from, and a nonce. */
interface WhatSheCameBackWith {
  readonly code?: unknown;
  readonly codeVerifier?: unknown;
  readonly nonce?: unknown;
}

interface TheCodeAndItsVerifier {
  readonly code: string;
  readonly codeVerifier: string;
  readonly nonce?: string;
}

/** What the sign in is bound to: three ports, one way to reach Telegram, and a random source. */
export interface WhatTheSignInNeeds {
  readonly parameters: ParameterStore;
  readonly reaches: ReachesTelegram;
  readonly pool: UserPool;
  /**
   * The write half of the answer store, and never the spend: the three triggers hold that one,
   * so neither role can do the other role's half of the sign in.
   */
  readonly answers: Pick<OneTimeAnswerStore, 'writeAnswer'>;
  readonly random: RandomSource;
}

/** What it holds for the life of one container, which is everything above and the published set. */
export interface WhatTheSignInHolds extends WhatTheSignInNeeds {
  readonly publishedKeys: () => Promise<readonly PublishedKey[]>;
}

/** What a caller is told when a body carries no code. It names the two fields and nothing else. */
export const theBodyASignInTakes = 'a sign in body holds a code and a code verifier, both as text';

/**
 * What a caller is told when the sign in does not finish. Every refusal reads the same, from a
 * code Telegram would not exchange to a token minted for another bot, so nobody can ask this api
 * which of the checks said no.
 */
export const thatCodeSignedNobodyIn = 'that code did not sign anybody in';

function textIn(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function cameBackWith(body: string): TheCodeAndItsVerifier | null {
  let read: WhatSheCameBackWith;

  try {
    read = JSON.parse(body) as WhatSheCameBackWith;
  } catch {
    return null;
  }

  const code = textIn(read?.code);
  const codeVerifier = textIn(read?.codeVerifier);
  const nonce = textIn(read?.nonce);

  if (code === null || codeVerifier === null) {
    return null;
  }

  return nonce === null ? { code, codeVerifier } : { code, codeVerifier, nonce };
}

/**
 * The seven things the sign in does, in this order: it reads what it holds, it exchanges the code,
 * it reads the token, it makes the user name, it holds the user in the pool, it writes the digest
 * of one answer, and it answers with the user name and that answer.
 */
export async function signInWithTelegram(
  event: HttpRequestEvent,
  holds: WhatTheSignInHolds,
  now: Date,
): Promise<HttpResponse> {
  const came = cameBackWith(bodyTextOf(event));

  if (came === null) {
    return refusal(400, theBodyASignInTakes);
  }

  const botIdentifier = await parameterHeld(holds.parameters, botIdentifierParameter);
  const clientSecret = await parameterHeld(holds.parameters, clientSecretParameter);
  const salt = await saltHeldOrMade(holds.parameters, holds.random);

  const token = await identityTokenFor(
    { code: came.code, codeVerifier: came.codeVerifier, botIdentifier, clientSecret },
    holds.reaches,
  );

  if (token === null) {
    return refusal(403, thatCodeSignedNobodyIn);
  }

  const read = subjectIn(token, {
    publishedKeys: await holds.publishedKeys(),
    botIdentifier,
    now,
    ...(came.nonce === undefined ? {} : { nonce: came.nonce }),
  });

  if ('refusal' in read) {
    return refusal(403, thatCodeSignedNobodyIn);
  }

  const userName = poolUserNameFor(read.subject, salt);

  await poolUserHeldOrMade(holds.pool, userName, holds.random);

  const made = oneTimeAnswerFor(userName, now, holds.random);

  await holds.answers.writeAnswer(made.written);

  return answer(200, { userName, answer: made.answer });
}

/**
 * The route the api calls. The published set is read once here rather than once a request, so a
 * container pays for it on its first sign in and never again.
 */
export function signInTelegram(
  needs: WhatTheSignInNeeds,
  clock: () => Date = () => new Date(),
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  const publishedKeys = publishedKeysOnce(needs.reaches);

  return (event) => signInWithTelegram(event, { ...needs, publishedKeys }, clock());
}
