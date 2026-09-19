import { accountHeader, bodyHashHeader, instantHeader, signatureHeader } from '@emi/crypto';
import { type PhaseName, phaseNames } from '@emi/tokens';

import { answer, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { ArticleStore, StoredArticle } from '../store/articles';

/**
 * The articles written for one cycle phase. A request says which phase is being read and never who
 * is reading it, so this is the one endpoint in the service that takes no signature, reads no
 * account and stands behind no authorizer.
 *
 * The three refusals below exist so that staying that way is not a matter of remembering. A header
 * that names an account, or an authorizer attached to the route, fails the request loudly instead
 * of quietly telling the server who asked.
 */

/** The name of the one parameter the route takes, which the route template also writes. */
export const phaseParameter = 'phase';

/**
 * The headers a request to this endpoint may not carry. It is the whole signed set rather than
 * the account alone, because a caller who sends any of them is a caller signing a request that
 * needs no signature, and the next thing they send is the account.
 */
export const identityHeaders: readonly string[] = [
  accountHeader,
  instantHeader,
  signatureHeader,
  bodyHashHeader,
];

/** How long an answer may be held. Every reader of a phase gets the same one, so it caches. */
export const cacheSeconds = 3600;

/** The identity headers a request carries, which for this endpoint must be none. */
export function identityHeadersIn(event: HttpRequestEvent): string[] {
  return identityHeaders.filter((header) => event.headers[header] !== undefined);
}

/** True where an authorizer ran before this handler, which on this route means it was misrouted. */
export function authorizerRan(event: HttpRequestEvent): boolean {
  return event.requestContext.authorizer !== undefined;
}

/** The phase asked for, or nothing at all where the path carries no phase this product knows. */
export function phaseIn(event: HttpRequestEvent): PhaseName | null {
  const given = event.pathParameters?.[phaseParameter];

  return phaseNames.find((phase) => phase === given) ?? null;
}

function articleAnswer(phase: PhaseName, articles: readonly StoredArticle[]): HttpResponse {
  const body = answer(200, { phase, articles });

  return {
    ...body,
    headers: { ...body.headers, 'cache-control': `public, max-age=${cacheSeconds}` },
  };
}

/**
 * She asks what Emi has written about the phase she is in. The answer carries every article of that
 * phase and the phone chooses which to show, because a server that chose would need to know more
 * about her than the phase.
 */
export async function articlesFor(
  event: HttpRequestEvent,
  store: ArticleStore,
): Promise<HttpResponse> {
  const named = identityHeadersIn(event);

  if (named.length > 0) {
    return refusal(
      400,
      `this endpoint reads an article by phase and never by reader, so it takes no ${named.join(' and no ')}`,
    );
  }

  if (authorizerRan(event)) {
    return refusal(400, 'this endpoint stands behind no authorizer, and one answered for it');
  }

  const phase = phaseIn(event);

  if (phase === null) {
    return refusal(404, `a cycle phase is one of ${phaseNames.join(', ')}`);
  }

  // An empty catalogue is a phase nobody has written for yet, and it answers with an empty list
  // rather than the refusal an unknown phase gets. The two say different things to the phone.
  return articleAnswer(phase, await store.readArticlesFor(phase));
}

/** The route the api calls, with its catalogue bound to it. */
export function readArticles(
  store: ArticleStore,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => articlesFor(event, store);
}
