/**
 * The state machine of the custom sign in. The pool calls this trigger before each challenge and
 * after each answer, and it decides between asking, issuing tokens and refusing.
 *
 * It reads the session and nothing else. A user name the pool does not hold is given the challenge
 * here and refused by the verify trigger, so the two refusals read the same from outside.
 */

/** The challenge this sign in uses. The pool names it, and the create trigger issues it. */
export const customChallengeName = 'CUSTOM_CHALLENGE';

/** One answered challenge of the session, as the pool records it. */
export interface ChallengeResult {
  readonly challengeName: string;
  readonly challengeResult: boolean;
  readonly challengeMetadata?: string;
}

/** What this trigger decides from, and the three fields the pool reads back. */
export interface DefineAuthChallengeEvent {
  readonly request: {
    /** Every challenge of this sign in so far. It is empty on the first call. */
    readonly session?: readonly ChallengeResult[];
  };
  readonly response: {
    readonly challengeName?: string;
    readonly issueTokens?: boolean;
    readonly failAuthentication?: boolean;
  };
}

/**
 * The next move, or the event itself. An event this trigger does not recognise comes back
 * untouched, which the pool reads as the instruction to carry on with its own default action. That
 * is what leaves the sign in with a code alone.
 */
export function defineAuthChallenge(event: DefineAuthChallengeEvent): DefineAuthChallengeEvent {
  const session = event.request.session ?? [];

  if (session.length === 0) {
    return {
      ...event,
      response: {
        challengeName: customChallengeName,
        issueTokens: false,
        failAuthentication: false,
      },
    };
  }

  const answered = session.length === 1 ? session[0] : undefined;

  if (answered === undefined || answered.challengeName !== customChallengeName) {
    return event;
  }

  return {
    ...event,
    response: {
      issueTokens: answered.challengeResult,
      failAuthentication: !answered.challengeResult,
    },
  };
}
