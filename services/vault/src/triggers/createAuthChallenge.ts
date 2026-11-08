/**
 * The challenge, issued. It asks her nothing, because she already holds the answer: the sign in
 * function gave it to her surface with the user name, and the pool never sent anything.
 *
 * So both parameter sets are empty. A public parameter would travel to the caller, and a private
 * one would travel to the verify trigger, and neither has anything to carry here.
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

/** The same empty challenge for every caller, whether or not the pool holds that user name. */
export function createAuthChallenge(event: CreateAuthChallengeEvent): CreateAuthChallengeEvent {
  return {
    ...event,
    response: {
      publicChallengeParameters: {},
      privateChallengeParameters: {},
      challengeMetadata: telegramChallengeMetadata,
    },
  };
}
