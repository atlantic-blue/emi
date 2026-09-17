import type { DayRecord } from '@emi/cycle';

/**
 * The plaintext of design section 6.2, with its keys sorted, which is the shape the envelope
 * carries from step 5.3 onwards. Nothing here encrypts anything: the envelope is not built yet,
 * and this writes the plaintext into the payload column so the arithmetic can be driven from the
 * real table today.
 *
 * `@emi/cycle` names the three fields the arithmetic reads. `RecordedDay` adds the rest of the
 * section, and the instant she pressed save.
 */
export interface RecordedDay extends DayRecord {
  readonly symptoms?: readonly string[];
  readonly moods?: readonly string[];
  readonly energy?: number;
  readonly temperatureCelsius?: number;
  readonly weightKilograms?: number;
  readonly note?: string;
  readonly recordedAt: string;
}

export function encodeDay(record: DayRecord): Uint8Array {
  const sorted = Object.fromEntries(
    Object.entries(record).sort(([one], [other]) => one.localeCompare(other)),
  );
  return new TextEncoder().encode(JSON.stringify(sorted));
}

export function decodeDay(payload: Uint8Array): DayRecord {
  const read: unknown = JSON.parse(new TextDecoder().decode(payload));
  if (typeof read !== 'object' || read === null || typeof (read as DayRecord).day !== 'string') {
    throw new Error('a payload carries a day written as YYYY-MM-DD');
  }
  return read as DayRecord;
}
