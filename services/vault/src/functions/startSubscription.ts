import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SSMClient } from '@aws-sdk/client-ssm';

import { dynamoEntitlementStore } from '../payments/dynamoEntitlements';
import { reachesStripe } from '../payments/reachesStripe';
import { subscriptionRoutes } from '../payments/subscriptionRoutes';
import { stripeSecretKeyOnce } from '../payments/stripeSecrets';
import { dynamoTable } from '../store/dynamoTable';
import { parameterStore } from '../telegram/parameterStore';

/**
 * The entry point of the four routes of one subscription: the press that starts one, the read her
 * account page makes, and the two calls of a card change. It reaches one partition prefix of the
 * table, one parameter and Stripe, and it reads no account partition at all.
 *
 * The key is read from the parameter store when the first request of a container arrives. The
 * environment carries the table and the pool and no secret of any kind.
 *
 * Nothing is decided here, so there is nothing in this file to test.
 */
export const handler = subscriptionRoutes({
  entitlements: dynamoEntitlementStore(
    dynamoTable(new DynamoDBClient({})),
    process.env.EMI_VAULT_TABLE ?? '',
  ),
  reaches: reachesStripe(),
  secretKey: stripeSecretKeyOnce(parameterStore(new SSMClient({}))),
  poolId: process.env.EMI_ACCOUNTS_POOL_ID ?? '',
  clock: () => new Date(),
});
