import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { accountIdFor, base64Of, canonicalBytes, sealRecord } from '@emi/crypto';

import { putRecordFor } from '../src/handlers/putRecord';
import { dynamoStore } from '../src/store/dynamo';
import { fakeTable, type FakeTable, tableName } from './fixtures/dynamoTable';
import { anAccount, authorizedEvent, keyPairFromSeed, signedRequest } from './fixtures/requests';

/**
 * Contracts TABLE-4 and ENVELOPE-4. This is the file the product rests on: the first half writes a
 * day through the real handler and reads every attribute of the item that reached the table, and
 * the second half reads the service's own imports and asserts it holds nothing that could open
 * what it stores.
 */

const pair = keyPairFromSeed(3);
const accountId = accountIdFor(pair.publicKey);
const vaultKey = new Uint8Array(32).fill(7);
const recordId = '019826c2-4d00-7a1b-8c3d-0f1e2a3b4c5d';
const writtenAt = new Date('2026-09-18T10:00:00.000Z');

/** A word that appears nowhere else in this repository, so finding it means finding her note. */
const marker = 'zarquonberry';
/** The day she logged, which is months away from the day the write happened. */
const loggedDay = '2026-03-04';

const herDay = {
  day: loggedDay,
  flow: 'heavy',
  symptoms: ['cramps'],
  moods: ['low-mood'],
  energy: 2,
  temperatureCelsius: 36.7,
  weightKilograms: 61.2,
  note: `${marker} again, worse than last month`,
  recordedAt: '2026-03-04T21:14:00.000Z',
} as const;

async function tableAfterSheWrote(): Promise<FakeTable> {
  const table = fakeTable();
  const store = dynamoStore(table, tableName);

  await store.createAccount(anAccount(pair, writtenAt));

  const payload = sealRecord(herDay, vaultKey, {
    random: (count) => new Uint8Array(count).fill(9),
  });
  const path = `/v1/records/${recordId}`;
  const body = JSON.stringify({ revision: 1, payload: base64Of(payload) });
  const { event } = signedRequest(pair, { method: 'PUT', path, body, instant: writtenAt });

  const answered = await putRecordFor(authorizedEvent(event, accountId), store, writtenAt);

  expect(answered.statusCode).toBe(200);

  return table;
}

/**
 * Every attribute of an item as text: the names, the strings, the numbers, and the bytes read one
 * character for each byte, so anything readable hiding inside a binary attribute is found.
 */
function readableTextIn(table: FakeTable): string {
  return table
    .items()
    .flatMap((item) =>
      Object.entries(item).flatMap(([name, value]) => [
        name,
        'S' in value ? value.S : '',
        'N' in value ? value.N : '',
        'B' in value ? String.fromCharCode(...value.B) : '',
      ]),
    )
    .join('\n');
}

const serviceDirectory = resolve(__dirname, '..');

function sourceFilesUnder(directory: string, prefix = ''): string[] {
  return readdirSync(join(serviceDirectory, directory), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFilesUnder(join(directory, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );
}

interface TakenFrom {
  readonly specifier: string;
  readonly names: readonly string[];
}

/**
 * What one file takes from elsewhere, read from its own text rather than from a bundler's idea of
 * it. A re-export is an edge in the graph as much as an import is, so both forms are read here.
 */
function importsIn(source: string): TakenFrom[] {
  const taken: TakenFrom[] = [];
  const statements = /(?:import|export)\s+(?:type\s+)?([\s\S]*?)\s+from\s+'([^']+)';/g;
  let found = statements.exec(source);

  while (found !== null) {
    const clause = found[1] ?? '';
    const specifier = found[2] ?? '';
    const named = /\{([\s\S]*)\}/.exec(clause);

    taken.push({
      specifier,
      names: (named?.[1] ?? clause)
        .split(',')
        .map(
          (name) =>
            name
              .replace(/\btype\b/, '')
              .split(' as ')[0]
              ?.trim() ?? '',
        )
        .filter((name) => name.length > 0 && name !== '*'),
    });

    found = statements.exec(source);
  }

  return taken;
}

/** Every file the service reaches from its own entry point, and what each one imports. */
function importGraph(): { files: string[]; taken: TakenFrom[] } {
  const waiting = ['src/index.ts'];
  const read = new Set<string>();
  const taken: TakenFrom[] = [];

  while (waiting.length > 0) {
    const file = waiting.shift() as string;

    if (read.has(file)) {
      continue;
    }

    read.add(file);

    for (const held of importsIn(readFileSync(join(serviceDirectory, file), 'utf8'))) {
      if (!held.specifier.startsWith('.')) {
        taken.push(held);
        continue;
      }

      const parts = file.split('/').slice(0, -1);

      for (const step of held.specifier.split('/')) {
        if (step === '.') {
          continue;
        }

        if (step === '..') {
          parts.pop();
          continue;
        }

        parts.push(step);
      }

      waiting.push(`${parts.join('/')}.ts`);
    }
  }

  return { files: [...read].sort(), taken };
}

/**
 * What the service may take from the crypto package. Every name here reads a signature, a digest
 * or the shape of an envelope. Adding a line is a deliberate act a reviewer sees, which is the
 * point of writing the list out rather than counting the imports.
 */
const allowedFromCrypto: readonly string[] = [
  'accountIdFor',
  'base64Of',
  'bodyHashOf',
  'bytesFromBase64',
  'decoyPublicKey',
  'deviceKeyLength',
  'instantIsFresh',
  'instantWindowSeconds',
  'presentedSignatureIn',
  'readEnvelope',
  'readWrappedVaultKey',
  'recoverySaltLength',
  'refusalMessages',
  'signatureVerifies',
  'wrappedVaultKeyLength',
];

