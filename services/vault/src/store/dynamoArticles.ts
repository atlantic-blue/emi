import type { ArticleStore, StoredArticle } from './articles';
import type { AttributeValue, DynamoDbTable, Item, QueryOutput } from './dynamo';

/**
 * The catalogue, as DynamoDB holds it. It is a second table, and the difference that matters is
 * the role rather than the shape: the function that reads this one stands behind no authorizer, so
 * it is given one table, one action and no write at all.
 */

/** The partition one phase's articles sit in. There are four of these and never a fifth. */
export function articlePartitionFor(phase: string): string {
  return `PHASE#${phase}`;
}

/** The sort key of an article, which carries the slug the catalogue chose. */
export function articleSortKeyFor(slug: string): string {
  return `ART#${slug}`;
}

const textOf = (value: AttributeValue | undefined): string =>
  value !== undefined && 'S' in value ? value.S : '';

const numberOf = (value: AttributeValue | undefined): number =>
  value !== undefined && 'N' in value ? Number(value.N) : 0;

function articleFrom(item: Item): StoredArticle {
  const attribution = item.attribution;

  return {
    slug: textOf(item.sk).slice('ART#'.length),
    title: textOf(item.title),
    body: textOf(item.body),
    language: textOf(item.language),
    publishedAt: textOf(item.publishedAt),
    revision: numberOf(item.revision),
    attribution: attribution === undefined ? null : textOf(attribution),
  };
}

/**
 * The catalogue the handler is given, bound to one table. One query reads one partition, which is
 * every article of one phase, and a page that stops early is followed rather than truncated.
 */
export function dynamoArticleStore(table: DynamoDbTable, tableName: string): ArticleStore {
  return {
    readArticlesFor: async (phase: string): Promise<readonly StoredArticle[]> => {
      const found: Item[] = [];
      let startAt: Item | undefined = undefined;

      do {
        const answered: QueryOutput = await table.query({
          TableName: tableName,
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: { ':pk': { S: articlePartitionFor(phase) } },
          ExclusiveStartKey: startAt,
        });

        found.push(...answered.Items);
        startAt = answered.LastEvaluatedKey;
      } while (startAt !== undefined);

      return found.map(articleFrom);
    },
  };
}
