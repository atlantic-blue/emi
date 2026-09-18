import { bytesFromBase64 } from '@emi/crypto';

/**
 * The shapes the api gateway sends and reads, written here rather than taken from a types package.
 * The service reads four fields of a request and writes three of a response, and a dependency that
 * describes every event the platform can send would be larger than the service.
 */

/** What reaches the vault function: payload format 2.0, with the body. */
export interface HttpRequestEvent {
  readonly rawPath: string;
  readonly rawQueryString?: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly requestContext: {
    readonly http: { readonly method: string };
    /** What the authorizer handed on. A route with no authorizer leaves it absent. */
    readonly authorizer?: { readonly lambda?: Readonly<Record<string, string>> };
  };
  readonly body?: string;
  readonly isBase64Encoded?: boolean;
}

/**
 * What reaches the authorizer. It is the request without its body, which is why the digest of the
 * body travels in a header: the authorizer could not compute one if it wanted to.
 */
export type AuthorizerEvent = Omit<HttpRequestEvent, 'body' | 'isBase64Encoded'>;

/** What the vault function answers with. */
export interface HttpResponse {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

/**
 * What the authorizer answers with. The api is configured for simple responses, so this is a yes or
 * a no and nothing else, and the account travels to the function in the context.
 */
export interface AuthorizerResult {
  readonly isAuthorized: boolean;
  readonly context?: Readonly<Record<string, string>>;
}

/** The refusal an authorizer gives. It carries no reason, so no caller learns why it was refused. */
export const refused: AuthorizerResult = { isAuthorized: false };

/**
 * What was signed. The query string is part of it, so a caller cannot move a cursor or a page size
 * under a signature that was made for a different one.
 */
export function signedPathOf(event: AuthorizerEvent | HttpRequestEvent): string {
  const query = event.rawQueryString ?? '';

  return query.length === 0 ? event.rawPath : `${event.rawPath}?${query}`;
}

/** The method, uppercase, as the signing string writes it. */
export function methodOf(event: AuthorizerEvent | HttpRequestEvent): string {
  return event.requestContext.http.method.toUpperCase();
}

/**
 * The body as text. The api gateway sends base 64 when it decides the body is binary, so a reader
 * that ignored the flag would hash the wrong bytes for some requests and not for others.
 */
export function bodyTextOf(event: HttpRequestEvent): string {
  const body = event.body ?? '';

  return event.isBase64Encoded === true ? new TextDecoder().decode(bytesFromBase64(body)) : body;
}

/** An answer with a json body. */
export function answer(statusCode: number, body: unknown): HttpResponse {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/**
 * A refusal, as a status and a message. The message is the whole of what a caller is told: no field
 * name, no account, no hint about which of the checks it was that said no.
 */
export function refusal(statusCode: number, message: string): HttpResponse {
  return answer(statusCode, { error: message });
}
