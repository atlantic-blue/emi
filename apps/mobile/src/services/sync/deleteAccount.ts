import type { SecureStore } from '../vault/keychain';
import { readDeviceKey } from './deviceKey';
import { signRequestHeaders } from './sign';
import { vaultAddress, withoutATrailingSlash } from './vaultAddress';

/**
 * Contract KEEP-3, the half of the delete that reaches the server. Contract WIRE-4 is the endpoint
 * it calls.
 *
 * This runs before anything on the phone is emptied, and the order is not a preference. Her signing
 * key is the only thing that proves the account is hers, so once the keychain is gone no request can
 * ever ask for that account again. Server first is the only order in which the server half can
 * happen at all.
 *
 * It never stops the phone half. A woman who presses delete wants her days gone now, and a network
 * she cannot reach is not a reason to leave readable days on the phone she is holding. The cost is
 * stated plainly on the screen instead: the copy on the server may still be there, and after this
 * press nothing anywhere can open it, because the key that opened it was on this phone.
 */

/** The path the vault takes a delete on. It is the whole account and never one record of it. */
export const accountPath = '/v1/account';

/**
 * Milliseconds. A delete that has not been answered by now is treated as not reached, so she is
 * never left watching a screen that says Deleting while a radio decides.
 */
export const serverDeleteMilliseconds = 8000;

/** What the server half came to: taken, never there to take, or not reached at all. */
export type ServerDeleteOutcome = 'gone' | 'no-account' | 'not-reached';

/** The one thing the phone's delete asks of the network. */
export type ServerDelete = () => Promise<ServerDeleteOutcome>;

/** A request as this module makes one, which is a method, an address and four signed headers. */
export interface VaultRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
}

/** All this module is given of the network, so a test drives the real signing and no socket. */
export type SendRequest = (request: VaultRequest) => Promise<{ readonly status: number }>;

/** The sender the application runs on, which is the platform's own. */
export const fetchSender: SendRequest = async (request) => {
  const answered = await fetch(request.url, { method: request.method, headers: request.headers });

  return { status: answered.status };
};

/**
 * The account on the server, gone.
 *
 * A status other than 200 is read as not reached rather than as gone. The api refuses an unknown
 * account and a signature it cannot verify with the same answer, by design, so this cannot tell a
 * deleted account from a clock that has drifted, and the honest reading of a refusal is that the
 * delete did not happen.
 */
export async function deleteTheServerAccount(
  keychain: Pick<SecureStore, 'read'>,
  send: SendRequest,
  now: Date,
  address: string | null = vaultAddress(),
): Promise<ServerDeleteOutcome> {
  if (address === null) {
    return 'no-account';
  }

  const key = await readDeviceKey(keychain);

  if (key === null) {
    return 'no-account';
  }

  const headers = signRequestHeaders(key, { method: 'DELETE', path: accountPath }, now);

  try {
    const answered = await answeredInTime(
      send({
        url: `${withoutATrailingSlash(address)}${accountPath}`,
        method: 'DELETE',
        headers,
      }),
    );

    return answered?.status === 200 ? 'gone' : 'not-reached';
  } catch {
    return 'not-reached';
  }
}

/** The call the delete screen makes, with the keychain and the sender bound to it. */
export function serverAccountDelete(
  keychain: Pick<SecureStore, 'read'>,
  send: SendRequest = fetchSender,
  clock: () => Date = () => new Date(),
): ServerDelete {
  return () => deleteTheServerAccount(keychain, send, clock());
}

/**
 * The answer, or nothing at all once the wait is over. The request is not cancelled, because a
 * signed delete that lands late is a delete that landed; it is only stopped from being waited on.
 */
async function answeredInTime<Answer>(sending: Promise<Answer>): Promise<Answer | null> {
  let waited: ReturnType<typeof setTimeout> | undefined = undefined;

  try {
    return await Promise.race([
      sending,
      new Promise<null>((resolve) => {
        waited = setTimeout(() => resolve(null), serverDeleteMilliseconds);
      }),
    ]);
  } finally {
    clearTimeout(waited);
  }
}
