import type { PhaseName } from '@emi/tokens';

import type { Article, ArticleSource } from '../src/article';
import type { ArticleCache, HeldAnswer } from '../src/cache';
import { CACHE_LIFETIME_MILLISECONDS, isFresh, memoryCache } from '../src/cache';
import { articlesAt } from '../src/client';
import type { LastShownArticle, LastShownStore } from '../src/lastShown';
import { readLastShown, writtenLastShown } from '../src/lastShown';
import { articleReader } from '../src/reader';

const readAt = new Date('2026-09-19T09:00:00.000Z');

const thirteenHours = 13 * 60 * 60 * 1000;

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

function answeringEachPhase(answers: Partial<Record<PhaseName, Article>>): {
  source: ArticleSource;
  calls: PhaseName[];
} {
  const calls: PhaseName[] = [];

  return {
    calls,
    source: (phase) => {
      calls.push(phase);
      return Promise.resolve(answers[phase] ?? null);
    },
  };
}

function recording(): { store: LastShownStore; written: LastShownArticle[] } {
  const written: LastShownArticle[] = [];
  let held: LastShownArticle | null = null;

  return {
    written,
    store: {
      read: () => Promise.resolve(held),
      write: (shown) => {
        written.push(shown);
        held = shown;
        return Promise.resolve();
      },
    },
  };
}

