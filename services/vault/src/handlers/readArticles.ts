import { accountHeader, bodyHashHeader, instantHeader, signatureHeader } from '@emi/crypto';
import { type PhaseName, phaseNames } from '@emi/tokens';

import { answer, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { ArticleStore, StoredArticle } from '../store/articles';

/**
 * The article written for one cycle phase. A request says which phase is being read and never who
 * is reading it, so this is the one endpoint in the service that takes no signature, reads no
 * account and stands behind no authorizer.
 *
 * The two refusals below exist so that staying that way is not a matter of remembering. A header
 * that names an account, or an authorizer attached to the route, fails the request loudly instead
 * of quietly telling the server who asked.
 *
 * The answer is the shape `@emi/content` reads, because that package is the one caller and it
 * refuses anything else. Every field it draws is required here for the same reason.
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

/** A link is opened in a browser, so a scheme a browser refuses is not a link. */
export const linkScheme = 'https://';

/** One article, as the endpoint answers it and as `@emi/content` reads it. */
export interface AnsweredArticle {
  readonly id: string;
  readonly phase: PhaseName;
  readonly title: string;
  readonly body: string;
  readonly attribution: string;
  readonly link: string | null;
}

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

/**
 * True where every field a card draws is there. A screen refuses an article missing one, so an
 * item the catalogue left half written is passed over here rather than answered and dropped there.
 */
export function drawable(article: StoredArticle): boolean {
  return [article.slug, article.title, article.body, article.attribution].every(
    (field) => field.trim().length > 0,
  );
}

/**
 * The one article a phase is answered with: the newest the catalogue holds, and the first slug
 * where two were published in the same instant.
 *
 * The same article goes to every reader of that phase. A server that chose between them would need
 * to know something about her to choose with, and the only thing it knows is the phase.
 */
export function newestOf(articles: readonly StoredArticle[]): StoredArticle | null {
  return (
    [...articles.filter(drawable)].sort((one, other) =>
      one.publishedAt === other.publishedAt
        ? one.slug.localeCompare(other.slug)
        : other.publishedAt.localeCompare(one.publishedAt),
    )[0] ?? null
  );
}

function answeredArticle(phase: PhaseName, article: StoredArticle): AnsweredArticle {
  return {
    id: article.slug,
    phase,
    title: article.title,
    body: article.body,
    attribution: article.attribution,
    // A link a browser would refuse is answered as no link, because a card drawn with a control
    // that opens nothing is worse than a card drawn without one.
    link: article.link !== null && article.link.startsWith(linkScheme) ? article.link : null,
  };
}

function articleAnswer(phase: PhaseName, article: StoredArticle): HttpResponse {
  const body = answer(200, answeredArticle(phase, article));

  return {
    ...body,
    headers: { ...body.headers, 'cache-control': `public, max-age=${cacheSeconds}` },
  };
}

/**
 * She asks what Emi has written about the phase she is in. The answer is one article and nothing
 * about her, and a phase nobody has written for yet is answered with no article rather than with
 * an empty one a screen would draw.
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

  const article = newestOf(await store.readArticlesFor(phase));

  // An empty catalogue and an unknown phase are both answered with nothing to read, and they say
  // different things, so whoever stocks the catalogue can tell a gap from a mistake.
  if (article === null) {
    return refusal(404, `nothing is written about ${phase} yet`);
  }

  return articleAnswer(phase, article);
}

/** The route the api calls, with its catalogue bound to it. */
export function readArticles(
  store: ArticleStore,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => articlesFor(event, store);
}
