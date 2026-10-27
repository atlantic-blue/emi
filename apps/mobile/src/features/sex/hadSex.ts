import type { DayRecord } from '@emi/crypto';

/** Whether her answer on the Sex page says she had sex that day. "No sex" is an answer too. */
export function hadSex(record: Pick<DayRecord, 'sex'>): boolean {
  return record.sex !== undefined && record.sex !== 'none';
}
