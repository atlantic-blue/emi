import { join } from 'node:path';

import { recordBytes } from '@emi/crypto';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listDayLogs } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { lostKeyCopy } from '../../src/features/lostKey/copy';
import { lostKeyActionTestID, lostKeyScreenTestID } from '../../src/features/lostKey/LostKey';
import { expoKeychain } from '../../src/services/vault/keychain';
import { keyOnThisPhone } from '../../src/services/vault/lostKey';
import { vaultKeyItem } from '../../src/services/vault/vaultKey';
import { resetExpoSqlite } from '../data/expoSqlite';
import { itemsInTheKeychain, resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herKey, herRandom } from '../fixtures/herVault';
import { theThemeIsLoaded } from '../fixtures/theTheme';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** Her phone after a restore that kept the database and not the keychain. */
async function herDaysAreHeldAndHerKeyIsGone(): Promise<void> {
  await herPhoneHolds(new Date('2026-05-01T09:00:00.000Z'), [
    aBleedingDay('2026-05-09'),
    aBleedingDay('2026-05-10'),
  ]);
  resetExpoSecureStore();
}

function theKeyOnThePhone(): string | undefined {
  return itemsInTheKeychain()[vaultKeyItem];
}

describe('a phone that holds her days and not the key to them', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
    theThemeIsLoaded();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('what the keychain and the database say together', () => {
    it('makes a key on a phone that holds nothing yet', async () => {
      const database = herDatabase();
      migrate(database);

      const held = await keyOnThisPhone(expoKeychain(), herRandom, database);

      expect(held.kind).toBe('held');
      expect(theKeyOnThePhone()).toBeDefined();
    });

    it('answers lost, and makes no key, when sealed days are held', async () => {
      await herDaysAreHeldAndHerKeyIsGone();

      const held = await keyOnThisPhone(expoKeychain(), herRandom, herDatabase());

      expect(held.kind).toBe('lost');
      expect(theKeyOnThePhone()).toBeUndefined();
    });

    it('makes a key for days written before the envelope, which the launch passes then seal', async () => {
      const database = herDatabase();
      migrate(database);
      // Written past the repository, which refuses a plain day now, the way a phone from before
      // the envelope holds it.
      database.run(
        `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at, deleted_at,
           synced_revision)
         VALUES (?, ?, ?, 1, ?, ?, NULL, NULL)`,
        [
          '01950000-0000-7000-8000-000000000001',
          '2026-05-09',
          recordBytes(aBleedingDay('2026-05-09')),
          whenSheOpensIt.toISOString(),
          whenSheOpensIt.toISOString(),
        ],
      );

      const held = await keyOnThisPhone(expoKeychain(), herRandom, database);

      expect(held.kind).toBe('held');
    });

    it('hands back the key she holds', async () => {
      await herPhoneHolds(new Date('2026-05-01T09:00:00.000Z'), [aBleedingDay('2026-05-09')]);

      const held = await keyOnThisPhone(expoKeychain(), herRandom, herDatabase());

      expect(held).toEqual({ kind: 'held', key: herKey() });
    });
  });

  describe('what she sees', () => {
    it('is told her days cannot be opened, and nothing is deleted or made', async () => {
      await herDaysAreHeldAndHerKeyIsGone();

      await renderRouter(appDirectory, { initialUrl: '/' });

      expect(screen.getByTestId(lostKeyScreenTestID)).toBeTruthy();
      expect(screen.getByText(lostKeyCopy.title)).toBeTruthy();
      expect(listDayLogs(herDatabase())).toHaveLength(2);
      expect(theKeyOnThePhone()).toBeUndefined();
    });

    it('starts again from the first run once she presses, on an empty phone with a new key', async () => {
      await herDaysAreHeldAndHerKeyIsGone();
      const app = renderRouter(appDirectory, { initialUrl: '/' });
      await app;

      await fireEvent.press(screen.getByTestId(lostKeyActionTestID));

      await waitFor(() => expect(screen.queryByTestId(lostKeyScreenTestID)).toBeNull());
      expect(app.getPathname()).toMatch(/^\/onboarding/);
      expect(listDayLogs(herDatabase())).toHaveLength(0);
      expect(theKeyOnThePhone()).toBeDefined();
    });
  });
});