/**
 * The names that open an envelope or write one, and the names that derive a key one could be
 * opened with. The service may hold none of them. It stores a wrapped vault key from feature 6
 * step 4, so the derivation is on this list for the same reason the cipher is: a service that
 * could turn a recovery code into a key is a service that only needs her code to read everything.
 */
const namesThatOpenOrSeal: readonly string[] = [
  'argon2id',
  'drawRecoveryCode',
  'openBytes',
  'openRecord',
  'openWrappedVaultKey',
  'readRecoveryCode',
  'recoveryKeyFrom',
  'sealRecord',
  'sealVaultKey',
  'wrapVaultKey',
  'xchacha20poly1305',
];

/**
 * Words ending in key that the service is allowed to write. A partition key, a sort key and a
 * public key are keys to a table and to a signature, and none of them opens anything. A word that
 * is not on this list arrives with a reader asking what it unlocks.
 */
const allowedKeyWords: readonly string[] = [
  'ExclusiveStartKey',
  'accountIdContextKey',
  'Key',
  'readWrappedVaultKey',
  'wrappedVaultKey',
  'wrappedVaultKeyLength',
  'KeyConditionExpression',
  'LastEvaluatedKey',
  'accountSortKey',
  'decoyPublicKey',
  'deviceKeyLength',
  'key',
  'keyOf',
  'publicKey',
  'publicKeyIn',
  'recordSortKeyFor',
  'signatureSortKeyFor',
  'signedByTheKeyItRegisters',
  'sortKey',
];

describe('a marker word in a record never appears in the stored item', () => {
  describe('the day she wrote', () => {
    it('carries the marker word into the bytes that are sealed', () => {
      const plaintext = String.fromCharCode(...canonicalBytes(herDay));

      expect(plaintext).toContain(marker);
      expect(plaintext).toContain(loggedDay);
      expect(plaintext).toContain('heavy');
    });
  });

  describe('the item the table holds afterwards', () => {
    it('holds the marker word in no attribute of any item', async () => {
      const table = await tableAfterSheWrote();

      expect(readableTextIn(table)).not.toContain(marker);
    });

    it('holds neither the day she logged, nor her flow, nor a symptom she chose', async () => {
      const text = readableTextIn(await tableAfterSheWrote());

      for (const written of [loggedDay, 'heavy', 'cramps', 'low-mood', '36.7', '61.2']) {
        expect(text).not.toContain(written);
      }
    });

    it('carries the five attributes the design names, and no sixth', async () => {
      const table = await tableAfterSheWrote();
      const record = table.items().find((item) => 'payload' in item);

      expect(Object.keys(record ?? {}).sort()).toEqual([
        'payload',
        'pk',
        'revision',
        'sk',
        'updatedAt',
      ]);
    });

    it('carries no date but the instant of the write itself', async () => {
      const table = await tableAfterSheWrote();
      const dates = readableTextIn(table).match(/\d{4}-\d{2}-\d{2}/g) ?? [];

      expect(dates).toEqual(['2026-09-18', '2026-09-18']);
      expect(writtenAt.toISOString()).toContain('2026-09-18');
    });

    it('files the record under the identifier she chose and nothing she typed', async () => {
      const table = await tableAfterSheWrote();
      const record = table.items().find((item) => 'payload' in item);
      const sortKey = record?.sk;

      expect(sortKey !== undefined && 'S' in sortKey ? sortKey.S : '').toBe(`REC#${recordId}`);
    });
  });
});

describe('the service cannot open what it holds', () => {
  it('reaches every file it ships from its own entry point', () => {
    const onDisk = sourceFilesUnder('src')
      .map((file) => `src/${file}`)
      .sort();

    expect(importGraph().files).toEqual(onDisk);
  });

  it('takes from the crypto package only what reads a signature or a shape', () => {
    const fromCrypto = importGraph()
      .taken.filter((held) => held.specifier === '@emi/crypto')
      .flatMap((held) => held.names);

    expect(fromCrypto.length).toBeGreaterThan(0);
    expect([...new Set(fromCrypto)].sort()).toEqual(
      allowedFromCrypto.filter((name) => fromCrypto.includes(name)),
    );
  });

  it('imports no function that opens an envelope or writes one', () => {
    const names = importGraph().taken.flatMap((held) => held.names);

    for (const forbidden of namesThatOpenOrSeal) {
      expect(names).not.toContain(forbidden);
    }
  });

  it('imports nothing from the cipher library itself', () => {
    const specifiers = importGraph().taken.map((held) => held.specifier);

    expect(specifiers.filter((specifier) => specifier.startsWith('@noble'))).toEqual([]);
  });

  it('names no function that could decrypt, anywhere in its source', () => {
    const source = importGraph()
      .files.map((file) => readFileSync(join(serviceDirectory, file), 'utf8'))
      .join('\n');

    expect(source).not.toMatch(
      /openRecord|openBytes|openWrappedVaultKey|recoveryKeyFrom|argon2|\.decrypt\(|xchacha/,
    );
  });

  it('holds no key of its own, and reads none from its environment', () => {
    const source = importGraph()
      .files.map((file) => readFileSync(join(serviceDirectory, file), 'utf8'))
      .join('\n');
    const keyWords = [...new Set(source.match(/[A-Za-z]*[Kk]ey[A-Za-z]*/g) ?? [])].sort();

    expect(keyWords).toEqual(keyWords.filter((word) => allowedKeyWords.includes(word)));
    expect(source).not.toContain('process.env');
  });
});
