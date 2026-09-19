import type { PhaseName } from '@emi/tokens';

import type { Article, ArticleSource } from './article';
import { articleFrom } from './article';

/**
 * The client that reads an article from the endpoint, and the one rule it keeps: it answers nothing
 * rather than answering wrongly, and it never throws into a screen.
 *
 * Emi is local first, so this is the only part of the product that tells a server anything about
 * the woman using it. The request carries the name of a cycle phase. It carries no account
 * identifier, no signature, no dates and no body. Four phases exist, so the most a server can read
 * from one request is which quarter of a cycle somebody somewhere is reading about.
 *
 * No endpoint is deployed yet, so no build carries an address, and a client with no address answers
 * nothing without making a call. Step 9.5 draws the card only where there is an article, so an
 * empty answer is the right one rather than a gap.
 */

/**
 * Milliseconds. An article nobody has answered by now is an article a screen is better off without,
 * because the rest of the screen is her own data and is already drawn.
 */
export const ARTICLE_TIMEOUT_MILLISECONDS = 4000;

/** The path a phase is read from. The phase is the whole of the request. */
export function articlePath(phase: PhaseName): string {
  return `/v1/articles/${phase}`;
}

/** A request as this module makes one, which is a method and an address. */
export interface ArticleRequest {
  readonly url: string;
  readonly method: string;
}

/** What came back: the status, and the body already read as json. */
export interface ArticleAnswer {
  readonly status: number;
  readonly body: unknown;
}

/** All this module is given of the network, so a test drives the real client and no socket. */
export type SendArticleRequest = (request: ArticleRequest) => Promise<ArticleAnswer>;

/** The sender the application runs on, which is the platform's own. */
export const fetchSender: SendArticleRequest = async (request) => {
  const answered = await fetch(request.url, { method: request.method });

  return { status: answered.status, body: await answered.json() };
};

/** An address with no trailing slash, so joining a path to it cannot produce two. */
export function withoutATrailingSlash(address: string): string {
  return address.replace(/\/+$/, '');
}

/**
 * The source that reads from the endpoint at that address.
 *
 * An address of nothing is a build that has no endpoint to read, so the source answers nothing and
 * the sender is never called. Every other way this can go wrong ends in the same answer: a refusal,
 * a body that is not an article, an article about another phase, a call that threw, and a call
 * still running when the wait is over.
 */
export function articlesAt(
  address: string | null,
  send: SendArticleRequest,
  waitMilliseconds: number = ARTICLE_TIMEOUT_MILLISECONDS,
): ArticleSource {
  return async (phase): Promise<Article | null> => {
    if (address === null || address.trim().length === 0) {
      return null;
    }

    try {
      const answered = await answeredInTime(
        send({ url: `${withoutATrailingSlash(address)}${articlePath(phase)}`, method: 'GET' }),
        waitMilliseconds,
      );

      return answered === null || answered.status !== 200
        ? null
        : articleFrom(answered.body, phase);
    } catch {
      return null;
    }
  };
}

/**
 * The answer, or nothing at all: the call failed, or it is still running now the wait is over. The
 * request is not cancelled. A body that arrives late costs her nothing. It is only stopped from
 * being waited on.
 *
 * Its failure is taken here even when nothing is waiting on it any more. A call that rejects after
 * the race is over would otherwise be an unhandled rejection, which some runtimes end the process
 * over.
 */
async function answeredInTime<Answer>(
  sending: Promise<Answer>,
  waitMilliseconds: number,
): Promise<Answer | null> {
  let waited: ReturnType<typeof setTimeout> | undefined = undefined;

  try {
    return await Promise.race([
      sending.catch(() => null),
      new Promise<null>((resolve) => {
        waited = setTimeout(() => resolve(null), waitMilliseconds);
      }),
    ]);
  } finally {
    clearTimeout(waited);
  }
}
