import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SSMClient } from '@aws-sdk/client-ssm';
import { systemRandom } from '@emi/crypto';

import { signInTelegram } from '../handlers/signInWithTelegram';
import { dynamoStore } from '../store/dynamo';
import { dynamoTable } from '../store/dynamoTable';
import { cognitoPool } from '../telegram/cognitoPool';
import { parameterStore } from '../telegram/parameterStore';
import { reachesTelegram } from '../telegram/reachesTelegram';

/**
 * The entry point of the sign in with Telegram, which is the one function here that reads a secret
 * and the one that reaches a network outside the account.
 *
 * It reads the table it writes one answer to and the pool it creates her user in. The three
 * parameters it reads are named by `src/telegram/parameters.ts`, and the role in
 * `infra/lambda.tf` names those same three one by one, so neither end holds a prefix.
 *
 * Nothing is decided here, so there is nothing in this file to test.
 */
export const handler = signInTelegram({
  parameters: parameterStore(new SSMClient({})),
  reaches: reachesTelegram(),
  pool: cognitoPool(new CognitoIdentityProviderClient({}), process.env.EMI_ACCOUNTS_POOL_ID ?? ''),
  answers: dynamoStore(dynamoTable(new DynamoDBClient({})), process.env.EMI_VAULT_TABLE ?? ''),
  random: systemRandom,
});
