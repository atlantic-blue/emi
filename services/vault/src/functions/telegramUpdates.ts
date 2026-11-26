import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SSMClient } from '@aws-sdk/client-ssm';

import { dynamoEntitlementStore } from '../payments/dynamoEntitlements';
import { botTokenOnce, telegramWebhookSecretOnce } from '../payments/starsSecrets';
import { telegramUpdates } from '../payments/telegramUpdates';
import { dynamoTable } from '../store/dynamoTable';
import { parameterStore } from '../telegram/parameterStore';
import { reachesTelegram } from '../telegram/reachesTelegram';

/**
 * The entry point of an update of the Emi bot. It reads one partition prefix of the table, two
 * parameters and the bot api, and it reads no account partition at all.
 *
 * Both values are read from the parameter store when the first update of a container arrives. The
 * environment carries the table and no secret of any kind.
 *
 * Nothing is decided here, so there is nothing in this file to test.
 */
const parameters = parameterStore(new SSMClient({}));

export const handler = telegramUpdates({
  entitlements: dynamoEntitlementStore(
    dynamoTable(new DynamoDBClient({})),
    process.env.EMI_VAULT_TABLE ?? '',
  ),
  reaches: reachesTelegram(),
  botToken: botTokenOnce(parameters),
  webhookSecret: telegramWebhookSecretOnce(parameters),
  clock: () => new Date(),
});
