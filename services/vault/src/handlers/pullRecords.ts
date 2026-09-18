import { base64Of, refusalMessages } from '@emi/crypto';

import { answer, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import { authorizedAccountIn } from '../auth/authorizer';
import { signedBodyRefusal } from '../auth/signedBody';
import type { RecordStore } from '../store/records';

/**
 * Contract WIRE-3, the records written since she last asked. The answer carries a cursor whatever
 * happens, so a page that stopped early is told apart from a page that reached the end by the
 * cursor moving rather than by the caller counting what came back.
 */

/**
 * Bytes. A page stops before it costs more than this and answers with a cursor, because an answer
 * that truncated in silence would lose the records past the cut and nobody would know.
 */
export const pageBytes = 1024 * 1024;

/** The name of the one parameter a pull takes. */
export const cursorParameter = 'cursor';

/**
 * The instant a cursor stands for, carried with the account it was made for. The account is in
 * there so a cursor kept from another account is refused rather than quietly read as an instant:
 * the query is bound to the caller either way, so this catches the restore that went wrong and
 * never an attack.
 */
export function cursorFor(accountId: string, instant: string): string {
  return Buffer.from(`${accountId}.${instant}`, 'utf8').toString('base64url');
}

/** What a cursor says once it is read back: whose it is, and how far it reached. */
export interface ReadCursor {
  readonly accountId: string;
  readonly instant: string;
}

/** The two halves of a cursor, or nothing at all when the text is not one. */
export function cursorParts(cursor: string): ReadCursor | null {
  const text = Buffer.from(cursor, 'base64url').toString('utf8');
  const dot = text.indexOf('.');

  if (dot < 1 || dot === text.length - 1) {
    return null;
  }

  const instant = text.slice(dot + 1);

  return Number.isNaN(Date.parse(instant)) ? null : { accountId: text.slice(0, dot), instant };
}

function cursorIn(event: HttpRequestEvent): string | null {
  return new URLSearchParams(event.rawQueryString ?? '').get(cursorParameter);
}

/**
 * She asks for everything written since the cursor she holds. A page carries the records and the
 * cursor to ask with next, and `moreToCome` says whether asking again now is worth a request.
 */
export async function pullRecordsFor(
  event: HttpRequestEvent,
  store: RecordStore,
): Promise<HttpResponse> {
  const accountId = authorizedAccountIn(event);

  if (accountId === null) {
    return refusal(403, refusalMessages['signature-does-not-verify']);
  }

  const bodyRefusal = signedBodyRefusal(event);

  if (bodyRefusal !== null) {
    return bodyRefusal;
  }

  const given = cursorIn(event);
  let after: string | null = null;

  if (given !== null) {
    const parts = cursorParts(given);

    if (parts === null) {
      return refusal(400, 'that cursor is not a cursor this api wrote');
    }

    if (parts.accountId !== accountId) {
      return refusal(403, 'that cursor was written for another account');
    }

    after = parts.instant;
  }

  const page = await store.readRecordsAfter(accountId, after, pageBytes);
  // An account with nothing in it yet has no place to stand, so it is answered with no cursor
  // rather than with a cursor standing for no instant.
  const reached = page.reached ?? after;

  return answer(200, {
    records: page.records.map((record) => ({
      recordId: record.recordId,
      revision: record.revision,
      payload: base64Of(record.payload),
      updatedAt: record.updatedAt,
    })),
    cursor: reached === null ? null : cursorFor(accountId, reached),
    moreToCome: page.moreToCome,
  });
}

/** The route the api calls, with its storage bound to it. */
export function pullRecords(
  store: RecordStore,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => pullRecordsFor(event, store);
}
