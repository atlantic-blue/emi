import type { Article, ArticleSource } from '@emi/content';
import { articleReader } from '@emi/content';
import type { PhaseName } from '@emi/tokens';
import { phaseNames } from '@emi/tokens';

import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { readSetting } from '../../src/data/settingRepository';
import { databaseLastShownArticle } from '../../src/features/today/lastShownArticle';
import { openTestDatabase } from '../data/nodeDatabase';

const readAt = new Date('2026-09-28T07:30:00.000Z');

const drawn: Article = {
  id: 'why-the-days-before-drag',
  phase: 'luteal',
  title: 'Why the days before drag',
  body: 'A piece of general writing about the days before a period, which anybody can fetch.',
  attribution: 'Written elsewhere.',
  link: 'https://articles.example/luteal',
};

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

function reading(
  database: Database,
  source: ArticleSource,
): (phase: PhaseName) => Promise<Article | null> {
  return articleReader({
    source,
    lastShown: databaseLastShownArticle(database),
    now: () => readAt,
  });
}

function answering(article: Article | null): { source: ArticleSource; calls: PhaseName[] } {
  const calls: PhaseName[] = [];

  return {
    calls,
    source: (phase) => {
      calls.push(phase);
      return Promise.resolve(article);
    },
  };
}

function row(database: Database): string | undefined {
  return readSetting(database, 'articleAnswer');
}

describe('the last article answer holds the article by its slug', () => {
  describe('the row a drawn article leaves on the phone', () => {
    it('is one line holding an identifier and an instant', async () => {
      const database = migrated();

      const read = await reading(database, answering(drawn).source)('luteal');

      expect(read).toEqual(drawn);
      expect(row(database)).toBe(
        '{"id":"why-the-days-before-drag","readAt":"2026-09-28T07:30:00.000Z"}',
      );
    });

    it('names no cycle phase, so the row records nothing about her body', async () => {
      const database = migrated();

      await reading(database, answering(drawn).source)('luteal');

      const written = row(database) ?? '';

      expect(Object.keys(JSON.parse(written))).toEqual(['id', 'readAt']);
      for (const phase of phaseNames) {
        expect(written).not.toContain(phase);
      }
    });

    it('carries none of the words she read', async () => {
      const database = migrated();

      await reading(database, answering(drawn).source)('luteal');

      const written = row(database) ?? '';

      expect(written).not.toContain(drawn.title);
      expect(written).not.toContain(drawn.body);
      expect(written).not.toContain(drawn.attribution);
      expect(written).not.toContain(drawn.link);
    });

    it('is absent where she was shown nothing', async () => {
      const database = migrated();

      const read = await reading(database, answering(null).source)('luteal');

      expect(read).toBeNull();
      expect(row(database)).toBeUndefined();
    });
  });

  describe('what the row is read back for', () => {
    it('names the article she was last shown', async () => {
      const database = migrated();

      await reading(database, answering(drawn).source)('luteal');

      expect(await databaseLastShownArticle(database).read()).toEqual({
        id: 'why-the-days-before-drag',
        readAt: readAt.toISOString(),
      });
    });

    it('reads back nothing from a row written before the phase came out of it', async () => {
      const database = migrated();

      database.run('INSERT INTO setting (key, value) VALUES (?, ?)', [
        'articleAnswer',
        JSON.stringify({ phase: 'luteal', article: drawn, readAt: readAt.toISOString() }),
      ]);

      expect(await databaseLastShownArticle(database).read()).toBeNull();
    });
  });

  describe('the article the screen is handed', () => {
    it('comes from the source on every launch, because the row does not stand in for it', async () => {
      const database = migrated();
      const source = answering(drawn);

      const first = await reading(database, source.source)('luteal');
      const afterALaunch = await reading(database, source.source)('luteal');

      expect(first).toEqual(drawn);
      expect(afterALaunch).toEqual(drawn);
      expect(source.calls).toEqual(['luteal', 'luteal']);
    });

    it('is asked for once in a launch, however many times the screen draws', async () => {
      const database = migrated();
      const source = answering(drawn);
      const read = reading(database, source.source);

      await read('luteal');
      await read('luteal');
      await read('luteal');

      expect(source.calls).toEqual(['luteal']);
    });
  });
});
