/**
 * The challenge, issued. It asks her nothing, because she already holds the answer: the sign in
 * function gave it to her surface with the user name, and the pool never sent anything.
 *
 * So each parameter map carries one constant and nothing of hers. A map the service can read as
 * empty refuses the whole sign in: the pool answers the caller that the user name or the password
 * is wrong, before the verify trigger runs and whether or not the pool holds that user name.
 */

/** What this trigger is handed, and the three fields the pool reads back. */
export interface CreateAuthChallengeEvent {
  readonly request: {
    readonly challengeName?: string;
    /** True when the pool holds no user of that name, which changes nothing this trigger does. */
    readonly userNotFound?: boolean;
  };
  readonly response: {
    readonly publicChallengeParameters?: Readonly<Record<string, string>>;
    readonly privateChallengeParameters?: Readonly<Record<string, string>>;
    readonly challengeMetadata?: string;
  };
}

/** What the session is marked as, so a reader of a sign in knows which way in it was. */
export const telegramChallengeMetadata = 'TELEGRAM';

/** The one parameter of this challenge, which names the way in and says nothing about her. */
export const telegramChallengeParameters: Readonly<Record<string, string>> = {
  challenge: telegramChallengeMetadata,
};

/** The same challenge for every caller, whether or not the pool holds that user name. */
export function createAuthChallenge(event: CreateAuthChallengeEvent): CreateAuthChallengeEvent {
  return {
    ...event,
    response: {
      publicChallengeParameters: { ...telegramChallengeParameters },
      privateChallengeParameters: { ...telegramChallengeParameters },
      challengeMetadata: telegramChallengeMetadata,
    },
  };
}
