import { refusalMessages } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import { authorizedAccountIn } from '../auth/authorizer';
import { signedBodyRefusal } from '../auth/signedBody';
import type { AccountDeleteStore } from '../store/accounts';

/**
 * Contract WIRE-4, everything under one account gone. It is the shortest handler in the service and
 * it is the one the whole privacy claim is measured by, so what it does not do is the point of it.
 *
 * It asks her nothing. There is no confirmation here, no token to send back, no window in which she
 * could change her mind and no retention period, because the press that reached this endpoint was
 * the deliberate act and it happened on her phone. A server that asked again would be a server
 * holding her days for one more round trip.
 */

/** The path a delete is signed over, which is the whole account and never one record of it. */
export const accountPath = '/v1/account';

/**
 * Everything, gone. The signature is the whole input: a delete carrying a body would be a delete
 * with an instruction in it, and this endpoint takes no instruction.
 */
export async function deleteAccountFor(
  event: HttpRequestEvent,
  store: AccountDeleteStore,
): Promise<HttpResponse> {
  const accountId = authorizedAccountIn(event);

  if (accountId === null) {
    return refusal(403, refusalMessages['signature-does-not-verify']);
  }

  const bodyRefusal = signedBodyRefusal(event);

  if (bodyRefusal !== null) {
    return bodyRefusal;
  }

  if (bodyTextOf(event).length > 0) {
    return refusal(400, 'a delete carries nothing beyond its signature');
  }

  const deleted = await store.deleteEverything(accountId);

  // The count is what storage removed, and it is here so a caller reading a log of its own
  // requests can see the delete did work. It is not evidence: a read of the table is.
  return answer(200, { deleted: true, itemsRemoved: deleted.itemsRemoved });
}

/** The route the api calls, with its storage bound to it. */
export function deleteAccount(
  store: AccountDeleteStore,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => deleteAccountFor(event, store);
}
