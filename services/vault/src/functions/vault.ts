import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SSMClient } from '@aws-sdk/client-ssm';

import { appStoreApiKeyOnce } from '../payments/appStoreSecrets';
import { dynamoEntitlementStore } from '../payments/dynamoEntitlements';
import { reachesStripe } from '../payments/reachesStripe';
import { reachesTheAppStore } from '../payments/reachesTheAppStore';
import { stopsEveryRenewal } from '../payments/stopRenewals';
import { stripeSecretKeyOnce } from '../payments/stripeSecrets';
import { router } from '../router';
import { dynamoStore } from '../store/dynamo';
import { dynamoTable } from '../store/dynamoTable';
import { parameterStore } from '../telegram/parameterStore';

/**
 * The entry point of the vault function, which answers the five signed routes through the router.
 *
 * Two parameters are read, each by one route. A delete that finds a card payment still renewing
 * reads the Stripe key, and a filing of a store purchase reads the App Store credential. Every
 * other request of this function reads no parameter at all. The environment carries the table and
 * no secret of any kind.
 *
 * Nothing is decided here, so there is nothing in this file to test. What it reads from the
 * environment is held to one rule by `tests/blind.test.ts`: a table name, and never anything else.
 */
const table = dynamoTable(new DynamoDBClient({}));
const tableName = process.env.EMI_VAULT_TABLE ?? '';
const parameters = parameterStore(new SSMClient({}));

export const handler = router(
  dynamoStore(table, tableName),
  stopsEveryRenewal({
    entitlements: dynamoEntitlementStore(table, tableName),
    reaches: reachesStripe(),
    secretKey: stripeSecretKeyOnce(parameters),
    clock: () => new Date(),
  }),
  { reaches: reachesTheAppStore(), apiKey: appStoreApiKeyOnce(parameters) },
);
