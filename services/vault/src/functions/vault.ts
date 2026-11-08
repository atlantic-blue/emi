import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { router } from '../router';
import { dynamoStore } from '../store/dynamo';
import { dynamoTable } from '../store/dynamoTable';

/**
 * The entry point of the vault function, which answers the four signed routes through the router.
 *
 * Nothing is decided here, so there is nothing in this file to test. What it reads from the
 * environment is held to one rule by `tests/blind.test.ts`: a table name, and never anything else.
 */
export const handler = router(
  dynamoStore(dynamoTable(new DynamoDBClient({})), process.env.EMI_VAULT_TABLE ?? ''),
);
