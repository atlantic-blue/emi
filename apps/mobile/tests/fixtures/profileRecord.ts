import { type ProfileRecord } from '@emi/crypto';

/**
 * What she told Emi about herself in the first run. The shape, the bounds and the canonical bytes
 * live in `@emi/crypto`, because the profile travels to the server as one more sealed record and a
 * second copy of the rules here would drift from the one the seal reads.
 *
 * Sealing and opening are not re-exported here: a test reaches for `herVault` instead, because a
 * row written with the plain bytes is a row the table refuses.
 */
export type { ProfileRecord };

export function aProfileRecord(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    kind: 'profile',
    name: 'Maria',
    birthYear: 1994,
    cycleLengthDays: 29,
    periodLengthDays: 5,
    regularity: 'moves',
    feeling: 'understand',
    goals: ['forecast', 'symptoms'],
    focus: ['sleep', 'pain'],
    recordedAt: '2026-09-23T09:14:00.000Z',
    ...overrides,
  };
}