function holding(phase: PhaseName, answer: HeldAnswer): ArticleCache {
  return memoryCache({ [phase]: answer });
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

    it('holds the answer under the phase it was asked about, with the instant it was read', async () => {
      const cache = memoryCache();

      await articleReader({ source: counting(answered).source, cache, now: () => readAt })(
        'period',
      );

      expect(await cache.read('period')).toEqual({
        article: answered,
        readAt: readAt.toISOString(),
      });
      expect(await cache.read('luteal')).toBeNull();
    });

    it('remembers the article she was shown by its slug, and the instant', async () => {
      const remembered = recording();

      await articleReader({
        source: counting(answered).source,
        lastShown: remembered.store,
        now: () => readAt,
      })('period');

      expect(remembered.written).toEqual([
        { id: 'from-the-endpoint', readAt: readAt.toISOString() },
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
      expect(await cache.read('ovulation')).toEqual({
        article: null,
        readAt: readAt.toISOString(),
      });
    });

    it('remembers nothing, because she was shown nothing', async () => {
      const remembered = recording();

      await articleReader({
        source: counting(null).source,
        lastShown: remembered.store,
        now: () => readAt,
      })('ovulation');

      expect(remembered.written).toEqual([]);
      expect(await remembered.store.read()).toBeNull();
    });
  });

  describe('what is already held', () => {
    const held: Article = { ...answered, id: 'held', title: 'The held piece' };
    const heldAnswer: HeldAnswer = { article: held, readAt: readAt.toISOString() };

    it('is handed back without a call', async () => {
      const source = counting(answered);
      const read = await articleReader({
        source: source.source,
        cache: holding('period', heldAnswer),
        now: () => readAt,
      })('period');

      expect(read).toEqual(held);
      expect(source.calls).toEqual([]);
    });

    it('is read again once the answer is thirteen hours old', async () => {
      const source = counting(answered);
      const later = new Date(readAt.getTime() + thirteenHours);

      const read = await articleReader({
        source: source.source,
        cache: holding('period', heldAnswer),
        now: () => later,
      })('period');

      expect(source.calls).toEqual(['period']);
      expect(read).toEqual(answered);
    });

    it('is dropped when the clock has moved backwards', async () => {
      const source = counting(answered);
      const earlier = new Date(readAt.getTime() - 1);

      const read = await articleReader({
        source: source.source,
        cache: holding('period', heldAnswer),
        now: () => earlier,
      })('period');

      expect(source.calls).toEqual(['period']);
      expect(read).toEqual(answered);
    });

    it('is not served for another phase, which is asked about on its own', async () => {
      const forEachPhase = answeringEachPhase({
        period: answered,
        luteal: { ...answered, id: 'the-luteal-one', phase: 'luteal', title: 'The luteal piece' },
      });
      const read = articleReader({
        source: forEachPhase.source,
        cache: memoryCache(),
        now: () => readAt,
      });

      const first = await read('period');
      const second = await read('luteal');

      expect(first).toEqual(answered);
      expect(second?.id).toBe('the-luteal-one');
      expect(forEachPhase.calls).toEqual(['period', 'luteal']);
    });
  });

  describe('a part that raises rather than answering', () => {
    const raising = (): Promise<never> => Promise.reject(new Error('the disk is full'));

    it('hands back no article when the held answer will not be read', async () => {
      const read = await articleReader({
        source: counting(null).source,
        cache: { read: raising, write: () => Promise.resolve() },
        now: () => readAt,
      })('period');

      expect(read).toBeNull();
    });

    it('hands back the answer when the held answer will not be written', async () => {
      const read = await articleReader({
        source: counting(answered).source,
        cache: { read: () => Promise.resolve(null), write: raising },
        now: () => readAt,
      })('period');

      expect(read).toEqual(answered);
    });

    it('hands back the answer when the row will not be written', async () => {
      const read = await articleReader({
        source: counting(answered).source,
        lastShown: { read: () => Promise.resolve(null), write: raising },
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
    const answer: HeldAnswer = { article: null, readAt: readAt.toISOString() };

    it('holds for the whole lifetime and not a millisecond past it', () => {
      const lastMoment = new Date(readAt.getTime() + CACHE_LIFETIME_MILLISECONDS);
      const past = new Date(lastMoment.getTime() + 1);

      expect(isFresh(answer, lastMoment)).toBe(true);
      expect(isFresh(answer, past)).toBe(false);
    });

    it('drops an answer of thirteen hours, which is past the lifetime', () => {
      expect(isFresh(answer, new Date(readAt.getTime() + thirteenHours))).toBe(false);
    });

    it('drops an answer that was read after now, because the clock moved backwards', () => {
      expect(isFresh(answer, new Date(readAt.getTime() - 1))).toBe(false);
    });

    it('drops an answer whose instant cannot be read', () => {
      expect(isFresh({ ...answer, readAt: 'the morning' }, readAt)).toBe(false);
    });
  });

  describe('the row the phone keeps', () => {
    const shown: LastShownArticle = { id: 'from-the-endpoint', readAt: readAt.toISOString() };

    it('is one line holding an identifier and an instant, and nothing else', () => {
      expect(writtenLastShown(shown)).toBe(
        '{"id":"from-the-endpoint","readAt":"2026-09-19T09:00:00.000Z"}',
      );
    });

    it('names no cycle phase and carries no words she read', () => {
      const written = writtenLastShown(shown);

      for (const phase of ['period', 'follicular', 'ovulation', 'luteal']) {
        expect(written).not.toContain(phase);
      }

      expect(written).not.toContain(answered.title);
      expect(written).not.toContain(answered.body);
    });

    it('reads back exactly what was written', () => {
      expect(readLastShown(writtenLastShown(shown))).toEqual(shown);
    });

    it.each([
      ['a line that is not json', 'not json at all'],
      ['a line that is a list', '[]'],
      ['a line with no identifier', '{"readAt":"2026-09-19T09:00:00.000Z"}'],
      ['a line with no instant', '{"id":"from-the-endpoint"}'],
      ['an identifier that is not a name', '{"id":"  ","readAt":"2026-09-19T09:00:00.000Z"}'],
      [
        'a row written before the phase came out of it',
        '{"phase":"period","article":null,"readAt":"2026-09-19T09:00:00.000Z"}',
      ],
    ])('answers nothing for %s', (_named, written) => {
      expect(readLastShown(written)).toBeNull();
    });
  });
});
