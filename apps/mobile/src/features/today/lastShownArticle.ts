import type { LastShownArticle, LastShownStore } from '@emi/content';
import { readLastShown, writtenLastShown } from '@emi/content';

import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';

/**
 * Where the article she was last shown is remembered between launches: the settings table, beside
 * the unit she reads temperature in.
 *
 * It is there and not in the day records because it is not a fact she entered about her body. The
 * day records are sealed and leave the phone. This row never does, and it holds the slug of a piece
 * of general writing and the instant she was shown it. A reader of the file learns which article,
 * out of a catalogue anybody can fetch, was drawn on this phone, and learns nothing about the cycle
 * she was in when it was.
 */

/** A row the reader writes, whose shape the content package owns. */
export function databaseLastShownArticle(db: Database): LastShownStore {
  return {
    read: (): Promise<LastShownArticle | null> => {
      const held = readSetting(db, 'articleAnswer');

      return Promise.resolve(held === undefined ? null : readLastShown(held));
    },
    write: (shown: LastShownArticle): Promise<void> => {
      writeSetting(db, 'articleAnswer', writtenLastShown(shown));

      return Promise.resolve();
    },
  };
}
