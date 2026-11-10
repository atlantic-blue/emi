import {
  createAuthChallenge,
  type CreateAuthChallengeEvent,
} from '../triggers/createAuthChallenge';

/**
 * The entry point of the create trigger, which issues a challenge that asks her nothing. It
 * reaches nothing at all, so it holds no client and reads no name from its environment.
 *
 * The handler is asynchronous because the runtime waits either for a promise or for a callback. A
 * handler that answered with a plain value would answer the pool nothing until it timed out.
 */
export const handler = async (event: CreateAuthChallengeEvent): Promise<CreateAuthChallengeEvent> =>
  createAuthChallenge(event);
