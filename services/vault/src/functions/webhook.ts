import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SSMClient } from '@aws-sdk/client-ssm';

import { dynamoEntitlementStore } from '../payments/dynamoEntitlements';
import { reachesStripe } from '../payments/reachesStripe';
import { stripeSecretKeyOnce, stripeWebhookSecretOnce } from '../payments/stripeSecrets';
import { webhook } from '../payments/webhook';
import { dynamoTable } from '../store/dynamoTable';
import { parameterStore } from '../telegram/parameterStore';

/**
 * The entry point of the webhook. It reaches one partition prefix of the table, two parameters and
 * Stripe, and it reads no account partition at all.
 *
 * Both secrets are read from the parameter store when the first delivery of a container arrives.
 * The environment carries the table and no secret of any kind.
 *
 * Nothing is decided here, so there is nothing in this file to test.
 */
const parameters = parameterStore(new SSMClient({}));

export const handler = webhook({
  entitlements: dynamoEntitlementStore(
    dynamoTable(new DynamoDBClient({})),
    process.env.EMI_VAULT_TABLE ?? '',
  ),
  reaches: reachesStripe(),
  signingSecret: stripeWebhookSecretOnce(parameters),
  secretKey: stripeSecretKeyOnce(parameters),
  clock: () => new Date(),
});
