import { join } from 'node:path';

import { EnvelopeError, keyLength } from '@emi/crypto';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { insertDayLog, listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import { rebuildCycles, recordedDays } from '../../src/features/cycle/rebuild';
import { historyNow } from '../../src/features/history/historyNow';
import { historyScreenTestID } from '../../src/features/history/HistoryScreen';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { dayVault } from '../../src/services/vault/dayVault';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herRandom, herVault } from '../fixtures/herVault';
import { theThemeIsLoaded } from '../fixtures/theTheme';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const herPeriod = ['2026-05-09', '2026-05-10', '2026-05-11'];

/** A day from before the key on her phone, sealed under a key the phone no longer holds. */
const theLostDay = '2026-04-11';

function aKeyHerPhoneNeverHeld(): Uint8Array {
  return new Uint8Array(keyLength).fill(0x42);
}

function theLostDayIsInTheTable(): void {
  const elsewhere = dayVault(aKeyHerPhoneNeverHeld(), herRandom);
  insertDayLog(herDatabase(), {
    day: theLostDay,
    payload: elsewhere.seal(aBleedingDay(theLostDay)),
    now: new Date(`${theLostDay}T08:00:00.000Z`),
  });
}

function oneByteOfChanges(day: string): void {
  const database = herDatabase();
  const row = readDayLog(database, day);
  if (!row) {
    throw new Error(`${day} was seeded and is not in the table`);
  }
  const changed = Uint8Array.from(row.payload);
  changed[changed.length - 1] = (changed[changed.length - 1] ?? 0) ^ 0x01;
  database.run('UPDATE day_log SET payload = ?, revision = revision + 1 WHERE day = ?', [
    changed,
    day,
  ]);
}

function theDaysRead(): string[] {
  return recordedDays(herDatabase(), herVault().open).map((record) => record.day);
}

describe('a day that does not open', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
    theThemeIsLoaded();
    await herPhoneHolds(
      new Date('2026-05-01T09:00:00.000Z'),
      herPeriod.map((day) => aBleedingDay(day)),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('is left out when it was sealed under a key her phone does not hold', () => {
    theLostDayIsInTheTable();

    expect(theDaysRead()).toEqual(herPeriod);
  });

  it('is left out when one byte of it changed', () => {
    oneByteOfChanges('2026-05-10');

    expect(theDaysRead()).toEqual(['2026-05-09', '2026-05-11']);
  });

  it('stays in the table, so nothing she wrote is removed by reading it', () => {
    theLostDayIsInTheTable();
    theDaysRead();

    expect(listDayLogs(herDatabase()).map((row) => row.day)).toContain(theLostDay);
  });

  it('does not stop the cycles being rebuilt from the days that open', () => {
    theLostDayIsInTheTable();

    rebuildCycles(herDatabase(), herVault().open, whenSheOpensIt);

    expect(listCycles(herDatabase()).map((cycle) => cycle.startedOn)).toEqual(['2026-05-09']);
  });

  it('does not stop her history being read', () => {
    theLostDayIsInTheTable();

    expect(historyNow(herDatabase(), herVault()).cycles.map((cycle) => cycle.startedOn)).toEqual([
      '2026-05-09',
    ]);
  });

  it('still fails loudly for a fault that is not an envelope refusing', () => {
    const broken = (): never => {
      throw new TypeError('the reader itself is broken');
    };

    expect(() => recordedDays(herDatabase(), broken)).toThrow(TypeError);
  });

  it('is an envelope refusal, which is the one fault the readers leave out', () => {
    theLostDayIsInTheTable();
    const row = readDayLog(herDatabase(), theLostDay);

    expect(() => herVault().open(row?.payload ?? new Uint8Array())).toThrow(EnvelopeError);
  });

  it('leaves the screen she opens drawn, with her period on it', async () => {
    theLostDayIsInTheTable();

    await renderRouter(appDirectory, { initialUrl: '/' });

    expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
  });

  it('leaves her history drawn', async () => {
    theLostDayIsInTheTable();

    await renderRouter(appDirectory, { initialUrl: '/history' });

    expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();
  });
});
