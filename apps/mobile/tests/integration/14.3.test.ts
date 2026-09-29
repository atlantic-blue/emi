import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { Article } from '@emi/content';
import type { PhaseName } from '@emi/tokens';
import { phaseNames } from '@emi/tokens';

import type { Database, SqlValue } from '../../src/data/database';
import { runTheLaunchPasses } from '../../src/data/launchPasses';
import { takeThePhaseOffTheArticleAnswer } from '../../src/data/migrations/007-article-answer-without-the-phase';
import { migrate } from '../../src/data/schema';
import { readSetting } from '../../src/data/settingRepository';
import { databaseLastShownArticle } from '../../src/features/today/lastShownArticle';
import { nodeDatabase } from '../data/nodeDatabase';
import { aDayRecord } from '../fixtures/dayRecord';
import { herProfileVault, herVault } from '../fixtures/herVault';

/**
 * The database is a real file here, and the reading that matters is taken from its bytes. A query
 * cannot answer this question: the setting table stops naming the old value the moment it is
 * replaced, and the bytes it replaced are still in the file.
 */

/** The phase the old build recorded, which is the word this step takes out of the file. */
const thePhaseTheOldBuildRecorded: PhaseName = 'luteal';

/** The slug carries no phase word, so a byte that matches one is not the article's own name. */
const theArticleSheWasShown: Article = {
  id: 'why-the-days-before-drag',
  phase: thePhaseTheOldBuildRecorded,
  title: 'Why the days before drag',
  body: 'A piece of general writing about the days before a period, which anybody can fetch.',
  attribution: 'Written elsewhere.',
  link: 'https://articles.example/luteal',
};

const sheWasShownItAt = '2026-03-18T07:30:00.000Z';
const sheOpenedItAt = new Date('2026-03-20T09:00:00.000Z');
const sheWroteHerDaysAt = new Date('2026-03-14T21:05:00.000Z');

/**
 * Days enough to carry the file past the page her rows start on. On a database of one page there is
 * nowhere for a replaced row to be left, so a smaller phone than this cannot tell a launch that
 * cleared the file from one that did nothing.
 */
const daysSheWrote = 400;

interface HerPhone {
  readonly database: Database;
  readonly path: string;
  readonly close: () => void;
}

function herVaults() {
  return { day: herVault(), profile: herProfileVault() };
}

/** The row the build before this one wrote: the phase, the whole article, and the instant. */
function theOldRow(article: Article | null = theArticleSheWasShown): string {
  return JSON.stringify({ phase: thePhaseTheOldBuildRecorded, article, readAt: sheWasShownItAt });
}

/**
 * Her phone as a build that drew an article left it: days already sealed, so the only pass with
 * anything to do is the one under test, and the article answer in its old shape beside them.
 */
function aPhoneThatDrewAnArticle(directory: string, row: string = theOldRow()): HerPhone {
  const path = join(directory, 'emi.db');
  const sqlite = new DatabaseSync(path);
  const database = nodeDatabase(sqlite);

  migrate(database);
  sealedDays(database);
  database.run('INSERT INTO setting (key, value) VALUES (?, ?)', ['articleAnswer', row]);
  // A phone that has been running for months folded its log into the file long ago, so the row it
  // holds is in the file itself and not waiting in a log beside it.
  sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');

  return { database, path, close: () => sqlite.close() };
}

/** Days written the way this build writes them, so the pass that seals days has nothing to seal. */
function sealedDays(database: Database): void {
  const vault = herVault();
  const instant = sheWroteHerDaysAt.toISOString();

  for (let at = 0; at < daysSheWrote; at += 1) {
    const day = dayNumber(at);

    database.run(
      `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at, deleted_at,
         synced_revision)
       VALUES (?, ?, ?, 1, ?, ?, NULL, NULL)`,
      [
        `01950000-0000-7000-8000-${String(at).padStart(12, '0')}`,
        day,
        vault.seal(aDayRecord({ day, recordedAt: instant })),
        instant,
        instant,
      ],
    );
  }
}

