import { type DayRecord, keyLength, recordBytes, recordFromBytes } from '@emi/crypto';

/**
 * The plaintext of a day, from section 6.2 of the design. The shape, the ranges and the canonical
 * bytes all live in `@emi/crypto`, because the service reads the same format and one of them
 * drifting from the other is the failure this package exists to stop.
 */
export { type DayRecord, recordBytes, recordFromBytes };

export function aDayRecord(overrides: Partial<DayRecord> = {}): DayRecord {
  return {
    day: '2026-03-14',
    symptoms: ['cramps', 'napping', 'low-mood'],
    recordedAt: '2026-03-14T21:05:00.000Z',
    ...overrides,
  };
}

/** A key for a test, and a reminder that a real one is 32 bytes from the platform's generator. */
export function aVaultKey(fill = 0x9f): Uint8Array {
  return new Uint8Array(keyLength).fill(fill);
}
