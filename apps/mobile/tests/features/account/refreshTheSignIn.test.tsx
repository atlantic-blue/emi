import { join } from 'node:path';

import { tabTestID } from '@emi/ui';
import { act } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { rowValueTestID } from '../../../src/components/SettingsRow';
import { accountGateScreenTestID } from '../../../src/features/account/AccountGate';
import { accountScreenTestID } from '../../../src/features/account/Account';
import {
  settingsAccountTestID,
  settingsScreenTestID,
} from '../../../src/features/settings/SettingsScreen';
import { english } from '../../../src/language';
import { THE_REFRESH_WAITS_MILLISECONDS } from '../../../src/services/signIn/theRefreshWhenSheOpens';
import { resetExpoSqlite } from '../../data/expoSqlite';
import {
  itemsInTheKeychain,
  resetExpoSecureStore,
  setItemAsync,
} from '../../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../../fixtures/herPhone';
import { resetTheAppState, sheComesBackToEmi } from '../../fixtures/thePhoneMoves';
import { textIn } from '../../fixtures/renderedText';
import {
  theCognitoSheReaches,
  theRefreshTokenARefreshRotatesTo,
  theRefreshTokenItHandsBack,
} from '../../fixtures/theCognitoSheReaches';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-11-20T09:00:00.000Z');

const herAddress = 'julia@example.com';

const theItemSheKeeps = 'emi.identityRefresh.v1';

/** The day she signed in on, which is months behind the day she is opening Emi on. */
const theDaySheSignedIn = '2026-09-28';

const herSignInOnThisPhone = {
  way: 'email',
  address: herAddress,
  since: theDaySheSignedIn,
  refreshToken: theRefreshTokenItHandsBack,
};

async function sheHasSignedInBefore(
  held: Readonly<Record<string, unknown>> = herSignInOnThisPhone,
): Promise<void> {
  await setItemAsync(theItemSheKeeps, JSON.stringify(held));
}

/** Emi started cold, which is the trigger a woman gives it every morning. */
async function sheOpensEmi(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await screen.findByTestId(tabTestID('settings/index'));
}

async function sheOpensTheSettingsRow(): Promise<void> {
  await fireEvent.press(await screen.findByTestId(tabTestID('settings/index')));
  await screen.findByTestId(settingsScreenTestID);
}

function theSignInTheItemHolds(): Record<string, unknown> {
  const held = itemsInTheKeychain()[theItemSheKeeps];

  return held === undefined ? {} : (JSON.parse(held) as Record<string, unknown>);
}

/**
 * The deadline on the call running out, with the turns of the event loop the refusal travels back
 * through. Without the flush the service still holds the call in flight, and the next trigger
 * reads a slot that is about to be free.
 */
async function theDeadlinePasses(): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(THE_REFRESH_WAITS_MILLISECONDS);

    for (let turn = 0; turn < 10; turn += 1) {
      await Promise.resolve();
    }
  });
}

function theCalls(went: readonly { readonly call: string }[]): string[] {
  return went.map((each) => each.call);
}

const theRefresh = 'GetTokensFromRefreshToken';

