/**
 * What the service asks of its storage for a record. A record is ciphertext, a revision and the
 * instant it was written, and the port says nothing else about it, because nothing else about it
 * is knowable here.
 */

/** A record item of section 6.4 of the design, as the service holds it. */
export interface StoredRecord {
  readonly recordId: string;
  readonly revision: number;
  readonly payload: Uint8Array;
  readonly updatedAt: string;
}

/**
 * What a write answers. Both shapes carry a revision: the one now written, or the higher one that
 * is already there, so the phone learns what it is behind rather than only that it was refused.
 */
export type WriteOutcome =
  | { readonly outcome: 'written'; readonly revision: number; readonly created: boolean }
  | { readonly outcome: 'revision-is-not-higher'; readonly revision: number };

/** One answer to a pull: the records read, how far the read reached, and whether more waits. */
export interface RecordPage {
  readonly records: readonly StoredRecord[];
  /** The write instant the page reached, or nothing at all when the page read no record. */
  readonly reached: string | null;
  readonly moreToCome: boolean;
}

/**
 * Bytes a record costs a page on top of its ciphertext: the identifier, the revision, the instant
 * and the punctuation around them, as the answer writes them. It is an allowance rather than a
 * measurement, and it is generous, because the page limit exists to keep an answer under a size
 * the caller can hold.
 */
export const recordOverheadBytes = 160;

/**
 * What one record costs a page. The ciphertext travels as base 64, which is four characters for
 * every three bytes, so the cost is counted in the answer's bytes and not in the table's.
 */
export function pageCostOf(record: StoredRecord): number {
  return Math.ceil(record.payload.length / 3) * 4 + recordOverheadBytes;
}

/**
 * The two things a record needs from storage. Neither one reads another account, and neither one
 * scans: a write is a single item and a pull is a query inside one partition.
 */
export interface RecordStore {
  /** Writes the record when its revision is higher than the stored one, and says which happened. */
  writeRecord(accountId: string, record: StoredRecord): Promise<WriteOutcome>;
  /**
   * Reads the records written after an instant, in write order, stopping before the page costs
   * more than the budget. Records sharing one instant are never split across two pages, because a
   * cursor is an instant and a split group would lose whatever fell on the far side of it.
   */
  readRecordsAfter(
    accountId: string,
    after: string | null,
    atMostBytes: number,
  ): Promise<RecordPage>;
}
