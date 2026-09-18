import { type DayRecord, openRecord, sealRecord } from '@emi/crypto';

/**
 * The vault key, bound to the two things the application does with it. Every day she writes is
 * sealed here and every day she reads is opened here, so the key is held in one place and the
 * screens pass a vault rather than passing a key around.
 */
export interface DayVault {
  /** Her day, as the envelope that goes in the payload column. */
  seal(record: DayRecord): Uint8Array;
  /** The envelope in the payload column, as her day. */
  open(payload: Uint8Array): DayRecord;
}

export function dayVault(key: Uint8Array): DayVault {
  return {
    seal: (record) => sealRecord(record, key),
    open: (payload) => openRecord(payload, key),
  };
}
