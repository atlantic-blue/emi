import type { PhaseName } from '@emi/tokens';

import type { Article, ArticleSource } from './article';
import type { ArticleCache } from './cache';
import { isFresh, memoryCache } from './cache';

/**
 * The one call a screen makes, and the order it reads in: what is already held, then the endpoint.
 *
 * The screen is handed an article or nothing, and never an error and never a reason. A card that is
 * absent is a card she does not miss. A card that is wrong is a card she believes.
 */

/** What a reader is built from. Only the source has to be given. */
export interface ArticleReaderParts {
  /** Where an article is read from, which is the endpoint the build is pointed at. */
  readonly source: ArticleSource;
  readonly cache?: ArticleCache;
  readonly now?: () => Date;
}

/**
 * A reader over those parts.
 *
 * A held answer is used as it is, including a held nothing, so an endpoint that is down is asked
 * once and not once a draw.
 *
 * Every part is called through `quietly`, so a storage that will not open and a source somebody
 * wrote badly both end where a refused call ends, which is no article at all.
 */
export function articleReader(parts: ArticleReaderParts): ArticleSource {
  const cache = parts.cache ?? memoryCache();
  const now = parts.now ?? ((): Date => new Date());

  return async (phase: PhaseName): Promise<Article | null> => {
    const held = await quietly(() => cache.read());

    if (held !== null && isFresh(held, phase, now())) {
      return held.article;
    }

    const answered = await quietly(() => parts.source(phase));

    await quietly(async () => {
      await cache.write({ phase, article: answered, readAt: now().toISOString() });

      return null;
    });

    return answered;
  };
}

/**
 * What the call answered, or nothing where it raised. A screen is handed neither an error nor a
 * reason.
 */
async function quietly<Answer>(calling: () => Promise<Answer | null>): Promise<Answer | null> {
  try {
    return await calling();
  } catch {
    return null;
  }
}
