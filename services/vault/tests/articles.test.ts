import { accountHeader, bodyHashHeader, instantHeader, signatureHeader } from '@emi/crypto';
import { articleFrom, articlePath } from '@emi/content';
import { phaseNames } from '@emi/tokens';

import type { HttpRequestEvent, HttpResponse } from '../src/api';
import {
  articlesFor,
  cacheSeconds,
  identityHeaders,
  readArticles,
} from '../src/handlers/readArticles';
import type { ArticleStore } from '../src/store/articles';
import type { Item } from '../src/store/dynamo';
import {
  articlePartitionFor,
  articleSortKeyFor,
  dynamoArticleStore,
} from '../src/store/dynamoArticles';
import { articleTableName, type FakeTable, fakeTable, tableName } from './fixtures/dynamoTable';
import { articleEvent } from './fixtures/requests';

/**
 * Step 10.2, through the handler and the storage together. The catalogue under every case is the
 * DynamoDB one, over a table that refuses what the real table refuses, so what these cases drive is
 * what ships.
 *
 * The endpoint stands behind no authorizer and a request names no reader, so most of what is
 * checked here is what the server is unable to learn.
 *
 * The answer is read back through `@emi/content`, which is the one caller. A shape these cases
 * agreed on and that package refused would be a feature that ships and delivers nothing.
 */

function anArticle(phase: string, slug: string, held: Readonly<Record<string, string>> = {}): Item {
  return {
    pk: { S: articlePartitionFor(phase) },
    sk: { S: articleSortKeyFor(slug) },
    title: { S: `About ${slug}` },
    body: { S: 'Progesterone rises after ovulation, and that is what tires you out.' },
    attribution: { S: 'Written by Emi, read by a midwife' },
    language: { S: 'en-GB' },
    publishedAt: { S: '2026-09-19T09:00:00.000Z' },
    revision: { N: '1' },
    ...Object.fromEntries(Object.entries(held).map(([name, value]) => [name, { S: value }])),
  };
}

async function aCatalogue(...items: readonly Item[]): Promise<FakeTable> {
  const table = fakeTable({ name: articleTableName });

  for (const item of items) {
    await table.putItem({ TableName: articleTableName, Item: item });
  }

  return table;
}

function storeOver(table: FakeTable): ArticleStore {
  return dynamoArticleStore(table, articleTableName);
}

function bodyOf(response: HttpResponse): Record<string, unknown> {
  return JSON.parse(response.body) as Record<string, unknown>;
}

async function answerFor(event: HttpRequestEvent, table: FakeTable): Promise<HttpResponse> {
  return readArticles(storeOver(table))(event);
}

