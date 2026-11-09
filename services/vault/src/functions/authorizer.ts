import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { authorizer } from '../auth/authorizer';
import { dynamoStore } from '../store/dynamo';
import { dynamoTable } from '../store/dynamoTable';

/**
 * The entry point of the authorizer function. It reads the table name, builds the client, and binds
 * the authorizer the service already exports.
 *
 * Nothing is decided here, so there is nothing in this file to test. What it reads from the
 * environment is held to one rule by `tests/blind.test.ts`: a table name, and never anything else.
 */
export const handler = authorizer(
  dynamoStore(dynamoTable(new DynamoDBClient({})), process.env.EMI_VAULT_TABLE ?? ''),
);
