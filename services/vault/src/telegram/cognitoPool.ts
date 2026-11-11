import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import type { MadeThePoolUser, PoolUser, UserPool } from './pool';

/**
 * The two pool calls of the sign in, against the real user pool.
 *
 * Two answers of the service are outcomes here rather than faults. A user name that is taken is a
 * woman signing in again. A refused parameter on a create that sent no password is the pool saying
 * it will not hold a user without one, which is the second shape the sign in then takes.
 *
 * The create writes no attribute at all. The pool holds no address, no telephone number and no
 * custom attribute for this way in, so there is nothing of hers to send.
 */

/** The one call this adapter makes on the client, so a test hands it something with no account. */
export interface SendsToThePool {
  send(command: AdminCreateUserCommand | AdminSetUserPasswordCommand): Promise<unknown>;
}

/** What the service calls the error it raises for a user name the pool already holds. */
export const userNameExists = 'UsernameExistsException';

/** What it raises for a create it will not accept, which includes a user with no password. */
export const invalidParameter = 'InvalidParameterException';

/** No message of any kind leaves the pool for this create, because she is already signing in. */
export const suppressEveryMessage = 'SUPPRESS';

function named(thrown: unknown, name: string): boolean {
  return thrown instanceof Error && thrown.name === name;
}

/** The port, bound to one client and one pool. */
export function cognitoPool(client: SendsToThePool, userPoolId: string): UserPool {
  return {
    createUser: async (user: PoolUser): Promise<MadeThePoolUser> => {
      try {
        await client.send(
          new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: user.userName,
            MessageAction: suppressEveryMessage,
            ...(user.password === undefined ? {} : { TemporaryPassword: user.password }),
          }),
        );

        return 'made';
      } catch (thrown) {
        if (named(thrown, userNameExists)) {
          return 'already-there';
        }

        // A create that carried a password and was refused anyway is a fault and not an outcome:
        // reading it as the second shape would send the same refused call a second time.
        if (named(thrown, invalidParameter) && user.password === undefined) {
          return 'a-password-is-needed';
        }

        throw thrown;
      }
    },

    setPermanentPassword: async (userName: string, password: string): Promise<void> => {
      await client.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: userName,
          Password: password,
          Permanent: true,
        }),
      );
    },
  };
}
