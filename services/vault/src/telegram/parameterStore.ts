import { GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

import type { ParameterStore, ParameterWrite } from './parameters';

/**
 * The two parameter calls of the sign in, against the real parameter store.
 *
 * It is a pass through, and the two answers it turns into values of the port are the two that are
 * not errors to this service. A name that holds nothing reads as nothing at all, and a write that
 * met a value already there reads as the value that won the race.
 */

/** What the parameter store answers a read with, as far as this service reads it. */
export interface ParameterStoreAnswer {
  readonly Parameter?: { readonly Value?: string };
}

/** The one call this adapter makes on the client, so a test hands it something with no account. */
export interface SendsToTheParameterStore {
  send(command: GetParameterCommand | PutParameterCommand): Promise<ParameterStoreAnswer>;
}

/** What the service calls the error it raises for a name that holds nothing. */
export const parameterNotFound = 'ParameterNotFound';

/** What it raises for a write that names no overwrite and met a value already there. */
export const parameterAlreadyExists = 'ParameterAlreadyExists';

/** The kind every value this sign in writes is held as, so the salt is encrypted at rest. */
export const secureString = 'SecureString';

function named(thrown: unknown, name: string): boolean {
  return thrown instanceof Error && thrown.name === name;
}

/** The port, bound to one client. Every call names the parameter it means in full. */
export function parameterStore(client: SendsToTheParameterStore): ParameterStore {
  return {
    read: async (name: string): Promise<string | undefined> => {
      try {
        // The two values that matter here are secure strings, and a read that does not ask for
        // the plaintext answers with the ciphertext rather than refusing, which would reach the
        // salt reader as 32 bytes of the wrong thing.
        const answered = await client.send(
          new GetParameterCommand({ Name: name, WithDecryption: true }),
        );

        return answered.Parameter?.Value;
      } catch (thrown) {
        if (named(thrown, parameterNotFound)) {
          return undefined;
        }

        throw thrown;
      }
    },

    writeIfAbsent: async (name: string, value: string): Promise<ParameterWrite> => {
      try {
        // No overwrite. A salt that changed would give every Telegram account a new pool user
        // name, so the account she reached yesterday would be unreachable today.
        await client.send(
          new PutParameterCommand({ Name: name, Value: value, Type: secureString }),
        );

        return 'written';
      } catch (thrown) {
        if (named(thrown, parameterAlreadyExists)) {
          return 'already-there';
        }

        throw thrown;
      }
    },
  };
}
