import { type DayRecord, type RandomSource, openRecord, sealRecord } from '@emi/crypto';

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

/**
 * The random source is a required argument because React Native runs on Hermes, and Hermes has no
 * `globalThis.crypto` for the envelope to fall back to. Node has one, so a vault built without a
 * source seals in every test and refuses on her phone. A required argument makes the compiler name
 * a call site that forgets it.
 */
export function dayVault(key: Uint8Array, random: RandomSource): DayVault {
  return {
    seal: (record) => sealRecord(record, key, { random }),
    open: (payload) => openRecord(payload, key),
  };
}
