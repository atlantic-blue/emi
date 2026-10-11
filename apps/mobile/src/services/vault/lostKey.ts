import type { RandomSource } from '@emi/crypto';

import type { Database } from '../../data/database';
import { isEnvelope } from '../../data/migrations/004-encrypt-payloads';
import type { SecureStore } from './keychain';
import { createVaultKey, readVaultKey } from './vaultKey';

/**
 * What the keychain and the database say together about her key.
 *
 * A keychain with no key used to mean a phone that had never made one. It can also mean a phone
 * whose keychain lost the item while the database kept every row, after a restore from a backup
 * that does not carry the keychain. A key made then seals everything new under a key that opens
 * nothing she wrote before, and the next screen that reads an old day fails.
 */
export type KeyOnThisPhone =
  { readonly kind: 'held'; readonly key: Uint8Array } | { readonly kind: 'lost' };

interface CountRow {
  readonly count: number;
}

interface PayloadRow {
  readonly payload: Uint8Array;
}

/**
 * How many rows were sealed under a key, deleted days included. A day written before the envelope
 * existed is plain, and the launch passes seal it under whichever key this phone makes, so it is
 * not counted. Every profile row was sealed when it was written.
 */
export function sealedRowsHeld(db: Database): number {
  const days = db
    .all<PayloadRow>('SELECT payload FROM day_log')
    .filter((row) => isEnvelope(row.payload)).length;
  const profiles = db.all<CountRow>('SELECT count(*) AS count FROM profile')[0]?.count ?? 0;

  return days + profiles;
}

/**
 * The key she has, a key made for her when nothing is sealed yet, or the answer that her key is
 * lost. A lost key is never replaced here: the caller asks her first.
 */
export async function keyOnThisPhone(
  store: SecureStore,
  random: RandomSource,
  db: Database,
): Promise<KeyOnThisPhone> {
  const held = await readVaultKey(store);

  if (held !== null) {
    return { kind: 'held', key: held };
  }

  if (sealedRowsHeld(db) > 0) {
    return { kind: 'lost' };
  }

  return { kind: 'held', key: await createVaultKey(store, random) };
}
