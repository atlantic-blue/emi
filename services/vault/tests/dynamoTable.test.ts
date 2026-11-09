import { accountIdFor } from '@emi/crypto';

import { conditionalCheckFailure, dynamoStore } from '../src/store/dynamo';
import { type DynamoDbAnswer, dynamoTable, type SendsToDynamoDb } from '../src/store/dynamoTable';
import { tableName } from './fixtures/dynamoTable';
import { anAccount, keyPairFromSeed } from './fixtures/requests';

/**
 * The adapter between the port and the real client. It is a pass through, so every case here reads
 * either what left for the table or what came back from it, and nothing in between.
 */

interface Sent {
  readonly command: string;
  readonly input: unknown;
}

interface Recording {
  readonly client: SendsToDynamoDb;
  readonly sent: Sent[];
}

function clientThatAnswers(answers: readonly DynamoDbAnswer[]): Recording {
  const sent: Sent[] = [];
  let at = 0;

  return {
    sent,
    client: {
      send: (command) => {
        sent.push({ command: command.constructor.name, input: command.input });
        at += 1;

        return Promise.resolve(answers[at - 1] ?? {});
      },
    },
  };
}

function clientThatRefusesItsCondition(): SendsToDynamoDb {
  return {
    send: () => {
      const refused = new Error('the conditional request failed');
      refused.name = conditionalCheckFailure;

      return Promise.reject(refused);
    },
  };
}

const aKey = { pk: { S: 'ACC#one' }, sk: { S: 'META' } } as const;
const bytes = new Uint8Array([7, 8, 9]);

describe('the port reaches the real table and adds nothing on the way', () => {
  describe('what leaves for the table', () => {
    it('writes an item through the command of the same name, with the input unchanged', async () => {
      const recording = clientThatAnswers([]);
      const input = {
        TableName: tableName,
        Item: aKey,
        ConditionExpression: 'attribute_not_exists(pk)',
      };

      await dynamoTable(recording.client).putItem(input);

      expect(recording.sent).toEqual([{ command: 'PutItemCommand', input }]);
    });

    it('reads one item through the command of the same name', async () => {
      const recording = clientThatAnswers([{}]);
      const input = { TableName: tableName, Key: aKey, ConsistentRead: true };

      await dynamoTable(recording.client).getItem(input);

      expect(recording.sent).toEqual([{ command: 'GetItemCommand', input }]);
    });

    it('changes part of an item through the command of the same name', async () => {
      const recording = clientThatAnswers([]);
      const input = { TableName: tableName, Key: aKey, UpdateExpression: 'ADD recordCount :one' };

      await dynamoTable(recording.client).updateItem(input);

      expect(recording.sent).toEqual([{ command: 'UpdateItemCommand', input }]);
    });

    it('removes one item through the command of the same name', async () => {
      const recording = clientThatAnswers([{}]);
      const input = { TableName: tableName, Key: aKey, ReturnValues: 'ALL_OLD' } as const;

      await dynamoTable(recording.client).deleteItem(input);

      expect(recording.sent).toEqual([{ command: 'DeleteItemCommand', input }]);
    });

    it('reads along a key through the command of the same name', async () => {
      const recording = clientThatAnswers([{}]);
      const input = { TableName: tableName, KeyConditionExpression: 'pk = :pk' };

      await dynamoTable(recording.client).query(input);

      expect(recording.sent).toEqual([{ command: 'QueryCommand', input }]);
    });
  });

  describe('what comes back from the table', () => {
    it('reads the four value shapes the vault writes', async () => {
      const client = clientThatAnswers([
        {
          Item: {
            pk: { S: 'ACC#one' },
            revision: { N: '3' },
            payload: { B: bytes },
            spent: { BOOL: true },
          },
        },
      ]).client;

      const item = await dynamoTable(client).getItem({ TableName: tableName, Key: aKey });

      expect(item).toEqual({
        pk: { S: 'ACC#one' },
        revision: { N: '3' },
        payload: { B: bytes },
        spent: { BOOL: true },
      });
    });

    it('answers nothing where the table held no item', async () => {
      const client = clientThatAnswers([{}]).client;

      await expect(
        dynamoTable(client).getItem({ TableName: tableName, Key: aKey }),
      ).resolves.toBeUndefined();
    });

    it('answers a removal with the item it took', async () => {
      const client = clientThatAnswers([
        { Attributes: { userName: { S: 'telegram-one' } } },
      ]).client;

      await expect(
        dynamoTable(client).deleteItem({
          TableName: tableName,
          Key: aKey,
          ReturnValues: 'ALL_OLD',
        }),
      ).resolves.toEqual({ userName: { S: 'telegram-one' } });
    });

    it('answers a removal that took nothing with nothing', async () => {
      const client = clientThatAnswers([{}]).client;

      await expect(
        dynamoTable(client).deleteItem({ TableName: tableName, Key: aKey }),
      ).resolves.toBeUndefined();
    });

    it('answers a read along a key with its items and the key to start again from', async () => {
      const client = clientThatAnswers([
        { Items: [{ sk: { S: 'REC#one' } }], LastEvaluatedKey: { sk: { S: 'REC#one' } } },
      ]).client;

      await expect(
        dynamoTable(client).query({ TableName: tableName, KeyConditionExpression: 'pk = :pk' }),
      ).resolves.toEqual({
        Items: [{ sk: { S: 'REC#one' } }],
        LastEvaluatedKey: { sk: { S: 'REC#one' } },
      });
    });

    it('answers a read that reached the end with its items and no key, never an absent list', async () => {
      const client = clientThatAnswers([{}]).client;

      await expect(
        dynamoTable(client).query({ TableName: tableName, KeyConditionExpression: 'pk = :pk' }),
      ).resolves.toEqual({ Items: [] });
    });

    it('raises on an attribute of a shape the vault never writes, naming the attribute', async () => {
      const client = clientThatAnswers([
        { Item: { pk: { S: 'ACC#one' }, days: { L: [] } } },
      ]).client;

      await expect(
        dynamoTable(client).getItem({ TableName: tableName, Key: aKey }),
      ).rejects.toThrow(/days/);
    });
  });

  describe('a write the table refused by its condition', () => {
    it('travels out untouched, so the store reads a refusal as an answer and not as a fault', async () => {
      const pair = keyPairFromSeed(13);
      const store = dynamoStore(dynamoTable(clientThatRefusesItsCondition()), tableName);

      const outcome = await store.createAccount(
        anAccount(pair, new Date('2026-09-28T09:00:00.000Z')),
      );

      expect(outcome).toBe('already-registered');
      expect(accountIdFor(pair.publicKey)).not.toBe('');
    });
  });
});
