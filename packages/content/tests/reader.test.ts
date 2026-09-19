import type { PhaseName } from '@emi/tokens';

import type { Article, ArticleSource } from '../src/article';
import type { ArticleCache, CachedAnswer } from '../src/cache';
import {
  CACHE_LIFETIME_MILLISECONDS,
  isFresh,
  memoryCache,
  readAnswer,
  writtenAnswer,
} from '../src/cache';
import { articlesAt } from '../src/client';
import { articleReader } from '../src/reader';

const readAt = new Date('2026-09-19T09:00:00.000Z');

const answered: Article = {
  id: 'from-the-endpoint',
  phase: 'period',
  title: 'What the endpoint sent',
  body: 'A piece of writing the endpoint answered, whose shape passed the check.',
  attribution: 'Written elsewhere.',
  link: 'https://articles.example/period',
};

function counting(answer: Article | null): { source: ArticleSource; calls: PhaseName[] } {
  const calls: PhaseName[] = [];

  return {
    calls,
    source: (phase) => {
      calls.push(phase);
      return Promise.resolve(answer);
    },
  };
}

function watching(cache: ArticleCache): { cache: ArticleCache; written: CachedAnswer[] } {
  const written: CachedAnswer[] = [];

  return {
    written,
    cache: {
      read: () => cache.read(),
      write: async (answer) => {
        written.push(answer);
        await cache.write(answer);
      },
    },
  };
}

describe('the article a screen is handed', () => {
  describe('with no address configured, which is every build today', () => {
    it('hands the screen no article, so no card is drawn', async () => {
      const read = await articleReader({
        source: articlesAt(null, () => Promise.reject(new Error('nothing should be sent'))),
        now: () => readAt,
      })('luteal');

      expect(read).toBeNull();
    });
  });

  describe('when the endpoint answers', () => {
    it('hands back what it answered', async () => {
      const read = await articleReader({ source: counting(answered).source, now: () => readAt })(
        'period',
      );

      expect(read).toEqual(answered);
    });

    it('holds the answer with the instant it was read', async () => {
      const watched = watching(memoryCache());

      await articleReader({
        source: counting(answered).source,
        cache: watched.cache,
        now: () => readAt,
      })('period');

      expect(watched.written).toEqual([
        { phase: 'period', article: answered, readAt: readAt.toISOString() },
      ]);
    });
  });

  describe('when the endpoint answers nothing', () => {
    it('hands the screen no article, so the card is absent rather than wrong', async () => {
      const read = await articleReader({ source: counting(null).source, now: () => readAt })(
        'ovulation',
      );

      expect(read).toBeNull();
    });

    it('holds the nothing, so the next draw does not call again', async () => {
      const source = counting(null);
      const cache = memoryCache();
      const read = articleReader({ source: source.source, cache, now: () => readAt });

      await read('ovulation');
      await read('ovulation');

      expect(source.calls).toEqual(['ovulation']);
      expect(await cache.read()).toEqual({
        phase: 'ovulation',
        article: null,
        readAt: readAt.toISOString(),
      });
    });
  });

  describe('what is already held', () => {
    const held: Article = { ...answered, id: 'held', title: 'The held piece' };

    it('is handed back without a call', async () => {
      const source = counting(answered);
      const read = await articleReader({
        source: source.source,
        cache: memoryCache({ phase: 'period', article: held, readAt: readAt.toISOString() }),
        now: () => readAt,
      })('period');

      expect(read).toEqual(held);
      expect(source.calls).toEqual([]);
    });

    it('is read again once the lifetime is over', async () => {
      const source = counting(null);
      const later = new Date(readAt.getTime() + CACHE_LIFETIME_MILLISECONDS + 1);

      await articleReader({
        source: source.source,
        cache: memoryCache({ phase: 'period', article: held, readAt: readAt.toISOString() }),
        now: () => later,
      })('period');

      expect(source.calls).toEqual(['period']);
    });

    it('is read again when the phase has turned', async () => {
      const source = counting(null);

      await articleReader({
        source: source.source,
        cache: memoryCache({ phase: 'period', article: held, readAt: readAt.toISOString() }),
        now: () => readAt,
      })('follicular');

      expect(source.calls).toEqual(['follicular']);
    });
  });

  describe('a part that raises rather than answering', () => {
    const raising = (): Promise<never> => Promise.reject(new Error('the disk is full'));

    it('hands back no article when the storage will not be read', async () => {
      const read = await articleReader({
        source: counting(null).source,
        cache: { read: raising, write: () => Promise.resolve() },
        now: () => readAt,
      })('period');

      expect(read).toBeNull();
    });

    it('hands back the answer when the storage will not be written', async () => {
      const read = await articleReader({
        source: counting(answered).source,
        cache: { read: () => Promise.resolve(null), write: raising },
        now: () => readAt,
      })('period');

      expect(read).toEqual(answered);
    });

    it('hands back no article, and raises none, when the source raises', async () => {
      const read = await articleReader({ source: raising, now: () => readAt })('luteal');

      expect(read).toBeNull();
    });
  });

  describe('the freshness rule on its own', () => {
    const answer: CachedAnswer = {
      phase: 'period',
      article: null,
      readAt: readAt.toISOString(),
    };

    it('holds for the whole lifetime and not a millisecond past it', () => {
      const lastMoment = new Date(readAt.getTime() + CACHE_LIFETIME_MILLISECONDS);
      const past = new Date(lastMoment.getTime() + 1);

      expect(isFresh(answer, 'period', lastMoment)).toBe(true);
      expect(isFresh(answer, 'period', past)).toBe(false);
    });

    it('drops an answer that was read after now, because the clock moved backwards', () => {
      expect(isFresh(answer, 'period', new Date(readAt.getTime() - 1))).toBe(false);
    });

    it('drops an answer whose instant cannot be read', () => {
      expect(isFresh({ ...answer, readAt: 'the morning' }, 'period', readAt)).toBe(false);
    });
  });

  describe('an answer read back from storage', () => {
    it('reads back exactly what was written', () => {
      const answer: CachedAnswer = {
        phase: 'period',
        article: answered,
        readAt: readAt.toISOString(),
      };

      expect(readAnswer(writtenAnswer(answer))).toEqual(answer);
    });

    it('reads back a held nothing', () => {
      const answer: CachedAnswer = { phase: 'luteal', article: null, readAt: readAt.toISOString() };

      expect(readAnswer(writtenAnswer(answer))).toEqual(answer);
    });

    it.each([
      ['a line that is not json', 'not json at all'],
      ['a line that is a list', '[]'],
      ['a phase nobody draws', '{"phase":"menopause","article":null,"readAt":"2026-09-19"}'],
      ['an instant that is missing', '{"phase":"luteal","article":null}'],
      ['an article whose shape is wrong', '{"phase":"luteal","article":{},"readAt":"2026-09-19"}'],
    ])('answers nothing for %s', (_named, written) => {
      expect(readAnswer(written)).toBeNull();
    });
  });
});
