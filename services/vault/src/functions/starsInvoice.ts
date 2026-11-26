import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SSMClient } from '@aws-sdk/client-ssm';

import { dynamoEntitlementStore } from '../payments/dynamoEntitlements';
import { starsInvoice } from '../payments/starsInvoice';
import { botTokenOnce } from '../payments/starsSecrets';
import { dynamoTable } from '../store/dynamoTable';
import { parameterStore } from '../telegram/parameterStore';
import { reachesTelegram } from '../telegram/reachesTelegram';

/**
 * The entry point of the press on Buy with Stars. It reads one partition prefix of the table, one
 * parameter and the bot api, and it reads no account partition at all.
 *
 * The token is read from the parameter store when the first request of a container arrives. The
 * environment carries the table and the pool and no secret of any kind.
 *
 * Nothing is decided here, so there is nothing in this file to test.
 */
export const handler = starsInvoice({
  entitlements: dynamoEntitlementStore(
    dynamoTable(new DynamoDBClient({})),
    process.env.EMI_VAULT_TABLE ?? '',
  ),
  reaches: reachesTelegram(),
  botToken: botTokenOnce(parameterStore(new SSMClient({}))),
  poolId: process.env.EMI_ACCOUNTS_POOL_ID ?? '',
  clock: () => new Date(),
});
