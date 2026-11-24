import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { appleRoots } from '../payments/appleRoot';
import { storeNotifications } from '../payments/storeNotifications';
import { dynamoStore } from '../store/dynamo';
import { dynamoTable } from '../store/dynamoTable';

/**
 * The entry point of the notifications of the App Store. It reads the pointer item of one purchase
 * and writes the date on one account item, and it reaches nothing else at all.
 *
 * It reads no secret and no parameter. Apple signs each notification and the root that verifies the
 * signature is in the bundle, so this is the one route of the money that needs no credential of
 * ours to believe what it is told. The environment carries the table and nothing else.
 *
 * Nothing is decided here, so there is nothing in this file to test.
 */
const table = dynamoTable(new DynamoDBClient({}));

export const handler = storeNotifications({
  store: dynamoStore(table, process.env.EMI_VAULT_TABLE ?? ''),
  roots: appleRoots,
  clock: () => new Date(),
});