describe('the article catalogue answers a phase and never a reader', () => {
  describe('a phase she is in', () => {
    it('answers an article the application reads back as one', async () => {
      const table = await aCatalogue(anArticle('luteal', 'the-tired-week'));

      const response = await answerFor(articleEvent('luteal'), table);

      expect(response.statusCode).toBe(200);
      expect(articleFrom(bodyOf(response), 'luteal')).toEqual({
        id: 'the-tired-week',
        phase: 'luteal',
        title: 'About the-tired-week',
        body: 'Progesterone rises after ovulation, and that is what tires you out.',
        attribution: 'Written by Emi, read by a midwife',
        link: null,
      });
    });

    it('answers the article written for the phase asked for, and never another', async () => {
      const table = await aCatalogue(
        anArticle('luteal', 'the-tired-week'),
        anArticle('period', 'cramps-and-what-helps'),
      );

      const read = articleFrom(bodyOf(await answerFor(articleEvent('period'), table)), 'period');

      expect(read?.id).toBe('cramps-and-what-helps');
    });

    it('answers the newest of a phase, so every reader of it is handed the same one', async () => {
      const table = await aCatalogue(
        anArticle('follicular', 'the-old-one', { publishedAt: '2026-01-01T00:00:00.000Z' }),
        anArticle('follicular', 'the-new-one', { publishedAt: '2026-09-01T00:00:00.000Z' }),
      );

      const first = bodyOf(await answerFor(articleEvent('follicular'), table));
      const second = bodyOf(await answerFor(articleEvent('follicular'), table));

      expect(first.id).toBe('the-new-one');
      expect(second).toEqual(first);
    });

    it('carries a link where the catalogue wrote one', async () => {
      const table = await aCatalogue(
        anArticle('ovulation', 'the-fertile-days', { link: 'https://emi.example/ovulation' }),
      );

      const read = articleFrom(
        bodyOf(await answerFor(articleEvent('ovulation'), table)),
        'ovulation',
      );

      expect(read?.link).toBe('https://emi.example/ovulation');
    });

    it('answers no link where the catalogue wrote one a browser would refuse', async () => {
      const table = await aCatalogue(
        anArticle('ovulation', 'the-fertile-days', { link: 'javascript:alert(1)' }),
      );

      const read = articleFrom(
        bodyOf(await answerFor(articleEvent('ovulation'), table)),
        'ovulation',
      );

      expect(read?.link).toBeNull();
    });

    it('passes over an article the catalogue left half written', async () => {
      const table = await aCatalogue(
        anArticle('period', 'the-whole-one', { publishedAt: '2026-01-01T00:00:00.000Z' }),
        anArticle('period', 'the-half-one', {
          attribution: '   ',
          publishedAt: '2026-09-01T00:00:00.000Z',
        }),
      );

      const read = articleFrom(bodyOf(await answerFor(articleEvent('period'), table)), 'period');

      expect(read?.id).toBe('the-whole-one');
    });

    it('lets the answer be held, because every reader of a phase gets the same one', async () => {
      const table = await aCatalogue(anArticle('follicular', 'the-good-week'));

      const response = await answerFor(articleEvent('follicular'), table);

      expect(response.headers['cache-control']).toBe(`public, max-age=${cacheSeconds}`);
    });

    it('reads one partition with one query, and reads nothing else', async () => {
      const table = await aCatalogue(anArticle('period', 'cramps-and-what-helps'));

      await answerFor(articleEvent('period'), table);

      expect(table.calls()).toEqual({
        putItem: 1,
        getItem: 0,
        updateItem: 0,
        deleteItem: 0,
        query: 1,
      });
    });

    it('follows a catalogue the table hands back a page at a time', async () => {
      const table = fakeTable({ name: articleTableName, itemsPerPage: 1 });
      const published = ['2026-01-01', '2026-02-01', '2026-03-01'];

      for (const [at, slug] of ['one', 'two', 'three'].entries()) {
        await table.putItem({
          TableName: articleTableName,
          Item: anArticle('luteal', slug, { publishedAt: `${published[at]}T00:00:00.000Z` }),
        });
      }

      expect(bodyOf(await answerFor(articleEvent('luteal'), table)).id).toBe('three');
    });

    it('answers the path the application asks for', () => {
      expect(articlePath('luteal')).toBe(articleEvent('luteal').rawPath);
    });
  });

  describe('a phase nobody has written for yet', () => {
    it('answers no article, and says the phase has nothing rather than that it is wrong', async () => {
      const response = await answerFor(articleEvent('follicular'), await aCatalogue());

      expect(response.statusCode).toBe(404);
      expect(bodyOf(response).error).toBe('nothing is written about follicular yet');
    });

    it('is told apart from a phase this product does not have', async () => {
      const table = await aCatalogue();

      const empty = bodyOf(await answerFor(articleEvent('follicular'), table));
      const unknown = bodyOf(await answerFor(articleEvent('flowering'), table));

      expect(empty.error).not.toEqual(unknown.error);
    });

    it('leaves the screen with no article, which is what it draws nothing from', async () => {
      const response = await answerFor(articleEvent('follicular'), await aCatalogue());

      expect(response.statusCode).not.toBe(200);
      expect(articleFrom(bodyOf(response), 'follicular')).toBeNull();
    });
  });

  describe('a phase this product does not have', () => {
    it('refuses it and names the four that exist', async () => {
      const response = await answerFor(articleEvent('flowering'), await aCatalogue());

      expect(response.statusCode).toBe(404);
      for (const phase of phaseNames) {
        expect(bodyOf(response).error).toContain(phase);
      }
    });

    it.each(['Period', 'periods', 'period ', ''])(
      'refuses "%s", which is nearly a phase and is not one',
      async (given) => {
        const response = await answerFor(articleEvent(given), await aCatalogue());

        expect(response.statusCode).toBe(404);
      },
    );

    it('refuses a path that carries no phase at all', async () => {
      const event = articleEvent('period');
      const withoutOne: HttpRequestEvent = { ...event, pathParameters: undefined };

      expect((await answerFor(withoutOne, await aCatalogue())).statusCode).toBe(404);
    });

    it('reads no table at all for a phase it refuses', async () => {
      const table = await aCatalogue(anArticle('period', 'cramps-and-what-helps'));

      await answerFor(articleEvent('flowering'), table);

      expect(table.calls().query).toBe(0);
    });
  });

  describe('what a request to this endpoint may not carry', () => {
    it.each([accountHeader, instantHeader, signatureHeader, bodyHashHeader])(
      'refuses a request carrying %s, and says what this endpoint reads instead',
      async (header) => {
        const event = articleEvent('period', { [header]: 'anything at all' });

        const response = await answerFor(event, await aCatalogue());

        expect(response.statusCode).toBe(400);
        expect(bodyOf(response).error).toContain('by phase and never by reader');
        expect(bodyOf(response).error).toContain(header);
      },
    );

    it('refuses the whole signed set, so the next header added to it is refused too', () => {
      expect([...identityHeaders].sort()).toEqual([
        accountHeader,
        bodyHashHeader,
        instantHeader,
        signatureHeader,
      ]);
    });

    it('reads no table for a request it refuses, so a named reader reaches no query', async () => {
      const table = await aCatalogue(anArticle('period', 'cramps-and-what-helps'));

      await answerFor(articleEvent('period', { [accountHeader]: 'AAAA' }), table);

      expect(table.calls().query).toBe(0);
    });

    it('refuses a request an authorizer answered for, because this route has none', async () => {
      const event = articleEvent('period');
      const authorized: HttpRequestEvent = {
        ...event,
        requestContext: { ...event.requestContext, authorizer: { lambda: { accountId: 'AAAA' } } },
      };

      const response = await answerFor(authorized, await aCatalogue());

      expect(response.statusCode).toBe(400);
      expect(bodyOf(response).error).toContain('stands behind no authorizer');
    });

    it('carries an ordinary header through without a thought', async () => {
      const table = await aCatalogue(anArticle('period', 'cramps-and-what-helps'));
      const event = articleEvent('period', { 'accept-language': 'en-GB', 'user-agent': 'Emi' });

      expect((await answerFor(event, table)).statusCode).toBe(200);
    });
  });

  describe('with no authorizer in front of it', () => {
    it('answers a request that carries no account, no signature and no authorizer', async () => {
      const table = await aCatalogue(anArticle('period', 'cramps-and-what-helps'));
      const event = articleEvent('period');

      expect(event.headers).toEqual({});
      expect(event.requestContext.authorizer).toBeUndefined();

      const response = await answerFor(event, table);

      expect(response.statusCode).toBe(200);
      expect(articleFrom(bodyOf(response), 'period')).not.toBeNull();
    });

    it('never reaches the vault table, which holds another table name entirely', async () => {
      const vault = fakeTable();
      const catalogue = await aCatalogue(anArticle('period', 'cramps-and-what-helps'));

      await articlesFor(articleEvent('period'), dynamoArticleStore(catalogue, articleTableName));

      expect(vault.calls()).toEqual({
        putItem: 0,
        getItem: 0,
        updateItem: 0,
        deleteItem: 0,
        query: 0,
      });
      expect(articleTableName).not.toBe(tableName);
    });

    it('is refused by the vault table if it ever asked it for a phase', async () => {
      const store = dynamoArticleStore(fakeTable(), articleTableName);

      await expect(store.readArticlesFor('period')).rejects.toThrow(
        `there is no table called ${articleTableName}`,
      );
    });
  });
});
