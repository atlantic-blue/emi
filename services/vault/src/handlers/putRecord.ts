import { bytesFromBase64, readEnvelope, refusalMessages } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import { authorizedAccountIn } from '../auth/authorizer';
import { signedBodyRefusal } from '../auth/signedBody';
import type { RecordStore } from '../store/records';

/**
 * Contract WIRE-2, a record written. The service reads the shape of the envelope and never its
 * content, so everything below is about the size of the bytes, the order of the revisions and the
 * identifier they are filed under.
 *
 * The subscription gate belongs to this endpoint too, and it is built in feature 7 step 4 where
 * there is a receipt to read. Until then a write is refused for the reasons here and no other.
 */

/** Bytes. An envelope larger than this is refused, which is contract WIRE-2. */
export const maximumEnvelopeBytes = 65536;

/**
 * Bytes. The body carries the envelope as base 64 and a little json around it, so this is the
 * envelope limit with room for the encoding, and it is read before the body is parsed.
 */
export const maximumRecordBodyBytes = Math.ceil(maximumEnvelopeBytes / 3) * 4 + 1024;

/**
 * The identifier is the one part of a record that travels in the clear, so its shape is held to a
 * universally unique identifier of version 7 and nothing else. A free text identifier would be a
 * place to write a date, and a date is the thing the server may never learn.
 */
export const recordIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The path a record is written to, ending in the identifier this handler reads back out. */
export const recordPathPrefix = '/v1/records/';

/** The identifier in the path, or nothing at all when the path does not carry a usable one. */
export function recordIdIn(event: HttpRequestEvent): string | null {
  if (!event.rawPath.startsWith(recordPathPrefix)) {
    return null;
  }

  const identifier = event.rawPath.slice(recordPathPrefix.length);

  return recordIdPattern.test(identifier) ? identifier : null;
}

interface RecordBody {
  readonly revision?: unknown;
  readonly payload?: unknown;
}

interface ReadRecord {
  readonly revision: number;
  readonly payload: Uint8Array;
}

function recordIn(body: string): ReadRecord | HttpResponse {
  let parsed: RecordBody;

  try {
    parsed = JSON.parse(body) as RecordBody;
  } catch {
    return refusal(400, 'a record is written as json');
  }

  const revision = parsed?.revision;

  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 1) {
    return refusal(400, 'a revision is a whole number of 1 or more');
  }

  if (typeof parsed?.payload !== 'string') {
    return refusal(400, 'a record carries its envelope as base 64, under payload');
  }

  let payload: Uint8Array;

  try {
    payload = bytesFromBase64(parsed.payload);
  } catch {
    return refusal(400, 'a record carries its envelope as base 64, under payload');
  }

  if (payload.length > maximumEnvelopeBytes) {
    return refusal(
      413,
      `an envelope is at most ${maximumEnvelopeBytes} bytes, this one is ${payload.length}`,
    );
  }

  try {
    // The one thing the service is allowed to do with an envelope: read its shape. It holds no
    // key, so this says the bytes are an envelope and never what is inside one.
    readEnvelope(payload);
  } catch {
    return refusal(400, 'those bytes are not an envelope');
  }

  return { revision, payload };
}

/**
 * She writes a day. The revision she sends has to be higher than the one already there, and when
 * it is not the write is refused with the revision that is: two phones then converge on the higher
 * one rather than on whichever arrived last.
 */
export async function putRecordFor(
  event: HttpRequestEvent,
  store: RecordStore,
  now: Date,
): Promise<HttpResponse> {
  const accountId = authorizedAccountIn(event);

  if (accountId === null) {
    return refusal(403, refusalMessages['signature-does-not-verify']);
  }

  const body = bodyTextOf(event);

  if (new TextEncoder().encode(body).length > maximumRecordBodyBytes) {
    return refusal(413, `an envelope is at most ${maximumEnvelopeBytes} bytes`);
  }

  const bodyRefusal = signedBodyRefusal(event);

  if (bodyRefusal !== null) {
    return bodyRefusal;
  }

  const recordId = recordIdIn(event);

  if (recordId === null) {
    return refusal(400, 'a record identifier is a universally unique identifier of version 7');
  }

  const read = recordIn(body);

  if ('statusCode' in read) {
    return read;
  }

  const written = await store.writeRecord(accountId, {
    recordId,
    revision: read.revision,
    payload: read.payload,
    updatedAt: now.toISOString(),
  });

  if (written.outcome === 'revision-is-not-higher') {
    return answer(409, {
      error: 'a record is written with a revision higher than the one held',
      revision: written.revision,
    });
  }

  return answer(200, { revision: written.revision });
}

/** The route the api calls, with its storage bound to it. */
export function putRecord(
  store: RecordStore,
  clock: () => Date = () => new Date(),
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => putRecordFor(event, store, clock());
}
