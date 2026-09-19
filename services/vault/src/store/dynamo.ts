import type {
  AccountDeletion,
  AccountDeleteStore,
  AccountStore,
  CreateOutcome,
  RememberOutcome,
  StoredAccount,
} from './accounts';
import {
  pageCostOf,
  type RecordPage,
  type RecordStore,
  type StoredRecord,
  type WriteOutcome,
} from './records';

/**
 * The storage, as DynamoDB holds it. One table, one partition for each account, and the mapping
 * from what the service means to what the table keeps written down in one place.
 *
 * The table is reached through the port below rather than through a client, so the item this file
 * writes is the item a test reads. That is what lets contract TABLE-4 be proved against the
 * attributes themselves rather than against a promise about them.
 */

/** The four value shapes this table uses. A record is bytes, a number and two strings. */
export type AttributeValue =
  | { readonly S: string }
  | { readonly N: string }
  | { readonly B: Uint8Array }
  | { readonly BOOL: boolean };

/** An item as the table holds it: attribute names against attribute values. */
export type Item = Readonly<Record<string, AttributeValue>>;

/** Names and values an expression refers to, as DynamoDB takes them. */
export interface ExpressionParts {
  readonly ExpressionAttributeNames?: Readonly<Record<string, string>>;
  readonly ExpressionAttributeValues?: Readonly<Record<string, AttributeValue>>;
}

/** A write of one whole item, refused when the condition does not hold. */
export interface PutItemInput extends ExpressionParts {
  readonly TableName: string;
  readonly Item: Item;
  readonly ConditionExpression?: string;
}

/** A read of one item by its whole key. */
export interface GetItemInput {
  readonly TableName: string;
  readonly Key: Item;
  readonly ConsistentRead?: boolean;
}

/** A change to part of one item, refused when the condition does not hold. */
export interface UpdateItemInput extends ExpressionParts {
  readonly TableName: string;
  readonly Key: Item;
  readonly UpdateExpression: string;
  readonly ConditionExpression?: string;
}

/** A removal of one item by its whole key. */
export interface DeleteItemInput extends ExpressionParts {
  readonly TableName: string;
  readonly Key: Item;
  readonly ConditionExpression?: string;
}

/** A read along a key, inside one partition. */
export interface QueryInput extends ExpressionParts {
  readonly TableName: string;
  readonly IndexName?: string;
  readonly KeyConditionExpression: string;
  readonly ExclusiveStartKey?: Item;
  /** The attributes to read, as a comma separated list. Everything, when it is absent. */
  readonly ProjectionExpression?: string;
}

/** What a query answers: the items it read, and where to start again when it stopped early. */
export interface QueryOutput {
  readonly Items: readonly Item[];
  readonly LastEvaluatedKey?: Item;
}

/**
 * The five operations the vault uses. Every one of them is the shape DynamoDB takes, so the client
 * that binds this to the real table adds no behaviour of its own and can hide no difference.
 */
export interface DynamoDbTable {
  putItem(input: PutItemInput): Promise<void>;
  getItem(input: GetItemInput): Promise<Item | undefined>;
  updateItem(input: UpdateItemInput): Promise<void>;
  deleteItem(input: DeleteItemInput): Promise<void>;
  query(input: QueryInput): Promise<QueryOutput>;
}

/** What DynamoDB calls the error it raises when a condition does not hold. */
export const conditionalCheckFailure = 'ConditionalCheckFailedException';

/** True when a write was refused by its condition, which is an answer here rather than a fault. */
export function isConditionalCheckFailure(thrown: unknown): boolean {
  return thrown instanceof Error && thrown.name === conditionalCheckFailure;
}

/** The partition one account's items sit in, and nothing of hers sits anywhere else. */
export function partitionFor(accountId: string): string {
  return `ACC#${accountId}`;
}

/** The sort key of the account item. One account holds exactly one of these. */
export const accountSortKey = 'META';

/** The sort key of a record item, which carries the identifier the phone chose. */
export function recordSortKeyFor(recordId: string): string {
  return `REC#${recordId}`;
}

/** The sort key a signature is remembered under, so a replay meets an item that already exists. */
export function signatureSortKeyFor(signature: string): string {
  return `SIG#${signature}`;
}

/** The index a pull reads: one account's records, in the order they were written. */
export const byUpdatedIndex = 'byUpdated';

/**
 * How many items one round of a delete removes at a time. It is DynamoDB's own batch size, which
 * is the number the table is built to take in one breath.
 */
export const deleteGroupSize = 25;

const textOf = (value: AttributeValue | undefined): string =>
  value !== undefined && 'S' in value ? value.S : '';

