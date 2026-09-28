import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Article, ArticleAnswer, ArticleSource, LastShownArticle } from '@emi/content';
import { ARTICLE_TIMEOUT_MILLISECONDS, articleReader, articlesAt } from '@emi/content';
import type { PhaseName } from '@emi/tokens';

import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { readSetting } from '../../src/data/settingRepository';
import { articleAddress, articleAddressVariable } from '../../src/features/today/articleAddress';
import { databaseLastShownArticle } from '../../src/features/today/lastShownArticle';
import { openTestDatabase } from '../data/nodeDatabase';

const address = 'https://articles.example';
const readAt = new Date('2026-09-19T08:00:00.000Z');

const fromTheEndpoint: Article = {
  id: 'endpoint-follicular-1',
  phase: 'follicular',
  title: 'What the endpoint sent',
  body: 'A piece of writing the endpoint answered, whose shape passed the check.',
  attribution: 'Written elsewhere.',
  link: 'https://articles.example/follicular',
};

function migrated(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

/**
 * The reader as the application builds it: the endpoint at an address, the answer held for the
 * life of this reader, and the row on the phone remembering what she was last shown. A second
 * reader over the same database is the next launch.
 */
function readerOver(
  database: Database,
  source: ArticleSource,
  now: () => Date = () => readAt,
): (phase: PhaseName) => Promise<Article | null> {
  return articleReader({ source, lastShown: databaseLastShownArticle(database), now });
}

function answering(answer: ArticleAnswer): {
  send: (request: { url: string }) => Promise<ArticleAnswer>;
  asked: string[];
} {
  const asked: string[] = [];

  return {
    asked,
    send: (request) => {
      asked.push(request.url);
      return Promise.resolve(answer);
    },
  };
}

function remembered(database: Database): LastShownArticle | null {
  const row = readSetting(database, 'articleAnswer');

  return row === undefined ? null : (JSON.parse(row) as LastShownArticle);
}

describe('the article feed comes from an api', () => {
  describe('the product as it stands today, with no endpoint deployed', () => {
    it('carries no address, so the screen is handed no article', async () => {
      const database = migrated();
      const { send, asked } = answering({ status: 200, body: fromTheEndpoint });

      const read = await readerOver(
        database,
        articlesAt(articleAddress(undefined), send),
      )('follicular');

      expect(read).toBeNull();
      expect(asked).toEqual([]);
    });

    it('reads the address out of the build, under the name the bundler replaces', () => {
      expect(articleAddressVariable).toBe('EXPO_PUBLIC_EMI_ARTICLES_URL');
      expect(articleAddress('  ')).toBeNull();
      expect(articleAddress('https://articles.example')).toBe('https://articles.example');
    });
  });

  describe('an endpoint that answers', () => {
    it('draws what it sent, and remembers it on the phone by its slug', async () => {
      const database = migrated();
      const { send } = answering({ status: 200, body: fromTheEndpoint });

      const read = await readerOver(database, articlesAt(address, send))('follicular');

      expect(read).toEqual(fromTheEndpoint);
      expect(remembered(database)).toEqual({
        id: 'endpoint-follicular-1',
        readAt: readAt.toISOString(),
      });
    });

    it('is not asked again on the next draw, because the answer is held in this launch', async () => {
      const database = migrated();
      const { send, asked } = answering({ status: 200, body: fromTheEndpoint });
      const read = readerOver(database, articlesAt(address, send));

      await read('follicular');
      const second = await read('follicular');

      expect(second).toEqual(fromTheEndpoint);
      expect(asked).toEqual(['https://articles.example/v1/articles/follicular']);
    });
  });

  describe('an endpoint that fails, in each of the four ways', () => {
    const failures: readonly { readonly named: string; readonly answer: ArticleAnswer }[] = [
      { named: 'answers nothing', answer: { status: 200, body: null } },
      { named: 'refuses the call', answer: { status: 503, body: null } },
      { named: 'answers a shape nobody can draw', answer: { status: 200, body: { title: 'Hi' } } },
    ];

    it.each(failures)('hands the screen no article when it $named', async ({ answer }) => {
      const database = migrated();
      const { send } = answering(answer);

      const read = await readerOver(database, articlesAt(address, send))('period');

      expect(read).toBeNull();
    });

    it('hands the screen no article when it is too slow to answer', async () => {
      jest.useFakeTimers();

      try {
        const database = migrated();
        const send = (): Promise<ArticleAnswer> =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve({ status: 200, body: fromTheEndpoint }),
              ARTICLE_TIMEOUT_MILLISECONDS * 2,
            );
          });

        const reading = readerOver(database, articlesAt(address, send))('period');

        await jest.advanceTimersByTimeAsync(ARTICLE_TIMEOUT_MILLISECONDS);

        await expect(reading).resolves.toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it('raises nothing at the screen when the call itself throws', async () => {
      const database = migrated();
      const send = (): Promise<ArticleAnswer> => Promise.reject(new Error('the radio is off'));

      await expect(readerOver(database, articlesAt(address, send))('luteal')).resolves.toBeNull();
    });

    it('holds the nothing it was told, so an endpoint that is down is asked once a launch', async () => {
      const database = migrated();
      const { send, asked } = answering({ status: 503, body: null });
      const read = readerOver(database, articlesAt(address, send));

      await read('period');
      await read('period');

      expect(asked).toHaveLength(1);
      expect(remembered(database)).toBeNull();
    });
  });

  describe('the next launch', () => {
    it('asks again, because the row does not stand in for the article', async () => {
      const database = migrated();
      const { send, asked } = answering({ status: 200, body: fromTheEndpoint });

      await readerOver(database, articlesAt(address, send))('follicular');

      const afterALaunch = await readerOver(database, articlesAt(address, send))('follicular');

      expect(afterALaunch).toEqual(fromTheEndpoint);
      expect(asked).toHaveLength(2);
    });

    it('asks again once the phase has turned', async () => {
      const database = migrated();
      const { send, asked } = answering({ status: 200, body: fromTheEndpoint });
      const read = readerOver(database, articlesAt(address, send));

      await read('follicular');
      const next = await read('luteal');

      expect(asked).toHaveLength(2);
      expect(next).toBeNull();
    });
  });

  describe('the words the prototype card carries', () => {
    const labels = ['clinical api feed', 'hormone harmony', 'curated medical api', 'dr. claire'];

    function sourceUnder(directory: string): string[] {
      const root = resolve(__dirname, '..', '..', '..', '..');
      const found: string[] = [];

      const walk = (at: string): void => {
        for (const entry of readdirSync(join(root, at), { withFileTypes: true })) {
          const path = join(at, entry.name);

          if (entry.isDirectory()) {
            walk(path);
          } else if (/\.tsx?$/.test(entry.name)) {
            found.push(readFileSync(join(root, path), 'utf8').toLowerCase());
          }
        }
      };

      walk(directory);

      return found;
    }

    it.each(['packages/content/src', 'apps/mobile/src/features/today'])(
      'are written nowhere in %s, because Emi has no clinician and no reviewer',
      (directory) => {
        const read = sourceUnder(directory);

        expect(read.length).toBeGreaterThan(0);
        for (const source of read) {
          for (const label of labels) {
            expect(source).not.toContain(label);
          }
        }
      },
    );
  });
});
