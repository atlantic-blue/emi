import { bodyHashOf, presentedSignatureIn, refusalMessages } from '@emi/crypto';

import { bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';

/**
 * The half of contract AUTH-1 the authorizer cannot do. A request authorizer receives no body, so
 * the digest of the body is signed and sent in a header, and the function that does receive the
 * body compares the two. Without this, a caller could keep a signature and change what it carries.
 */
export function signedBodyRefusal(event: HttpRequestEvent): HttpResponse | null {
  const presented = presentedSignatureIn(event.headers);

  if (presented === null) {
    return refusal(403, refusalMessages['header-is-missing']);
  }

  if (presented.bodyHash !== bodyHashOf(bodyTextOf(event))) {
    return refusal(403, refusalMessages['body-hash-does-not-match']);
  }

  return null;
}
