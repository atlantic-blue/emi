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
} from '../../src/store/dynamo';
import { conditionalCheckFailure } from '../../src/store/dynamo';

/**
 * A table held in memory, at the boundary the real client sits at: it takes the request shapes
 * DynamoDB takes and it refuses what DynamoDB refuses. Anything it is asked that it does not
 * understand throws by name, so a store that starts writing a different expression fails here
 * rather than passing against a double that shrugged.
 */

/** Bytes. The real table refuses an item larger than this, so this one does too. */
export const maximumItemBytes = 400 * 1024;

/** The name the tests write under, so a wrong table name in the store is visible. */
export const tableName = 'emi-vault';

/** The second table, which holds the article catalogue and nothing of hers. */
export const articleTableName = 'emi-articles';

/** What a fake table offers a test beyond the four operations: the items themselves. */
export interface FakeTable extends DynamoDbTable {
  /** Every item written, in key order, as the table holds it. */
  items(): Item[];
  /** How many calls of each operation the store made, so a test can count reads and writes. */
  calls(): TableCalls;
}

/** One count for each operation the vault uses. */
export interface TableCalls {
  putItem: number;
  getItem: number;
  updateItem: number;
  deleteItem: number;
  query: number;
}

/** How the fake behaves where DynamoDB has a choice to make. */
export interface FakeTableOptions {
  /** Items one query answers with before it hands back a key to start again from. */
  readonly itemsPerPage?: number;
  /** A key this table will not let go of, so a delete that leaves something can be driven. */
  readonly refusesToDelete?: string;
  /** The table this one stands for. The vault, unless a test names the other one. */
  readonly name?: string;
}

function refusedByCondition(): Error {
  const error = new Error('the conditional request failed');
  error.name = conditionalCheckFailure;

  return error;
}

function copyOf(value: AttributeValue): AttributeValue {
  return 'B' in value ? { B: Uint8Array.from(value.B) } : value;
}

function copyOfItem(item: Item): Item {
  return Object.fromEntries(Object.entries(item).map(([name, value]) => [name, copyOf(value)]));
}

function sizeOf(item: Item): number {
  return Object.entries(item).reduce((total, [name, value]) => {
    const held = 'B' in value ? value.B.length : 'S' in value ? value.S.length : 8;

    return total + name.length + held;
  }, 0);
}

function textOf(value: AttributeValue | undefined): string {
  return value !== undefined && 'S' in value ? value.S : '';
}

function numberOf(value: AttributeValue | undefined): number {
  return value !== undefined && 'N' in value ? Number(value.N) : Number.NaN;
}

function startKeyOf(item: Item, onTheIndex: boolean): Item {
  const key: Record<string, AttributeValue> = {};

  for (const name of onTheIndex ? ['pk', 'sk', 'updatedAt'] : ['pk', 'sk']) {
    const value = item[name];

    if (value !== undefined) {
      key[name] = value;
    }
  }

  return key;
}

/**
 * The attributes a read asked for. A projection the table does not understand throws rather than
 * being ignored, because a store that asked for less than it reads would pass here and fail there.
 */
function projected(item: Item, expression: string | undefined): Item {
  if (expression === undefined) {
    return item;
  }

  const wanted = expression.split(',').map((name) => name.trim());

  if (wanted.some((name) => !/^[A-Za-z][A-Za-z0-9]*$/.test(name))) {
    throw new Error(`this table does not understand the projection "${expression}"`);
  }

  return Object.fromEntries(Object.entries(item).filter(([name]) => wanted.includes(name)));
}

const keyText = (item: Item): string => `${textOf(item.pk)} ${textOf(item.sk)}`;

function named(name: string, names: Readonly<Record<string, string>> | undefined): string {
  return name.startsWith('#') ? (names?.[name] ?? name) : name;
}

/**
 * The condition forms this table understands, and no others. Each one is a form the vault writes,
 * so a new condition arrives with a line here and a reader sees every rule the table enforces in
 * one place.
 */
function conditionHolds(
  expression: string,
  held: Item | undefined,
  input: PutItemInput | UpdateItemInput,
): boolean {
  return expression.split(' OR ').some((clause) => {
    const exists = /^attribute_exists\(([^)]+)\)$/.exec(clause.trim());

    if (exists?.[1] !== undefined) {
      return held !== undefined && named(exists[1], input.ExpressionAttributeNames) in held;
    }

    const absent = /^attribute_not_exists\(([^)]+)\)$/.exec(clause.trim());

    if (absent?.[1] !== undefined) {
      return held === undefined || !(named(absent[1], input.ExpressionAttributeNames) in held);
    }

    const lower = /^(\S+) < (:\S+)$/.exec(clause.trim());

    if (lower?.[1] !== undefined && lower[2] !== undefined) {
      const attribute = held?.[named(lower[1], input.ExpressionAttributeNames)];
      const against = input.ExpressionAttributeValues?.[lower[2]];

      return numberOf(attribute) < numberOf(against);
    }

    throw new Error(`this table does not understand the condition "${clause.trim()}"`);
  });
}