const numberOf = (value: AttributeValue | undefined): number =>
  value !== undefined && 'N' in value ? Number(value.N) : 0;

const bytesOf = (value: AttributeValue | undefined): Uint8Array =>
  value !== undefined && 'B' in value ? value.B : new Uint8Array(0);

function accountFrom(item: Item): StoredAccount {
  return {
    accountId: textOf(item.pk).slice('ACC#'.length),
    publicKey: bytesOf(item.publicKey),
    wrappedVaultKey: bytesOf(item.wrappedVaultKey),
    recoverySalt: bytesOf(item.recoverySalt),
    createdAt: textOf(item.createdAt),
    recordCount: numberOf(item.recordCount),
  };
}

function recordFrom(item: Item): StoredRecord {
  return {
    recordId: textOf(item.sk).slice('REC#'.length),
    revision: numberOf(item.revision),
    payload: bytesOf(item.payload),
    updatedAt: textOf(item.updatedAt),
  };
}

async function refusedByItsCondition(write: Promise<void>): Promise<boolean> {
  try {
    await write;
  } catch (thrown) {
    if (isConditionalCheckFailure(thrown)) {
      return true;
    }

    throw thrown;
  }

  return false;
}

/**
 * The storage the handlers are given, bound to one table. Nothing here reads an account other than
 * the one it was asked for, and nothing here holds a key: the payload goes in and comes out as the
 * bytes the phone sealed.
 */
