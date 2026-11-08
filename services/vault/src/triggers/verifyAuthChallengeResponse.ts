import { answerDigestIn, answerIsFresh, type OneTimeAnswerStore } from '../store/answers';

/**
 * The answer, read. This is the one trigger that reaches the table, and the one place a Telegram
 * sign in is either accepted or refused.
 *
 * It holds no secret. The salt and the client secret belong to the function that answered the
 * code, so nothing the pool can call is able to read either of them.
 */

/** What this trigger is handed: the user name of the session, and the answer she presented. */
export interface VerifyAuthChallengeEvent {
  readonly userName: string;
  readonly request: {
    /** The one time answer, as base 64. The caller chose the text, so any text may arrive. */
    readonly challengeAnswer: string;
    /** True when the pool holds no user of that name, which is answered as a wrong answer. */
    readonly userNotFound?: boolean;
  };
  readonly response: {
    readonly answerCorrect?: boolean;
  };
}

/**
 * Three things make an answer right: the item was there, it names this user, and it was issued
 * inside the window. The instant comes from the item rather than from its time to live, because
 * the table removes an expired item some time after it expires.
 *
 * The item is spent whether or not the answer turns out to be right, so a stale answer cannot be
 * presented a second time.
 */
export async function verifyAuthChallengeResponse(
  event: VerifyAuthChallengeEvent,
  store: OneTimeAnswerStore,
  now: Date,
): Promise<VerifyAuthChallengeEvent> {
  const digest = answerDigestIn(event.request.challengeAnswer);
  const spent = digest === null ? undefined : await store.spendAnswer(digest);

  const correct =
    spent !== undefined &&
    event.request.userNotFound !== true &&
    spent.userName === event.userName &&
    answerIsFresh(spent.issuedAt, now);

  return { ...event, response: { answerCorrect: correct } };
}

/** The trigger the pool calls, with its storage and its clock bound to it. */
export function verifyAuthChallenge(
  store: OneTimeAnswerStore,
  clock: () => Date = () => new Date(),
): (event: VerifyAuthChallengeEvent) => Promise<VerifyAuthChallengeEvent> {
  return (event) => verifyAuthChallengeResponse(event, store, clock());
}
