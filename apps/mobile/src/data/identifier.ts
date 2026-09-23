import type { Database } from './database';
import { uuidV7, uuidV7RandomByteCount } from './uuidV7';

/**
 * The identifier a new row carries. The randomness comes from SQLite rather than from the runtime
 * because React Native runs on Hermes, and Hermes has no `globalThis.crypto` to draw from. The
 * database is open by the time a row is written, so it is the one source every path already holds.
 */
export function newIdentifier(db: Database, now: Date): string {
  const rows = db.all<{ bytes: Uint8Array }>('SELECT randomblob(?) AS bytes', [
    uuidV7RandomByteCount,
  ]);
  const bytes = rows[0]?.bytes;
  if (!bytes) {
    throw new Error('SQLite returned no random bytes');
  }
  return uuidV7(now.getTime(), bytes);
}