/** Days running back from the first of a month, so each one is a date the table accepts. */
function dayNumber(at: number): string {
  const month = 1 + Math.floor(at / 28);
  const day = 1 + (at % 28);

  return `20${String(20 + Math.floor(month / 12)).padStart(2, '0')}-${String((month % 12) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** What the file says, read as bytes, with nothing between the test and the disk. */
function theFileHolds(path: string, reading: string): boolean {
  return readFileSync(path).includes(Buffer.from(reading));
}

/**
 * The phase names a file holds only because she was placed in one. A migrated file with nothing of
 * hers in it already says `period`, because `period_length_days` is a column and SQLite keeps the
 * table definitions in the file, so a scan for that word answers about the schema and not about
 * her. The other three are hers alone.
 */
function phaseWordsThatAreHersAlone(directory: string): PhaseName[] {
  const path = join(directory, 'empty.db');
  const sqlite = new DatabaseSync(path);

  migrate(nodeDatabase(sqlite));
  sqlite.close();

  return phaseNames.filter((name) => !theFileHolds(path, name));
}

/** The same database, with every statement it is given written down as it goes. */
function watched(database: Database): { readonly watching: Database; readonly said: string[] } {
  const said: string[] = [];

  return {
    said,
    watching: {
      execute: (sql: string): void => {
        said.push(sql);
        database.execute(sql);
      },
      run: (sql: string, parameters?: readonly SqlValue[]): void => {
        said.push(sql);
        database.run(sql, parameters);
      },
      all: <Row>(sql: string, parameters?: readonly SqlValue[]): Row[] => {
        said.push(sql);

        return database.all<Row>(sql, parameters);
      },
    },
  };
}

function rebuilds(said: readonly string[]): number {
  return said.filter((sql) => sql.includes('VACUUM')).length;
}

function theRow(database: Database): string | undefined {
  return readSetting(database, 'articleAnswer');
}

describe('a launch pass takes the phase off the phones that already hold it', () => {
  let directory = '';

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'emi-article-'));
  });

  afterEach(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  describe('the file behind a phone that drew an article', () => {
    it('holds the name of no cycle phase once the launch has run', () => {
      const hers = phaseWordsThatAreHersAlone(directory);
      const phone = aPhoneThatDrewAnArticle(directory);
      expect(theFileHolds(phone.path, thePhaseTheOldBuildRecorded)).toBe(true);

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      const found = hers.filter((name) => theFileHolds(phone.path, name));
      expect(found).toEqual([]);
      phone.close();
    });

    it('holds none of the words she read, because the row no longer carries them', () => {
      const phone = aPhoneThatDrewAnArticle(directory);
      expect(theFileHolds(phone.path, theArticleSheWasShown.title)).toBe(true);

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(theFileHolds(phone.path, theArticleSheWasShown.title)).toBe(false);
      expect(theFileHolds(phone.path, theArticleSheWasShown.body)).toBe(false);
      expect(theFileHolds(phone.path, theArticleSheWasShown.attribution)).toBe(false);
      phone.close();
    });

    it('names the three phase words a column is not named after, so the scan is about her', () => {
      expect(phaseWordsThatAreHersAlone(directory)).toEqual(['follicular', 'ovulation', 'luteal']);
    });
  });

  describe('the row the pass leaves behind', () => {
    it('is the article identifier and the instant, and nothing else', () => {
      const phone = aPhoneThatDrewAnArticle(directory);

      takeThePhaseOffTheArticleAnswer(phone.database);

      expect(theRow(phone.database)).toBe(
        `{"id":"${theArticleSheWasShown.id}","readAt":"${sheWasShownItAt}"}`,
      );
      phone.close();
    });

    it('reads back as the article she was last shown', async () => {
      const phone = aPhoneThatDrewAnArticle(directory);

      takeThePhaseOffTheArticleAnswer(phone.database);

      expect(await databaseLastShownArticle(phone.database).read()).toEqual({
        id: theArticleSheWasShown.id,
        readAt: sheWasShownItAt,
      });
      phone.close();
    });

    it('says the phase was rewritten as the slug', () => {
      const phone = aPhoneThatDrewAnArticle(directory);

      expect(takeThePhaseOffTheArticleAnswer(phone.database)).toEqual({
        move: 'rewritten-as-the-slug',
        id: theArticleSheWasShown.id,
      });
      phone.close();
    });
  });

  describe('a row the pass cannot read', () => {
    it('is removed, because a row it cannot rewrite is a row it will not keep', () => {
      const phone = aPhoneThatDrewAnArticle(directory, theOldRow(null));

      expect(takeThePhaseOffTheArticleAnswer(phone.database)).toEqual({ move: 'removed' });

      expect(theRow(phone.database)).toBeUndefined();
      phone.close();
    });

    it('is removed where the line is not json at all', () => {
      const phone = aPhoneThatDrewAnArticle(directory, 'the luteal phase');

      expect(takeThePhaseOffTheArticleAnswer(phone.database)).toEqual({ move: 'removed' });

      expect(theRow(phone.database)).toBeUndefined();
      phone.close();
    });

    it('is removed where the article carries no identifier', () => {
      const phone = aPhoneThatDrewAnArticle(
        directory,
        JSON.stringify({
          phase: thePhaseTheOldBuildRecorded,
          article: { ...theArticleSheWasShown, id: '' },
          readAt: sheWasShownItAt,
        }),
      );

      expect(takeThePhaseOffTheArticleAnswer(phone.database)).toEqual({ move: 'removed' });

      expect(theRow(phone.database)).toBeUndefined();
      phone.close();
    });

    it('is out of the file as the pass removes it, before anything is rebuilt', () => {
      const hers = phaseWordsThatAreHersAlone(directory);
      const phone = aPhoneThatDrewAnArticle(directory, theOldRow(null));

      takeThePhaseOffTheArticleAnswer(phone.database);

      expect(hers.filter((name) => theFileHolds(phone.path, name))).toEqual([]);
      phone.close();
    });

    it('leaves no phase in the file once the launch has run', () => {
      const hers = phaseWordsThatAreHersAlone(directory);
      const phone = aPhoneThatDrewAnArticle(directory, theOldRow(null));
      expect(theFileHolds(phone.path, thePhaseTheOldBuildRecorded)).toBe(true);

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(hers.filter((name) => theFileHolds(phone.path, name))).toEqual([]);
      phone.close();
    });
  });

  describe('a phone that never drew an article, and a phone already on this build', () => {
    it('writes nothing where the row is absent', () => {
      const phone = aPhoneThatDrewAnArticle(directory);
      phone.database.run('DELETE FROM setting WHERE key = ?', ['articleAnswer']);

      expect(takeThePhaseOffTheArticleAnswer(phone.database)).toEqual({
        move: 'no-row-to-rewrite',
      });
      phone.close();
    });

    it('leaves a row already holding the slug where it is', () => {
      const phone = aPhoneThatDrewAnArticle(
        directory,
        `{"id":"${theArticleSheWasShown.id}","readAt":"${sheWasShownItAt}"}`,
      );

      expect(takeThePhaseOffTheArticleAnswer(phone.database)).toEqual({
        move: 'already-holds-the-slug',
        id: theArticleSheWasShown.id,
      });

      expect(theRow(phone.database)).toBe(
        `{"id":"${theArticleSheWasShown.id}","readAt":"${sheWasShownItAt}"}`,
      );
      phone.close();
    });
  });

  describe('a row that reads back as the two fields and carries a third', () => {
    it('is rewritten, because the row must be the line this build writes', () => {
      const phone = aPhoneThatDrewAnArticle(
        directory,
        JSON.stringify({
          id: theArticleSheWasShown.id,
          readAt: sheWasShownItAt,
          phase: thePhaseTheOldBuildRecorded,
        }),
      );

      expect(takeThePhaseOffTheArticleAnswer(phone.database)).toEqual({
        move: 'rewritten-as-the-slug',
        id: theArticleSheWasShown.id,
      });

      expect(theRow(phone.database)).toBe(
        `{"id":"${theArticleSheWasShown.id}","readAt":"${sheWasShownItAt}"}`,
      );
      phone.close();
    });

    it('leaves no phase in the file once the launch has run', () => {
      const hers = phaseWordsThatAreHersAlone(directory);
      const phone = aPhoneThatDrewAnArticle(
        directory,
        JSON.stringify({
          id: theArticleSheWasShown.id,
          readAt: sheWasShownItAt,
          phase: thePhaseTheOldBuildRecorded,
        }),
      );
      expect(theFileHolds(phone.path, thePhaseTheOldBuildRecorded)).toBe(true);

      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);

      expect(hers.filter((name) => theFileHolds(phone.path, name))).toEqual([]);
      phone.close();
    });
  });

  describe('what the launch pays for the pass', () => {
    it('rebuilds the file once on the launch that rewrote the row', () => {
      const phone = aPhoneThatDrewAnArticle(directory);
      const first = watched(phone.database);

      const outcome = runTheLaunchPasses(first.watching, herVaults(), sheOpenedItAt);

      expect(outcome.articleAnswer.move).toBe('rewritten-as-the-slug');
      expect(outcome.fileRebuilt).toBe(true);
      expect(rebuilds(first.said)).toBe(1);
      phone.close();
    });

    it('does not rebuild it on the launch after, because nothing moved', () => {
      const phone = aPhoneThatDrewAnArticle(directory);
      runTheLaunchPasses(phone.database, herVaults(), sheOpenedItAt);
      const second = watched(phone.database);

      const outcome = runTheLaunchPasses(second.watching, herVaults(), sheOpenedItAt);

      expect(outcome.articleAnswer.move).toBe('already-holds-the-slug');
      expect(outcome.fileRebuilt).toBe(false);
      expect(rebuilds(second.said)).toBe(0);
      phone.close();
    });

    it('rebuilds it where the row was removed rather than rewritten', () => {
      const phone = aPhoneThatDrewAnArticle(directory, theOldRow(null));
      const first = watched(phone.database);

      const outcome = runTheLaunchPasses(first.watching, herVaults(), sheOpenedItAt);

      expect(outcome.articleAnswer.move).toBe('removed');
      expect(outcome.fileRebuilt).toBe(true);
      expect(rebuilds(first.said)).toBe(1);
      phone.close();
    });
  });
});
