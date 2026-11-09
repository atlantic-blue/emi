import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { readArticles } from '../handlers/readArticles';
import { dynamoArticleStore } from '../store/dynamoArticles';
import { dynamoTable } from '../store/dynamoTable';

/**
 * The entry point of the article function, which answers the catalogue and reads no account.
 *
 * It names the article table and never the vault table, and the bundle it is built into carries no
 * module that reads a record. Nothing is decided here, so there is nothing in this file to test.
 */
export const handler = readArticles(
  dynamoArticleStore(dynamoTable(new DynamoDBClient({})), process.env.EMI_ARTICLES_TABLE ?? ''),
);
