import type { LastShownArticle } from '@emi/content';
import { readLastShown, writtenLastShown } from '@emi/content';

import type { Database } from '../database';
import { writeOverWhatIsRemoved } from '../freePages';
import { readSetting, writeSetting } from '../settingRepository';

/**
 * A phone that drew an article before this build holds the answer as the cycle phase Emi placed her
 * in, the whole article, and the instant. So a plain row records a statement about her body. The
 * shape the code writes changed, and the row a phone already holds did not, which is what this
 * takes off it.
 *
 * It is not a statement migration for the reason migrations 004 and 006 are not: the old row is one
 * line of json, and no SQL reads json this repository would trust. So it runs in code beside them,
 * on every launch. A phone whose row already holds the slug is left alone, so the second launch
 * rewrites nothing.
 */

/** The row this reads, which is still a key the setting table may hold. */
const articleAnswerKey = 'articleAnswer';

export type ArticleAnswerMove =
  /** No article was ever drawn on this phone, so there is nothing to take a phase off. */
  | 'no-row-to-rewrite'
  /** The row was written by this build already, which the second launch onwards is every row. */
  | 'already-holds-the-slug'
  /** The old row named an article, so the row is now that article's identifier and the instant. */
  | 'rewritten-as-the-slug'
  /** The old row named no article this build can read, so the row is gone rather than kept. */
  | 'removed';

export interface ArticleAnswerOutcome {
  readonly move: ArticleAnswerMove;
  /** The article the row names afterwards, and nothing where the row was removed or absent. */
  readonly id?: string;
}

export function takeThePhaseOffTheArticleAnswer(db: Database): ArticleAnswerOutcome {
  const held = readSetting(db, articleAnswerKey);

  if (held === undefined) {
    return { move: 'no-row-to-rewrite' };
  }

  const alreadyWithoutIt = readLastShown(held);

  if (alreadyWithoutIt !== null) {
    return { move: 'already-holds-the-slug', id: alreadyWithoutIt.id };
  }

  // The plain row is about to be replaced or dropped, and what SQLite lets go of stays in the file
  // unless this is on. The rebuild the launch runs afterwards is the half this does not cover.
  writeOverWhatIsRemoved(db);

  const named = theArticleTheOldRowNames(held);

  if (named === null) {
    db.run('DELETE FROM setting WHERE key = ?', [articleAnswerKey]);

    return { move: 'removed' };
  }

  writeSetting(db, articleAnswerKey, writtenLastShown(named));

  return { move: 'rewritten-as-the-slug', id: named.id };
}

/**
 * The two fields this build keeps, read out of a row written by the build before it. That row held
 * the phase, the article with its own phase inside it, and the instant. Both fields have to be
 * there: an identifier with no instant is an answer of unknown age, which is worse than no answer.
 */
function theArticleTheOldRowNames(written: string): LastShownArticle | null {
  let held: unknown = null;

  try {
    held = JSON.parse(written);
  } catch {
    return null;
  }

  if (!anObject(held)) {
    return null;
  }

  const article = held.article;

  if (!anObject(article) || !readable(article.id) || !readable(held.readAt)) {
    return null;
  }

  return { id: article.id, readAt: held.readAt };
}

function anObject(given: unknown): given is Record<string, unknown> {
  return given !== null && typeof given === 'object' && !Array.isArray(given);
}

function readable(given: unknown): given is string {
  return typeof given === 'string' && given.trim().length > 0;
}
