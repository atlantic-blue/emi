import type { AttributeValue, DynamoDbTable, Item } from '../store/dynamo';
import { refusedByItsCondition } from '../store/dynamo';
import {
  checkedEntitlementWrite,
  checkedPayerDigest,
  entitlementSortKey,
  paymentPartitionFor,
  paymentPartitionPrefix,
  type EntitlementOutcome,
  type EntitlementRoute,
  type EntitlementState,
  type EntitlementStore,
  type EntitlementWrite,
  type StoredEntitlement,
} from './entitlements';

/**
 * The payment record, as DynamoDB holds it.
 *
 * Every write is one conditional update rather than a whole item, for two reasons. An event says
 * what it knows and nothing else, so a field it leaves out has to survive it. And the condition
 * carries the order: Stripe promises none, so an event older than the one already written is
 * refused by the table rather than by a read this code made first.
 */

const textOf = (value: AttributeValue | undefined): string =>
  value !== undefined && 'S' in value ? value.S : '';

const numberOf = (value: AttributeValue | undefined): number =>
  value !== undefined && 'N' in value ? Number(value.N) : 0;

/** Every field of an event the item holds as text, with the ones it said nothing about left out. */
const textFieldsOf = (write: EntitlementWrite): [string, string][] =>
  (
    [
      ['paidUntil', write.paidUntil],
      ['route', write.route],
      ['state', write.state],
      ['payerRef', write.payerRef],
      ['subscriptionRef', write.subscriptionRef],
      ['chargeRef', write.chargeRef],
    ] as const
  ).flatMap(([name, value]) => (value === undefined ? [] : [[name, value] as [string, string]]));

function entitlementFrom(item: Item): StoredEntitlement {
  const held = {
    payerDigest: textOf(item.pk).slice(paymentPartitionPrefix.length),
    eventAt: numberOf(item.eventAt),
    firstSeenAt: textOf(item.firstSeenAt),
    updatedAt: textOf(item.updatedAt),
  };

  // Each one is left out rather than read as an empty string, because absent is what the account
  // page reads as "she has not paid yet" and "" would read as a route and a date she never had.
  return {
    ...held,
    ...('paidUntil' in item ? { paidUntil: textOf(item.paidUntil) } : {}),
    ...('route' in item ? { route: textOf(item.route) as EntitlementRoute } : {}),
    ...('state' in item ? { state: textOf(item.state) as EntitlementState } : {}),
    ...('payerRef' in item ? { payerRef: textOf(item.payerRef) } : {}),
    ...('subscriptionRef' in item ? { subscriptionRef: textOf(item.subscriptionRef) } : {}),
    ...('chargeRef' in item ? { chargeRef: textOf(item.chargeRef) } : {}),
  };
}

/**
 * The payment store the money is given, bound to one table. It reads and writes one item by its
 * whole key, so it needs no query at all and the role behind it reaches one partition prefix.
 */
export function dynamoEntitlementStore(table: DynamoDbTable, tableName: string): EntitlementStore {
  const keyOf = (payerDigest: string): Item => ({
    pk: { S: paymentPartitionFor(payerDigest) },
    sk: { S: entitlementSortKey },
  });

  return {
    readEntitlement: async (payerDigest: string): Promise<StoredEntitlement | undefined> => {
      const item = await table.getItem({
        TableName: tableName,
        Key: keyOf(checkedPayerDigest(payerDigest)),
        ConsistentRead: true,
      });

      return item === undefined ? undefined : entitlementFrom(item);
    },

    writeEntitlement: async (write: EntitlementWrite): Promise<EntitlementOutcome> => {
      checkedEntitlementWrite(write);

      // Every field travels as a name rather than plainly, because state is a reserved word of
      // the expression language and an update that writes it plainly is refused.
      const names: Record<string, string> = {
        '#eventAt': 'eventAt',
        '#firstSeenAt': 'firstSeenAt',
        '#updatedAt': 'updatedAt',
      };
      const values: Record<string, AttributeValue> = {
        ':eventAt': { N: String(write.eventAt) },
        ':writtenAt': { S: write.writtenAt },
      };
      const clauses = [
        '#eventAt = :eventAt',
        '#updatedAt = :writtenAt',
        '#firstSeenAt = if_not_exists(#firstSeenAt, :writtenAt)',
      ];

      for (const [field, value] of textFieldsOf(write)) {
        names[`#${field}`] = field;
        values[`:${field}`] = { S: value };
        clauses.push(`#${field} = :${field}`);
      }

      const refused = await refusedByItsCondition(
        table.updateItem({
          TableName: tableName,
          Key: keyOf(write.payerDigest),
          UpdateExpression: `SET ${clauses.join(', ')}`,
          // An item with no event yet is the first write. Anything else moves only forward, so an
          // event that arrives twice is refused the second time as well.
          ConditionExpression: 'attribute_not_exists(#eventAt) OR #eventAt < :eventAt',
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        }),
      );

      return refused ? 'older-event' : 'written';
    },
  };
}
