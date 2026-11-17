import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SSMClient } from '@aws-sdk/client-ssm';

import { dynamoEntitlementStore } from '../payments/dynamoEntitlements';
import { reachesStripe } from '../payments/reachesStripe';
import { startSubscription } from '../payments/startSubscription';
import { stripeSecretKeyOnce } from '../payments/stripeSecrets';
import { dynamoTable } from '../store/dynamoTable';
import { parameterStore } from '../telegram/parameterStore';

/**
 * The entry point of the payments route. It reaches one partition prefix of the table, one
 * parameter and Stripe, and it reads no account partition at all.
 *
 * The key is read from the parameter store when the first request of a container arrives. The
 * environment carries the table and the pool and no secret of any kind.
 *
 * Nothing is decided here, so there is nothing in this file to test.
 */
export const handler = startSubscription({
  entitlements: dynamoEntitlementStore(
    dynamoTable(new DynamoDBClient({})),
    process.env.EMI_VAULT_TABLE ?? '',
  ),
  reaches: reachesStripe(),
  secretKey: stripeSecretKeyOnce(parameterStore(new SSMClient({}))),
  poolId: process.env.EMI_ACCOUNTS_POOL_ID ?? '',
  clock: () => new Date(),
});
