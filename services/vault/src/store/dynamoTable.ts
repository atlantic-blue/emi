import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

import type {
  AttributeValue,
  DeleteItemInput,
  DynamoDbTable,
  GetItemInput,
  Item,
  PutItemInput,
  QueryInput,
  QueryOutput,
  UpdateItemInput,
} from './dynamo';

/**
 * The five operations of the port, against the real table.
 *
 * It is a pass through. The port takes the request shapes DynamoDB takes, so nothing here decides
 * anything: an input goes to the command of the same name, and the error a refused condition
 * raises travels out untouched, which is what lets the store tell a refusal from a fault.
 *
 * The one thing it does is read the answer back into the four value shapes this table holds. An
 * attribute of a fifth shape raises here rather than arriving at a reader as an empty string, so a
 * record nobody can read is a failure and never a blank day.
 */

/** What one call answers with, across the five operations. */
export interface DynamoDbAnswer {
  readonly Item?: Readonly<Record<string, unknown>>;
  readonly Attributes?: Readonly<Record<string, unknown>>;
  readonly Items?: readonly Readonly<Record<string, unknown>>[];
  readonly LastEvaluatedKey?: Readonly<Record<string, unknown>>;
}

/**
 * The one call this adapter makes on the client, written here rather than taken from the client
 * type. A test then hands this adapter something that answers with no account behind it, and the
 * real client satisfies the same shape.
 */
export interface SendsToDynamoDb {
  send(
    command: DeleteItemCommand | GetItemCommand | PutItemCommand | QueryCommand | UpdateItemCommand,
  ): Promise<DynamoDbAnswer>;
}

/** What the table answered for one attribute, as one of the four shapes the vault writes. */
export function attributeFrom(name: string, read: unknown): AttributeValue {
  if (typeof read === 'object' && read !== null) {
    if ('S' in read && typeof read.S === 'string') {
      return { S: read.S };
    }

    if ('N' in read && typeof read.N === 'string') {
      return { N: read.N };
    }

    if ('B' in read && read.B instanceof Uint8Array) {
      return { B: read.B };
    }

    if ('BOOL' in read && typeof read.BOOL === 'boolean') {
      return { BOOL: read.BOOL };
    }
  }

  throw new Error(`the table answered with an attribute ${name} of a shape the vault never writes`);
}

/** One item the table answered with, every attribute of it read into a shape of the port. */
export function itemFrom(read: Readonly<Record<string, unknown>>): Item {
  return Object.fromEntries(
    Object.entries(read).map(([name, value]) => [name, attributeFrom(name, value)]),
  );
}

/** The port, bound to one client. The table each call names travels in the input. */
export function dynamoTable(client: SendsToDynamoDb): DynamoDbTable {
  return {
    putItem: async (input: PutItemInput): Promise<void> => {
      await client.send(new PutItemCommand(input));
    },

    getItem: async (input: GetItemInput): Promise<Item | undefined> => {
      const answered = await client.send(new GetItemCommand(input));

      return answered.Item === undefined ? undefined : itemFrom(answered.Item);
    },

    updateItem: async (input: UpdateItemInput): Promise<void> => {
      await client.send(new UpdateItemCommand(input));
    },

    deleteItem: async (input: DeleteItemInput): Promise<Item | undefined> => {
      const answered = await client.send(new DeleteItemCommand(input));

      return answered.Attributes === undefined ? undefined : itemFrom(answered.Attributes);
    },

    query: async (input: QueryInput): Promise<QueryOutput> => {
      const answered = await client.send(new QueryCommand(input));
      const items = (answered.Items ?? []).map(itemFrom);

      return answered.LastEvaluatedKey === undefined
        ? { Items: items }
        : { Items: items, LastEvaluatedKey: itemFrom(answered.LastEvaluatedKey) };
    },
  };
}
