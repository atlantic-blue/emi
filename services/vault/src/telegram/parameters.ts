import { base64Of, bytesFromBase64, type RandomSource } from '@emi/crypto';

/**
 * The three values the Telegram sign in reads, and the one of them it may write.
 *
 * The bot identifier is the client identifier of the login and the audience the identity token
 * carries. The client secret is written by a person, from the screen that shows it. The salt turns
 * a Telegram subject into a pool user name, and it is the only value in Emi that no person ever
 * sees: the sign in makes it on the first press that finds it absent.
 *
 * The bot token is read by nothing here. It is the one credential that can act as the bot, and the
 * payments of a later feature go through that same bot, so it stays off the sign in path.
 */

/** The bot identifier, which is read as the client identifier and as the audience. */
export const botIdentifierParameter = '/emi/accounts/telegram/bot-id';

/** The client secret of the login, which a person copies off the screen that shows it. */
export const clientSecretParameter = '/emi/accounts/telegram/client-secret';

/** The salt the pool user name is derived under, as base 64 of its bytes. */
export const saltParameter = '/emi/accounts/telegram/salt';

/** Bytes of salt. A keyed hash of a subject under this many bytes is not worked backwards. */
export const saltBytes = 32;

/** What a write that refuses to replace an existing value answers. */
export type ParameterWrite = 'written' | 'already-there';

/**
 * What the sign in asks of the parameter store, as a port. Two calls, and the write cannot
 * replace a value: a salt that changed would give every Telegram account a new pool user name,
 * so the account she reached yesterday would be unreachable today.
 */
export interface ParameterStore {
  /** The value, or nothing at all where no parameter holds that name. */
  read(name: string): Promise<string | undefined>;
  /** Writes the value only when the name is free, and says which of the two happened. */
  writeIfAbsent(name: string, value: string): Promise<ParameterWrite>;
}

/**
 * Raised when a parameter the sign in cannot work without is absent or unreadable. The message
 * names the parameter and never the value, because this text reaches a log line.
 */
export class ParameterError extends Error {
  readonly parameter: string;

  constructor(parameter: string, message: string) {
    super(message);
    this.name = 'ParameterError';
    this.parameter = parameter;
  }
}

/** A parameter that must be there, or a failure naming which one is not. */
export async function parameterHeld(store: ParameterStore, name: string): Promise<string> {
  const held = await store.read(name);

  if (held === undefined || held.length === 0) {
    throw new ParameterError(name, `the parameter ${name} holds no value`);
  }

  return held;
}

function saltIn(name: string, written: string): Uint8Array {
  let bytes: Uint8Array;

  try {
    bytes = bytesFromBase64(written);
  } catch {
    throw new ParameterError(name, `the parameter ${name} is not base 64`);
  }

  if (bytes.length !== saltBytes) {
    throw new ParameterError(
      name,
      `the parameter ${name} holds ${bytes.length} bytes and a salt is ${saltBytes}`,
    );
  }

  return bytes;
}

/**
 * The salt, made on the first sign in that finds it absent. A function that loses the race to
 * write it reads the parameter again and uses the value that won, so two containers starting
 * together derive one user name for one subject rather than two.
 */
export async function saltHeldOrMade(
  store: ParameterStore,
  random: RandomSource,
): Promise<Uint8Array> {
  const held = await store.read(saltParameter);

  if (held !== undefined && held.length > 0) {
    return saltIn(saltParameter, held);
  }

  const made = random(saltBytes);

  if (made.length !== saltBytes) {
    throw new ParameterError(
      saltParameter,
      `the random source gave ${made.length} bytes and a salt is ${saltBytes}`,
    );
  }

  if ((await store.writeIfAbsent(saltParameter, base64Of(made))) === 'written') {
    return made;
  }

  return saltIn(saltParameter, await parameterHeld(store, saltParameter));
}