export function dynamoStore(
  table: DynamoDbTable,
  tableName: string,
): AccountStore & RecordStore & AccountDeleteStore {
  const keyOf = (accountId: string, sortKey: string): Item => ({
    pk: { S: partitionFor(accountId) },
    sk: { S: sortKey },
  });

  async function countOneMoreRecord(accountId: string): Promise<void> {
    // The authorizer answered before this handler ran, so the account exists. The condition is
    // here because a count that drifts is a count, and a stub account item would be an account.
    await refusedByItsCondition(
      table.updateItem({
        TableName: tableName,
        Key: keyOf(accountId, accountSortKey),
        UpdateExpression: 'ADD recordCount :one',
        ConditionExpression: 'attribute_exists(pk)',
        ExpressionAttributeValues: { ':one': { N: '1' } },
      }),
    );
  }

  /**
   * Every key under one account, read a page at a time. The read carries the two key attributes and
   * nothing else: a delete has no use for a payload, and reading back six years of ciphertext it
   * never looks at would be the one thing that made this slow.
   */
  async function everyKeyUnder(accountId: string, onlyTheFirstPage = false): Promise<Item[]> {
    const found: Item[] = [];
    let startAt: Item | undefined = undefined;

    do {
      const answered: QueryOutput = await table.query({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': { S: partitionFor(accountId) } },
        ProjectionExpression: 'pk, sk',
        ExclusiveStartKey: startAt,
      });

      found.push(...answered.Items);
      startAt = onlyTheFirstPage ? undefined : answered.LastEvaluatedKey;
    } while (startAt !== undefined);

    return found;
  }

  async function deleteEvery(items: readonly Item[]): Promise<void> {
    // Grouped rather than one at a time, because a delete that runs out of time part way through
    // is a delete that leaves items, and six years of days is a few thousand of them. The group
    // is small enough that a burst of them does not have the table refusing any.
    for (let from = 0; from < items.length; from += deleteGroupSize) {
      await Promise.all(
        items.slice(from, from + deleteGroupSize).map(async (item) =>
          table.deleteItem({
            TableName: tableName,
            Key: keyOf(textOf(item.pk).slice('ACC#'.length), textOf(item.sk)),
          }),
        ),
      );
    }
  }

  /**
   * Reads the partition back and raises unless what is left is what was meant to be left. The
   * store says a delete finished only after reading the table, because the caller of a store that
   * reported success from its own calls would have nothing to check that report against.
   */
  async function nothingIsLeftUnder(accountId: string, allowed?: string): Promise<void> {
    const left = (await everyKeyUnder(accountId, true)).filter(
      (item) => textOf(item.sk) !== allowed,
    );

    if (left.length > 0) {
      throw new Error(
        `the table still holds ${left.length} item(s) under this account, starting at ${textOf(
          left[0]?.sk,
        )}`,
      );
    }
  }

  return {
    readAccount: async (accountId: string): Promise<StoredAccount | undefined> => {
      const item = await table.getItem({
        TableName: tableName,
        Key: keyOf(accountId, accountSortKey),
        ConsistentRead: true,
      });

      return item === undefined ? undefined : accountFrom(item);
    },

    createAccount: async (account: StoredAccount): Promise<CreateOutcome> => {
      const refused = await refusedByItsCondition(
        table.putItem({
          TableName: tableName,
          Item: {
            ...keyOf(account.accountId, accountSortKey),
            publicKey: { B: account.publicKey },
            wrappedVaultKey: { B: account.wrappedVaultKey },
            recoverySalt: { B: account.recoverySalt },
            createdAt: { S: account.createdAt },
            recordCount: { N: String(account.recordCount) },
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      );

      return refused ? 'already-registered' : 'created';
    },

    rememberSignature: async (
      accountId: string,
      signature: string,
      expiresAt: number,
    ): Promise<RememberOutcome> => {
      const refused = await refusedByItsCondition(
        table.putItem({
          TableName: tableName,
          Item: {
            ...keyOf(accountId, signatureSortKeyFor(signature)),
            ttl: { N: String(expiresAt) },
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      );

      return refused ? 'seen-before' : 'remembered';
    },

    deleteEverything: async (accountId: string): Promise<AccountDeletion> => {
      // Every key first, then the removals, then a read that proves it. Nothing here loops until
      // the partition looks empty: a table that would not let go of an item would have that loop
      // reading for ever, and a function that spins until it is killed says nothing about why.
      const held = await everyKeyUnder(accountId);
      const account = held.filter((item) => textOf(item.sk) === accountSortKey);

      await deleteEvery(held.filter((item) => textOf(item.sk) !== accountSortKey));
      await nothingIsLeftUnder(accountId, accountSortKey);

      // The account item goes last, because it is the item the authorizer reads to know she owns
      // this partition. A delete that stopped half way has left her the one thing she needs to ask
      // again; a delete that took it first would leave her records with nobody able to reach them.
      await deleteEvery(account);
      await nothingIsLeftUnder(accountId);

      return { itemsRemoved: held.length };
    },

    writeRecord: async (accountId: string, record: StoredRecord): Promise<WriteOutcome> => {
      const item: Item = {
        ...keyOf(accountId, recordSortKeyFor(record.recordId)),
        payload: { B: record.payload },
        revision: { N: String(record.revision) },
        updatedAt: { S: record.updatedAt },
      };

      // The first write of a record and a later one are told apart by trying the first shape
      // first, so the count rises once for each record and never on an edit.
      const alreadyThere = await refusedByItsCondition(
        table.putItem({
          TableName: tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      );

      if (!alreadyThere) {
        await countOneMoreRecord(accountId);

        return { outcome: 'written', revision: record.revision, created: true };
      }

      const notHigher = await refusedByItsCondition(
        table.putItem({
          TableName: tableName,
          Item: item,
          ConditionExpression: 'revision < :revision',
          ExpressionAttributeValues: { ':revision': { N: String(record.revision) } },
        }),
      );

      if (!notHigher) {
        return { outcome: 'written', revision: record.revision, created: false };
      }

      const held = await table.getItem({
        TableName: tableName,
        Key: keyOf(accountId, recordSortKeyFor(record.recordId)),
        ConsistentRead: true,
      });

      return { outcome: 'revision-is-not-higher', revision: numberOf(held?.revision) };
    },

    readRecordsAfter: async (
      accountId: string,
      after: string | null,
      atMostBytes: number,
    ): Promise<RecordPage> => {
      const values: Record<string, AttributeValue> = { ':pk': { S: partitionFor(accountId) } };

      if (after !== null) {
        values[':after'] = { S: after };
      }

      const records: StoredRecord[] = [];
      let spent = 0;
      let startAt: Item | undefined = undefined;

      do {
        const answered: QueryOutput = await table.query({
          TableName: tableName,
          IndexName: byUpdatedIndex,
          KeyConditionExpression: after === null ? 'pk = :pk' : 'pk = :pk AND updatedAt > :after',
          ExpressionAttributeValues: values,
          ExclusiveStartKey: startAt,
        });

        for (const item of answered.Items) {
          const record = recordFrom(item);
          const wouldSpend = spent + pageCostOf(record);
          const lastRead = records[records.length - 1];

          // A page always carries at least one record, and it never cuts between two records
          // written in the same instant, because the cursor it answers with is that instant.
          if (
            wouldSpend > atMostBytes &&
            lastRead !== undefined &&
            lastRead.updatedAt !== record.updatedAt
          ) {
            return { records, reached: lastRead.updatedAt, moreToCome: true };
          }

          records.push(record);
          spent = wouldSpend;
        }

        startAt = answered.LastEvaluatedKey;
      } while (startAt !== undefined);

      const lastRead = records[records.length - 1];

      return { records, reached: lastRead?.updatedAt ?? null, moreToCome: false };
    },
  };
}
