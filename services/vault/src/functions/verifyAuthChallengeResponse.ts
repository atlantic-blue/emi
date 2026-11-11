import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { dynamoStore } from '../store/dynamo';
import { dynamoTable } from '../store/dynamoTable';
import { verifyAuthChallenge } from '../triggers/verifyAuthChallengeResponse';

/**
 * The entry point of the verify trigger, which is the one trigger that reaches the table. It
 * spends the one time answer with a conditional delete and reads the two fields that delete
 * returns, so it holds no read of the table and no parameter at all.
 *
 * Nothing is decided here, so there is nothing in this file to test.
 */
export const handler = verifyAuthChallenge(
  dynamoStore(dynamoTable(new DynamoDBClient({})), process.env.EMI_VAULT_TABLE ?? ''),
);
