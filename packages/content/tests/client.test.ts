import type { Article } from '../src/article';
import { articleFrom } from '../src/article';
import type { ArticleAnswer, ArticleRequest, SendArticleRequest } from '../src/client';
import {
  ARTICLE_TIMEOUT_MILLISECONDS,
  articlePath,
  articlesAt,
  withoutATrailingSlash,
} from '../src/client';

const address = 'https://articles.example/emi';

const anArticle: Article = {
  id: 'ovulation-1',
  phase: 'ovulation',
  title: 'A window, never a day',
  body: 'A piece of writing the endpoint answered, whose shape passed the check.',
  attribution: 'Written elsewhere.',
  link: 'https://articles.example/ovulation',
};

function sendingBack(answer: ArticleAnswer): SendArticleRequest {
  return () => Promise.resolve(answer);
}

/** A sender that records what it was asked for, so a test can read the whole of the request. */
function recording(answer: ArticleAnswer): {
  send: SendArticleRequest;
  asked: ArticleRequest[];
} {
  const asked: ArticleRequest[] = [];

  return {
    asked,
    send: (request) => {
      asked.push(request);
      return Promise.resolve(answer);
    },
  };
}

describe('the article client', () => {
  describe('what the request carries', () => {
    it('asks for the cycle phase and names nothing else', async () => {
      const { send, asked } = recording({ status: 200, body: anArticle });

      await articlesAt(address, send)('ovulation');

      expect(asked).toEqual([
        { url: 'https://articles.example/emi/v1/articles/ovulation', method: 'GET' },
      ]);
    });

    it('writes the path from the phase and nothing she entered', () => {
      expect(articlePath('luteal')).toBe('/v1/articles/luteal');
      expect(articlePath('period')).toBe('/v1/articles/period');
    });

    it('joins one slash to an address that already ends in one', () => {
      expect(withoutATrailingSlash('https://articles.example//')).toBe('https://articles.example');
      expect(withoutATrailingSlash('https://articles.example')).toBe('https://articles.example');
    });

    it('hands back the article the endpoint answered', async () => {
      const read = await articlesAt(
        address,
        sendingBack({ status: 200, body: anArticle }),
      )('ovulation');

      expect(read).toEqual(anArticle);
    });
  });

  describe('a build with no address, which is every build today', () => {
    it('gives no article, and asks nothing of the network', async () => {
      const { send, asked } = recording({ status: 200, body: anArticle });

      await expect(articlesAt(null, send)('ovulation')).resolves.toBeNull();
      expect(asked).toEqual([]);
    });

    it('reads an address of blank space as no address', async () => {
      const { send, asked } = recording({ status: 200, body: anArticle });

      await expect(articlesAt('   ', send)('ovulation')).resolves.toBeNull();
      expect(asked).toEqual([]);
    });
  });

  describe('an answer that is nothing', () => {
    it('gives no article when the body is empty', async () => {
      const read = await articlesAt(address, sendingBack({ status: 200, body: null }))('period');

      expect(read).toBeNull();
    });

    it('gives no article when the body holds no article', async () => {
      const read = await articlesAt(
        address,
        sendingBack({ status: 204, body: undefined }),
      )('period');

      expect(read).toBeNull();
    });
  });

  describe('an answer that is too slow', () => {
    it('gives no article once the wait is over, and does not wait for the call', async () => {
      jest.useFakeTimers();

      try {
        let answered = false;
        const send: SendArticleRequest = () =>
          new Promise<ArticleAnswer>((resolve) => {
            setTimeout(() => {
              answered = true;
              resolve({ status: 200, body: anArticle });
            }, ARTICLE_TIMEOUT_MILLISECONDS * 2);
          });

        const reading = articlesAt(address, send)('ovulation');

        await jest.advanceTimersByTimeAsync(ARTICLE_TIMEOUT_MILLISECONDS);

        await expect(reading).resolves.toBeNull();
        expect(answered).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    it('takes the article from a call that answers inside the wait', async () => {
      jest.useFakeTimers();

      try {
        const send: SendArticleRequest = () =>
          new Promise<ArticleAnswer>((resolve) => {
            setTimeout(() => resolve({ status: 200, body: anArticle }), 10);
          });

        const reading = articlesAt(address, send)('ovulation');

        await jest.advanceTimersByTimeAsync(ARTICLE_TIMEOUT_MILLISECONDS);

        await expect(reading).resolves.toEqual(anArticle);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('an answer that is a refusal', () => {
    it.each([400, 401, 403, 404, 429, 500, 503])(
      'gives no article on a status of %i',
      async (status) => {
        const read = await articlesAt(
          address,
          sendingBack({ status, body: anArticle }),
        )('ovulation');

        expect(read).toBeNull();
      },
    );

    it('gives no article, and raises none, when the call itself fails', async () => {
      const send: SendArticleRequest = () => Promise.reject(new Error('the radio is off'));

      await expect(articlesAt(address, send)('period')).resolves.toBeNull();
    });

    it('gives no article when the sender throws before it reaches the network', async () => {
      const send: SendArticleRequest = () => {
        throw new Error('the address is not a url');
      };

      await expect(articlesAt(address, send)('period')).resolves.toBeNull();
    });
  });

  describe('an answer whose shape is wrong', () => {
    const cases: readonly { readonly named: string; readonly body: unknown }[] = [
      { named: 'a body that is a string', body: 'an article' },
      { named: 'a body that is a list', body: [anArticle] },
      { named: 'a body missing the title', body: { ...anArticle, title: undefined } },
      { named: 'a body whose title is empty', body: { ...anArticle, title: '   ' } },
      { named: 'a body whose body is a number', body: { ...anArticle, body: 7 } },
      { named: 'a body with no attribution', body: { ...anArticle, attribution: '' } },
      {
        named: 'a link that is not https',
        body: { ...anArticle, link: 'http://articles.example' },
      },
      { named: 'a link that runs a script', body: { ...anArticle, link: 'javascript:alert(1)' } },
      { named: 'a link that is missing', body: { ...anArticle, link: undefined } },
      { named: 'a link that is a number', body: { ...anArticle, link: 7 } },
      { named: 'a phase nobody draws', body: { ...anArticle, phase: 'menopause' } },
    ];

    it.each(cases)('gives no article for $named', async ({ body }) => {
      const read = await articlesAt(address, sendingBack({ status: 200, body }))('ovulation');

      expect(read).toBeNull();
    });

    it('refuses an article about a phase other than the one asked for', async () => {
      const read = await articlesAt(
        address,
        sendingBack({ status: 200, body: anArticle }),
      )('luteal');

      expect(read).toBeNull();
    });

    it('takes an article with no link, because a piece may have no page to open', async () => {
      const noPage = { ...anArticle, link: null };
      const read = await articlesAt(
        address,
        sendingBack({ status: 200, body: noPage }),
      )('ovulation');

      expect(read).toEqual(noPage);
    });

    it('reads the same refusals when the shape is checked on its own', () => {
      expect(articleFrom(anArticle, 'ovulation')).toEqual(anArticle);
      expect(articleFrom(anArticle, 'period')).toBeNull();
      expect(articleFrom(null, 'period')).toBeNull();
      expect(articleFrom(undefined, 'period')).toBeNull();
    });
  });
});
