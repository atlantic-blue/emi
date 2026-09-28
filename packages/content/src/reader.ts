import type { PhaseName } from '@emi/tokens';

import type { Article, ArticleSource } from './article';
import type { ArticleCache } from './cache';
import { isFresh, memoryCache } from './cache';
import type { LastShownStore } from './lastShown';

/**
 * The one call a screen makes, and the order it reads in: what is already held, then the endpoint.
 *
 * The screen is handed an article or nothing, and never an error and never a reason. A card that is
 * absent is a card she does not miss. A card that is wrong is a card she believes.
 */

/**
 * What a reader is made of. The source is the only part with no stand in, so a test can build one
 * from a single function.
 */
export interface ArticleReaderParts {
  /** Where an article is read from, which is the endpoint the build is pointed at. */
  readonly source: ArticleSource;
  /** Where answers are held for the life of the process. One is built where none is given. */
  readonly cache?: ArticleCache;
  /** The row on the phone. A build without one draws articles and remembers none of them. */
  readonly lastShown?: LastShownStore;
  readonly now?: () => Date;
}

/**
 * A reader over those parts.
 *
 * A held answer is used as it is, including a held nothing, so an endpoint that is down is asked
 * once a launch and not once a draw.
 *
 * The row is written with the slug of what she was shown, and read by nothing here. It answers a
 * question the next article asks, which is whether she saw this one already.
 *
 * Every part is called through `quietly`, so a storage that will not open and a source somebody
 * wrote badly both end where a refused call ends, which is no article at all.
 */
export function articleReader(parts: ArticleReaderParts): ArticleSource {
  const cache = parts.cache ?? memoryCache();
  const lastShown = parts.lastShown;
  const now = parts.now ?? ((): Date => new Date());

  return async (phase: PhaseName): Promise<Article | null> => {
    const held = await quietly(() => cache.read(phase));

    if (held !== null && isFresh(held, now())) {
      return held.article;
    }

    const answered = await quietly(() => parts.source(phase));
    const readAt = now().toISOString();

    await quietly(async () => {
      await cache.write(phase, { article: answered, readAt });

      return null;
    });

    if (answered !== null && lastShown !== undefined) {
      await quietly(async () => {
        await lastShown.write({ id: answered.id, readAt });

        return null;
      });
    }

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
