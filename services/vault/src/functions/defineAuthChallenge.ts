import {
  defineAuthChallenge,
  type DefineAuthChallengeEvent,
} from '../triggers/defineAuthChallenge';

/**
 * The entry point of the define trigger, which decides between asking, issuing tokens and
 * refusing. It reads the session it is handed and reaches nothing at all, so it holds no client
 * and reads no name from its environment.
 *
 * The handler is asynchronous because the runtime waits either for a promise or for a callback. A
 * handler that answered with a plain value would answer the pool nothing until it timed out.
 */
export const handler = async (event: DefineAuthChallengeEvent): Promise<DefineAuthChallengeEvent> =>
  defineAuthChallenge(event);
