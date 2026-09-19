import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Article, ArticleAnswer, ArticleSource, CachedAnswer } from '@emi/content';
import { ARTICLE_TIMEOUT_MILLISECONDS, articleReader, articlesAt } from '@emi/content';
import type { PhaseName } from '@emi/tokens';

import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { readSetting } from '../../src/data/settingRepository';
import { articleAddress, articleAddressVariable } from '../../src/features/today/articleAddress';
import { databaseArticleCache } from '../../src/features/today/articleCache';
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

/** The reader as the application builds it: the row on the phone, and the endpoint at an address. */
function readerOver(
  database: Database,
  source: ArticleSource,
  now: () => Date = () => readAt,
): (phase: PhaseName) => Promise<Article | null> {
  return articleReader({ source, cache: databaseArticleCache(database), now });
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

function held(database: Database): CachedAnswer | null {
  const row = readSetting(database, 'articleAnswer');

  return row === undefined ? null : (JSON.parse(row) as CachedAnswer);
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
    it('draws what it sent, and holds it on the phone with the time it was read', async () => {
      const database = migrated();
      const { send } = answering({ status: 200, body: fromTheEndpoint });

      const read = await readerOver(database, articlesAt(address, send))('follicular');

      expect(read).toEqual(fromTheEndpoint);
      expect(held(database)).toEqual({
        phase: 'follicular',
        article: fromTheEndpoint,
        readAt: readAt.toISOString(),
      });
    });

    it('is not asked again on the next draw, because the row is read first', async () => {
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

    it('holds the nothing it was told, so an endpoint that is down is asked once', async () => {
      const database = migrated();
      const { send, asked } = answering({ status: 503, body: null });
      const read = readerOver(database, articlesAt(address, send));

      await read('period');
      await read('period');

      expect(asked).toHaveLength(1);
      expect(held(database)).toEqual({
        phase: 'period',
        article: null,
        readAt: readAt.toISOString(),
      });
    });
  });

  describe('the row on the phone', () => {
    it('is read back across a launch, so a second launch draws without a call', async () => {
      const database = migrated();
      const { send, asked } = answering({ status: 200, body: fromTheEndpoint });

      await readerOver(database, articlesAt(address, send))('follicular');

      const afterALaunch = await readerOver(database, articlesAt(address, send))('follicular');

      expect(afterALaunch).toEqual(fromTheEndpoint);
      expect(asked).toHaveLength(1);
    });

    it('is asked again once the phase has turned', async () => {
      const database = migrated();
      const { send, asked } = answering({ status: 200, body: fromTheEndpoint });
      const read = readerOver(database, articlesAt(address, send));

      await read('follicular');
      const next = await read('luteal');

      expect(asked).toHaveLength(2);
      expect(next).toBeNull();
    });

    it.each([
      ['a line that is not json', 'not json at all'],
      [
        'a line whose article is a shape nobody can draw',
        JSON.stringify({ phase: 'follicular', article: { id: 1 }, readAt: readAt.toISOString() }),
      ],
      [
        'a line that names a phase nobody draws',
        JSON.stringify({ phase: 'menopause', article: null, readAt: readAt.toISOString() }),
      ],
    ])('is thrown away rather than trusted when it holds %s', async (_named, written) => {
      const database = migrated();
      const { send, asked } = answering({ status: 200, body: fromTheEndpoint });

      database.run('INSERT INTO setting (key, value) VALUES (?, ?)', ['articleAnswer', written]);

      const read = await readerOver(database, articlesAt(address, send))('follicular');

      expect(read).toEqual(fromTheEndpoint);
      expect(asked).toHaveLength(1);
    });

    it('holds nothing she entered about her body', async () => {
      const database = migrated();
      const { send } = answering({ status: 200, body: fromTheEndpoint });

      await readerOver(database, articlesAt(address, send))('follicular');

      expect(readSetting(database, 'articleAnswer')).toBe(
        JSON.stringify({
          phase: 'follicular',
          article: fromTheEndpoint,
          readAt: readAt.toISOString(),
        }),
      );
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