/** A table that answers the way the deployed one answers, for everything the vault asks it. */
export function fakeTable(options: FakeTableOptions = {}): FakeTable {
  const items = new Map<string, Item>();
  const counted: TableCalls = {
    putItem: 0,
    getItem: 0,
    updateItem: 0,
    deleteItem: 0,
    query: 0,
  };

  const stands = options.name ?? tableName;

  const checkedTable = (given: string): void => {
    if (given !== stands) {
      throw new Error(`there is no table called ${given}`);
    }
  };

  const sorted = (): Item[] =>
    [...items.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, it]) => it);

  return {
    items: () => sorted().map(copyOfItem),
    calls: () => ({ ...counted }),

    putItem: (input: PutItemInput): Promise<void> => {
      checkedTable(input.TableName);
      counted.putItem += 1;

      const key = keyText(input.Item);
      const held = items.get(key);

      if (
        input.ConditionExpression !== undefined &&
        !conditionHolds(input.ConditionExpression, held, input)
      ) {
        return Promise.reject(refusedByCondition());
      }

      if (sizeOf(input.Item) > maximumItemBytes) {
        return Promise.reject(new Error('an item is at most 400 kilobytes'));
      }

      items.set(key, copyOfItem(input.Item));

      return Promise.resolve();
    },

    getItem: (input: GetItemInput): Promise<Item | undefined> => {
      checkedTable(input.TableName);
      counted.getItem += 1;

      const held = items.get(keyText(input.Key));

      return Promise.resolve(held === undefined ? undefined : copyOfItem(held));
    },

    updateItem: (input: UpdateItemInput): Promise<void> => {
      checkedTable(input.TableName);
      counted.updateItem += 1;

      const key = keyText(input.Key);
      const held = items.get(key);

      if (
        input.ConditionExpression !== undefined &&
        !conditionHolds(input.ConditionExpression, held, input)
      ) {
        return Promise.reject(refusedByCondition());
      }

      const adding = /^ADD (\S+) (:\S+)$/.exec(input.UpdateExpression.trim());

      if (adding?.[1] === undefined || adding[2] === undefined) {
        throw new Error(`this table does not understand the update "${input.UpdateExpression}"`);
      }

      const attribute = named(adding[1], input.ExpressionAttributeNames);
      const by = numberOf(input.ExpressionAttributeValues?.[adding[2]]);
      const was = held === undefined ? 0 : numberOf(held[attribute]) || 0;

      items.set(key, { ...(held ?? copyOfItem(input.Key)), [attribute]: { N: String(was + by) } });

      return Promise.resolve();
    },

    deleteItem: (input: DeleteItemInput): Promise<void> => {
      checkedTable(input.TableName);
      counted.deleteItem += 1;

      const key = keyText(input.Key);

      // The real table answers a delete of an item that was never there with a success, so this
      // one does too: a delete is the same request whether the item is held or not.
      if (key !== options.refusesToDelete) {
        items.delete(key);
      }

      return Promise.resolve();
    },

    query: (input: QueryInput): Promise<QueryOutput> => {
      checkedTable(input.TableName);
      counted.query += 1;

      const condition = input.KeyConditionExpression.trim();
      const partition = /^pk = (:\S+)$/.exec(condition);
      const after = /^pk = (:\S+) AND updatedAt > (:\S+)$/.exec(condition);
      const wanted = partition?.[1] ?? after?.[1];

      if (wanted === undefined) {
        throw new Error(`this table does not understand the key condition "${condition}"`);
      }

      const partitionKey = textOf(input.ExpressionAttributeValues?.[wanted]);
      const onTheIndex = input.IndexName !== undefined;

      // An item with no `updatedAt` is not in the index at all, which is how the account item and
      // the remembered signatures stay out of a pull.
      let found = sorted().filter(
        (item) => textOf(item.pk) === partitionKey && (!onTheIndex || 'updatedAt' in item),
      );

      if (onTheIndex) {
        found = [...found].sort((left, right) =>
          textOf(left.updatedAt) === textOf(right.updatedAt)
            ? textOf(left.sk).localeCompare(textOf(right.sk))
            : textOf(left.updatedAt).localeCompare(textOf(right.updatedAt)),
        );
      }

      if (after?.[2] !== undefined) {
        const from = textOf(input.ExpressionAttributeValues?.[after[2]]);

        found = found.filter((item) => textOf(item.updatedAt) > from);
      }

      if (input.ExclusiveStartKey !== undefined) {
        const startAt = keyText(input.ExclusiveStartKey);
        const at = found.findIndex((item) => keyText(item) === startAt);

        found = at === -1 ? found : found.slice(at + 1);
      }

      const perPage = options.itemsPerPage ?? found.length;
      const page = found.slice(0, perPage);
      const last = page[page.length - 1];
      const more = found.length > page.length && last !== undefined;

      return Promise.resolve({
        Items: page.map((item) => projected(copyOfItem(item), input.ProjectionExpression)),
        // The key a query hands back carries the index sort key beside the table key, which is
        // what the caller passes straight back as the place to start again.
        LastEvaluatedKey: more ? startKeyOf(last, onTheIndex) : undefined,
      });
    },
  };
}
