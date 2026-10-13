import type { DayRecord } from '@emi/crypto';

import { listCycles } from '../../src/data/cycleRepository';
import { listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import { logDay } from '../../src/features/cycle/rebuild';
import { everythingIn } from '../../src/features/export/everything';
import { readableHtml } from '../../src/features/export/readableDocument';
import { deleteEverything, rowsHeld } from '../../src/services/vault/wipe';
import { migratedDatabase } from '../fixtures/cycleCache';
import { herVault } from '../fixtures/herVault';
import { memorySecureStore } from '../fixtures/secureStore';

/**
 * The new fields of the day record, on the phone: written through the same path a screen uses,
 * read back out of the table, carried by the export, removed by delete everything, and invisible
 * to the cycle arithmetic.
 */

const whenSheLogged = new Date('2026-11-12T20:00:00.000Z');
const whenSheExported = new Date('2026-11-13T09:30:00.000Z');

const aDayWithEveryNewField: DayRecord = {
  day: '2026-11-12',
  sex: 'unprotected',
  sexDrive: 'high',
  orgasm: 'yes',
  discharge: 'egg-white',
  products: ['liner'],
  food: ['cravings', 'sweet'],
  moods: ['happy'],
  ovulationSigns: ['egg-white-discharge', 'higher-sex-drive'],
  ovulationPopup: 'answered',
  recordedAt: '2026-11-12T20:00:00.000Z',
};

function herPhoneWith(days: readonly DayRecord[]) {
  const database = migratedDatabase();
  const vault = herVault();

  for (const day of days) {
    logDay(database, { day: day.day, payload: vault.seal(day), now: whenSheLogged }, vault.open);
  }

  return database;
}

function aBleedingDay(day: string): DayRecord {
  return { day, flow: 'medium', recordedAt: `${day}T08:00:00.000Z` };
}

function onlyANewField(day: string, field: Partial<DayRecord>): DayRecord {
  return { day, recordedAt: `${day}T08:00:00.000Z`, ...field };
}

describe('a day with the new fields, on her phone', () => {
  it('comes back out of the table as she saved it', () => {
    const database = herPhoneWith([aDayWithEveryNewField]);
    const row = readDayLog(database, '2026-11-12');

    expect(row).toBeDefined();
    expect(herVault().open(row?.payload ?? new Uint8Array())).toEqual(aDayWithEveryNewField);
  });

  it('is never written to the table in the clear', () => {
    const database = herPhoneWith([aDayWithEveryNewField]);
    const stored = new TextDecoder().decode(listDayLogs(database)[0]?.payload);

    expect(stored).not.toContain('unprotected');
    expect(stored).not.toContain('egg-white-discharge');
  });

  it('is carried whole by the export, in the data file and in the page she reads', () => {
    const everything = everythingIn(
      herPhoneWith([aDayWithEveryNewField]),
      herVault(),
      whenSheExported,
    );
    const page = readableHtml(everything);

    expect(everything.tables.day_log?.[0]?.payload).toEqual(aDayWithEveryNewField);
    expect(page).toContain('Unprotected');
    expect(page).toContain('Cravings, Sweet');
  });

  it('is gone after delete everything', async () => {
    const database = herPhoneWith([aDayWithEveryNewField]);

    await deleteEverything(database, memorySecureStore(), () => Promise.resolve('gone'));

    expect(readDayLog(database, '2026-11-12')).toBeUndefined();
    expect(rowsHeld(database)).toBe(0);
  });
});

describe('a day that carries only a new field', () => {
  const newFieldsAlone: readonly [string, Partial<DayRecord>][] = [
    ['sex', { sex: 'protected' }],
    ['sex drive', { sexDrive: 'low' }],
    ['orgasm', { orgasm: 'no' }],
    ['discharge', { discharge: 'none' }],
    ['products', { products: ['pad'] }],
    ['food', { food: ['salty'] }],
    ['signs of ovulation', { ovulationSigns: ['nothing-yet'], ovulationPopup: 'answered' }],
    ['a closed popup', { ovulationPopup: 'dismissed' }],
  ];

  it.each(newFieldsAlone)('does not close her period: %s', (_name, field) => {
    const database = herPhoneWith([
      aBleedingDay('2026-11-01'),
      aBleedingDay('2026-11-02'),
      onlyANewField('2026-11-03', field),
    ]);

    expect(listCycles(database)).toHaveLength(1);
    expect(listCycles(database)[0]?.periodLengthDays).toBeNull();
  });

  it.each(newFieldsAlone)('does not open a period: %s', (_name, field) => {
    const database = herPhoneWith([onlyANewField('2026-11-03', field)]);

    expect(listCycles(database)).toEqual([]);
  });

  it('still lets a recorded flow close her period, after a day of new fields only', () => {
    const database = herPhoneWith([
      aBleedingDay('2026-11-01'),
      aBleedingDay('2026-11-02'),
      onlyANewField('2026-11-03', { sex: 'protected', products: ['tampon'] }),
      { day: '2026-11-04', flow: 'none', recordedAt: '2026-11-04T08:00:00.000Z' },
    ]);

    expect(listCycles(database)[0]?.periodLengthDays).toBe(2);
  });
});