describe('the phone spends its refresh token when Emi opens', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetTheAppState();
    await herPhoneHolds(whenSheOpensIt, [aBleedingDay(dayOf(whenSheOpensIt))], 28);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the call that goes out', () => {
    it('spends the token she holds, once, and asks the pool for nothing else', async () => {
      const cognito = theCognitoSheReaches();
      await sheHasSignedInBefore();

      await sheOpensEmi();

      expect(theCalls(cognito.went)).toEqual([theRefresh]);
      expect(cognito.went[0]?.body.RefreshToken).toBe(theRefreshTokenItHandsBack);
    });

    it('does not go out at all on a phone that holds no sign in', async () => {
      const cognito = theCognitoSheReaches();

      await sheOpensEmi();

      expect(cognito.went).toEqual([]);
    });

    it('goes out once when the open and the foreground arrive together', async () => {
      const cognito = theCognitoSheReaches();
      await sheHasSignedInBefore();
      cognito.holdTheAnswers();

      await sheOpensEmi();
      await sheComesBackToEmi();
      cognito.letItAnswer();
      await sheOpensTheSettingsRow();

      expect(theCalls(cognito.went)).toEqual([theRefresh]);
    });
  });

  describe('the token the pool hands back', () => {
    it('replaces the one she held, and the way in, the address and the day stay as they were', async () => {
      const cognito = theCognitoSheReaches();
      cognito.rotateTheRefreshToken();
      await sheHasSignedInBefore();

      await sheOpensEmi();
      await sheOpensTheSettingsRow();

      expect(theSignInTheItemHolds()).toEqual({
        way: 'email',
        address: herAddress,
        since: theDaySheSignedIn,
        refreshToken: theRefreshTokenARefreshRotatesTo,
      });
    });

    it('leaves the token she held where it is when the pool hands back none', async () => {
      theCognitoSheReaches();
      await sheHasSignedInBefore();

      await sheOpensEmi();
      await sheOpensTheSettingsRow();

      expect(theSignInTheItemHolds().refreshToken).toBe(theRefreshTokenItHandsBack);
    });

    it('keeps a sign in that carries no address, which is how Telegram signs her in', async () => {
      const cognito = theCognitoSheReaches();
      cognito.rotateTheRefreshToken();
      await sheHasSignedInBefore({
        way: 'telegram',
        since: theDaySheSignedIn,
        refreshToken: theRefreshTokenItHandsBack,
      });

      await sheOpensEmi();
      await sheOpensTheSettingsRow();

      expect(theSignInTheItemHolds()).toEqual({
        way: 'telegram',
        since: theDaySheSignedIn,
        refreshToken: theRefreshTokenARefreshRotatesTo,
      });
    });
  });

  describe('the pool refusing the token', () => {
    it('leaves the Settings row with no second line, offering her the way in again', async () => {
      const cognito = theCognitoSheReaches();
      cognito.stopAcceptingTheRefreshToken();
      await sheHasSignedInBefore();

      await sheOpensEmi();
      await sheOpensTheSettingsRow();

      expect(textIn(screen.getByTestId(settingsAccountTestID))).toEqual([
        english['settings.settings.account'],
      ]);
      expect(screen.queryByTestId(rowValueTestID(settingsAccountTestID))).toBeNull();
    });

    it('leaves the row opening the way in rather than the account screen', async () => {
      const cognito = theCognitoSheReaches();
      cognito.stopAcceptingTheRefreshToken();
      await sheHasSignedInBefore();

      await sheOpensEmi();
      await sheOpensTheSettingsRow();
      await fireEvent.press(screen.getByTestId(settingsAccountTestID));

      expect(await screen.findByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(accountScreenTestID)).toBeNull();
    });

    it('leaves the phone holding nothing of the sign in', async () => {
      const cognito = theCognitoSheReaches();
      cognito.stopAcceptingTheRefreshToken();
      await sheHasSignedInBefore();

      await sheOpensEmi();
      await sheOpensTheSettingsRow();

      expect(itemsInTheKeychain()[theItemSheKeeps]).toBeUndefined();
    });
  });

  describe('a refresh that did not reach the pool', () => {
    it('keeps the sign in, and the row goes on naming the address she signed in with', async () => {
      const cognito = theCognitoSheReaches();
      cognito.loseTheConnection();
      await sheHasSignedInBefore();

      await sheOpensEmi();
      await sheOpensTheSettingsRow();

      expect(theSignInTheItemHolds().refreshToken).toBe(theRefreshTokenItHandsBack);
      expect(screen.getByTestId(rowValueTestID(settingsAccountTestID))).toHaveTextContent(
        herAddress,
      );
    });

    it('gives up on a pool that never answers, so the next foreground tries again', async () => {
      const cognito = theCognitoSheReaches();
      cognito.holdTheAnswers();
      await sheHasSignedInBefore();

      await sheOpensEmi();
      await theDeadlinePasses();
      await sheComesBackToEmi();

      expect(theCalls(cognito.went)).toEqual([theRefresh, theRefresh]);
      expect(theSignInTheItemHolds().refreshToken).toBe(theRefreshTokenItHandsBack);
    });
  });
});
