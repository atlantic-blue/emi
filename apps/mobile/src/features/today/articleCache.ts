import type { ArticleCache, CachedAnswer } from '@emi/content';
import { readAnswer, writtenAnswer } from '@emi/content';

import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';

/**
 * Where the article a reader was last shown is held between draws: the settings table, beside the
 * unit she reads temperature in.
 *
 * It is there and not in the day records because it is not a fact she entered about her body. The
 * day records are sealed and leave the phone. This row never does, and holds nothing but the phase
 * of a piece of general writing and the instant it was read.
 */

/** A row the reader writes and reads, whose shape the content package owns. */
export function databaseArticleCache(db: Database): ArticleCache {
  return {
    read: (): Promise<CachedAnswer | null> => {
      const held = readSetting(db, 'articleAnswer');

      return Promise.resolve(held === undefined ? null : readAnswer(held));
    },
    write: (answer: CachedAnswer): Promise<void> => {
      writeSetting(db, 'articleAnswer', writtenAnswer(answer));

      return Promise.resolve();
    },
  };
}
