/**
 * The plaintext of a day, from section 6.2 of the design. Feature 5 step 1 puts it inside the
 * envelope. Until then the day log carries these bytes as they are.
 */
export interface DayRecord {
  readonly day: string;
  readonly symptoms?: readonly string[];
  readonly note?: string;
  readonly recordedAt: string;
}

export function aDayRecord(overrides: Partial<DayRecord> = {}): DayRecord {
  return {
    day: '2026-03-14',
    symptoms: ['cramps', 'napping', 'low-mood'],
    recordedAt: '2026-03-14T21:05:00.000Z',
    ...overrides,
  };
}

/** Canonical JSON, keys sorted and no whitespace, so one record is always the same bytes. */
export function recordBytes(record: DayRecord): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(record, Object.keys(record).sort()));
}

export function recordFromBytes(bytes: Uint8Array): DayRecord {
  return JSON.parse(new TextDecoder().decode(bytes)) as DayRecord;
}
