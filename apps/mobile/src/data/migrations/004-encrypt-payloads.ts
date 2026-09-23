import { EnvelopeError, readEnvelope, recordFromBytes } from '@emi/crypto';

import type { Database } from '../database';
import { writeOverWhatIsRemoved } from '../freePages';
import type { DayVault } from '../../services/vault/dayVault';

/**
 * Every day she wrote before the envelope arrived is sitting in the payload column as readable
 * text. This seals those rows under her vault key, once, on the first launch that holds a key.
 *
 * It is not a statement migration because it needs the key and the cipher, and neither of those is
 * SQL. Every launch may run it: a row that already carries an envelope is left alone, so the second run
 * converts nothing.
 */

export interface EncryptOutcome {
  /** Rows that were plaintext and are now sealed. */
  readonly sealed: number;
  /** Rows that already carried an envelope, which the second run onwards is all of them. */
  readonly alreadySealed: number;
}

interface StoredRow {
  readonly day: string;
  readonly payload: Uint8Array;
  readonly revision: number;
}

/**
 * The deleted rows are converted too. A day she deleted is still on the phone until the server has
 * been told, and it is still her day while it is there.
 */
export function encryptPlainPayloads(db: Database, vault: DayVault, now: Date): EncryptOutcome {
  const rows = db.all<StoredRow>('SELECT day, payload, revision FROM day_log ORDER BY day');
  const plain = rows.filter((row) => !isEnvelope(row.payload));

  if (plain.length === 0) {
    return { sealed: 0, alreadySealed: rows.length };
  }

  const instant = now.toISOString();

  // Her day is about to be replaced by its sealed self, and the plain copy the update lets go of
  // would otherwise stay in the file.
  writeOverWhatIsRemoved(db);

  db.execute('BEGIN');
  try {
    for (const row of plain) {
      // The revision rises because the stored bytes changed, and the table refuses a payload write
      // that leaves it where it was. It also tells the server this row is worth sending again.
      db.run(
        `UPDATE day_log SET payload = ?, revision = revision + 1, updated_at = ?
         WHERE day = ? AND revision = ?`,
        [vault.seal(recordFromBytes(row.payload)), instant, row.day, row.revision],
      );
    }
    db.execute('COMMIT');
  } catch (error) {
    db.execute('ROLLBACK');
    throw error;
  }

  return { sealed: plain.length, alreadySealed: rows.length - plain.length };
}

/** The shape check the service makes, with no key, because the question here is only the format. */
function isEnvelope(payload: Uint8Array): boolean {
  try {
    readEnvelope(payload);
    return true;
  } catch (error) {
    if (error instanceof EnvelopeError) {
      return false;
    }
    throw error;
  }
}
