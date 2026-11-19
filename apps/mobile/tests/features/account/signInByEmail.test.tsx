import { join } from 'node:path';

import { tabTestID } from '@emi/ui';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import {
  accountBackTestID,
  accountEmailTestID,
  accountScreenTestID,
  accountSinceTestID,
  accountTitleTestID,
  accountWayTestID,
} from '../../../src/features/account/Account';
import {
  accountEmailCodeBackTestID,
  accountEmailCodeFieldTestID,
  accountEmailCodeLineTestID,
  accountEmailCodeScreenTestID,
  accountEmailCodeSendANewCodeTestID,
  accountEmailCodeSignInTestID,
  accountEmailCodeTitleTestID,
  accountEmailCodeUseAnotherAddressTestID,
} from '../../../src/features/account/AccountEmailCode';
import {
  accountGateAppleTestID,
  accountGateEmailTestID,
  accountGateGoogleTestID,
  accountGateLineTestID,
  accountGateScreenTestID,
  accountGateSendCodeTestID,
  accountGateTelegramTestID,
  accountGateTitleTestID,
} from '../../../src/features/account/AccountGate';
import {
  settingsAccountTestID,
  settingsScreenTestID,
} from '../../../src/features/settings/SettingsScreen';
import { rowValueTestID } from '../../../src/components/SettingsRow';
import { english } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import {
  itemsInTheKeychain,
  resetExpoSecureStore,
  setItemAsync,
} from '../../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';
import {
  aWrongCode,
  theCognitoSheReaches,
  theRefreshTokenItHandsBack,
  theRightCode,
  theRightSignInCode,
} from '../../fixtures/theCognitoSheReaches';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheSignsIn = new Date('2026-11-13T12:00:00.000Z');

const herAddress = 'julia@example.com';

const theItemSheKeeps = 'emi.identityRefresh.v1';

async function sheOpensPrivacy(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await fireEvent.press(await screen.findByTestId(tabTestID('settings/index')));
}

/** Emi started cold on Privacy, which is how a test starts the application a second time. */
async function sheStartsEmiOnPrivacy(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/settings' });
  await screen.findByTestId(settingsScreenTestID);
}

async function sheOpensTheAccountRow(): Promise<void> {
  await sheOpensPrivacy();
  await fireEvent.press(screen.getByTestId(settingsAccountTestID));
}

async function sheAsksForACode(address: string = herAddress): Promise<void> {
  await fireEvent.changeText(screen.getByTestId(accountGateEmailTestID), address);
  await fireEvent.press(screen.getByTestId(accountGateSendCodeTestID));
}

async function sheTypesTheCode(code: string): Promise<void> {
  await fireEvent.changeText(screen.getByTestId(accountEmailCodeFieldTestID), code);
  await fireEvent.press(screen.getByTestId(accountEmailCodeSignInTestID));
}

async function sheSignsIn(): Promise<void> {
  await sheOpensTheAccountRow();
  await sheAsksForACode();
  await screen.findByTestId(accountEmailCodeScreenTestID);
  await sheTypesTheCode(theRightCode);
  await screen.findByTestId(accountScreenTestID);
}

function theCalls(went: readonly { readonly call: string }[]): string[] {
  return went.map((each) => each.call);
}

describe('she signs in to Emi with a code sent to her email', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheSignsIn);
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHolds(whenSheSignsIn, [aBleedingDay(dayOf(whenSheSignsIn))], 28);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('before she signs in', () => {
    it('shows the row with no second line, and the row opens Sign in to Emi', async () => {
      theCognitoSheReaches();
      await sheOpensPrivacy();

      expect(textIn(screen.getByTestId(settingsAccountTestID))).toEqual([
        english['settings.settings.account'],
      ]);
      expect(screen.queryByTestId(rowValueTestID(settingsAccountTestID))).toBeNull();

      await fireEvent.press(screen.getByTestId(settingsAccountTestID));

      expect(screen.getByTestId(accountGateTitleTestID)).toHaveTextContent(
        english['account.gate.title'],
      );
    });

    it('draws Apple, Google and Telegram, each with its words and each taking a press', async () => {
      const cognito = theCognitoSheReaches();
      await sheOpensTheAccountRow();

      for (const [testID, label] of [
        [accountGateAppleTestID, english['account.gate.apple']],
        [accountGateGoogleTestID, english['account.gate.google']],
        [accountGateTelegramTestID, english['account.gate.telegram']],
      ] as const) {
        const button = screen.getByTestId(testID);

        expect(button).toHaveTextContent(label);
        expect(button).not.toBeDisabled();
      }

      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(cognito.went).toEqual([]);
    });
  });

  describe('the code', () => {
    it('is sent to the address she typed, and the next screen names that address', async () => {
      const cognito = theCognitoSheReaches();
      await sheOpensTheAccountRow();
      await sheAsksForACode();

      expect(await screen.findByTestId(accountEmailCodeTitleTestID)).toHaveTextContent(
        `We sent a code to ${herAddress}.`,
      );
      expect(screen.getByTestId(accountEmailCodeLineTestID)).toHaveTextContent(
        english['account.code.lasts'],
      );
      expect(theCalls(cognito.went)).toEqual(['SignUp']);
      expect(cognito.went[0]?.body.UserAttributes).toEqual([{ Name: 'email', Value: herAddress }]);
    });

    it('is asked for once, however many times she presses while it is on its way', async () => {
      const cognito = theCognitoSheReaches();
      await sheOpensTheAccountRow();
      cognito.holdTheAnswers();
      await sheAsksForACode();
      await fireEvent.press(screen.getByTestId(accountGateSendCodeTestID));
      await fireEvent.press(screen.getByTestId(accountGateSendCodeTestID));
      cognito.letItAnswer();

      expect(await screen.findByTestId(accountEmailCodeScreenTestID)).toBeTruthy();
      expect(theCalls(cognito.went)).toEqual(['SignUp']);
    });

    it('is not asked for when the address is not an address, and the one line says why', async () => {
      const cognito = theCognitoSheReaches();
      await sheOpensTheAccountRow();
      await sheAsksForACode('julia at example');

      expect(screen.getByTestId(accountGateLineTestID)).toHaveTextContent(
        english['account.problem.addressIsNotValid'],
      );
      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(cognito.went).toEqual([]);
    });

    it('says the phone reached nobody when there is no connection, and stays on the screen', async () => {
      const cognito = theCognitoSheReaches();
      await sheOpensTheAccountRow();
      cognito.loseTheConnection();
      await sheAsksForACode();

      expect(await screen.findByTestId(accountGateLineTestID)).toHaveTextContent(
        english['account.problem.nothingReached'],
      );
      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
    });

    it('is sent again when she presses Send a new code', async () => {
      const cognito = theCognitoSheReaches();
      await sheOpensTheAccountRow();
      await sheAsksForACode();
      await screen.findByTestId(accountEmailCodeScreenTestID);
      await fireEvent.press(screen.getByTestId(accountEmailCodeSendANewCodeTestID));

      expect(theCalls(cognito.went)).toEqual(['SignUp', 'SignUp']);
      expect(screen.getByTestId(accountEmailCodeTitleTestID)).toHaveTextContent(
        `We sent a code to ${herAddress}.`,
      );
    });

    it('goes back to the address when she presses Use another address', async () => {
      theCognitoSheReaches();
      await sheOpensTheAccountRow();
      await sheAsksForACode();
      await screen.findByTestId(accountEmailCodeScreenTestID);
      await fireEvent.press(screen.getByTestId(accountEmailCodeUseAnotherAddressTestID));

      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(accountEmailCodeScreenTestID)).toBeNull();
    });

    it('goes back to the address from the chevron too', async () => {
      theCognitoSheReaches();
      await sheOpensTheAccountRow();
      await sheAsksForACode();
      await screen.findByTestId(accountEmailCodeScreenTestID);
      await fireEvent.press(screen.getByTestId(accountEmailCodeBackTestID));

      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
    });
  });

  describe('a wrong code', () => {
    it('replaces the one line with what went wrong, and leaves her on the code', async () => {
      const cognito = theCognitoSheReaches();
      await sheOpensTheAccountRow();
      await sheAsksForACode();
      await screen.findByTestId(accountEmailCodeScreenTestID);
      await sheTypesTheCode(aWrongCode);

      expect(await screen.findByText(english['account.problem.codeIsWrong'])).toBeTruthy();
      expect(screen.getByTestId(accountEmailCodeLineTestID)).toHaveTextContent(
        english['account.problem.codeIsWrong'],
      );
      expect(screen.queryByText(english['account.code.lasts'])).toBeNull();
      expect(screen.getByTestId(accountEmailCodeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(accountScreenTestID)).toBeNull();
      expect(theCalls(cognito.went)).toEqual(['SignUp', 'ConfirmSignUp']);
      expect(itemsInTheKeychain()[theItemSheKeeps]).toBeUndefined();
    });

    it('asks her for the code without calling the service when the box is short', async () => {
      const cognito = theCognitoSheReaches();
      await sheOpensTheAccountRow();
      await sheAsksForACode();
      await screen.findByTestId(accountEmailCodeScreenTestID);
      await sheTypesTheCode('48');

      expect(screen.getByTestId(accountEmailCodeLineTestID)).toHaveTextContent(
        english['account.problem.needsTheCode'],
      );
      expect(theCalls(cognito.went)).toEqual(['SignUp']);
    });
  });

  describe('the right code', () => {
    it('lands on Emi on another phone, with the way, her address and the day', async () => {
      theCognitoSheReaches();
      await sheSignsIn();

      expect(screen.getByTestId(accountTitleTestID)).toHaveTextContent(
        english['account.account.title'],
      );
      expect(textIn(screen.getByTestId(accountWayTestID))).toEqual([
        english['account.account.signedInWith'],
        english['account.way.email'],
      ]);
      expect(textIn(screen.getByTestId(accountEmailTestID))).toEqual([
        english['account.account.email'],
        herAddress,
      ]);
      expect(textIn(screen.getByTestId(accountSinceTestID))).toEqual([
        english['account.account.since'],
        '13 November 2026',
      ]);
    });

    it('keeps the refresh token in the keychain under its own item, with her address and the day', async () => {
      theCognitoSheReaches();
      await sheSignsIn();

      expect(JSON.parse(itemsInTheKeychain()[theItemSheKeeps] ?? '{}')).toEqual({
        way: 'email',
        address: herAddress,
        since: '2026-11-13',
        refreshToken: theRefreshTokenItHandsBack,
      });
    });

    it('shows her address under the row of Privacy once she goes back', async () => {
      theCognitoSheReaches();
      await sheSignsIn();
      await fireEvent.press(screen.getByTestId(accountBackTestID));

      expect(screen.getByTestId(settingsScreenTestID)).toBeTruthy();
      expect(await screen.findByTestId(rowValueTestID(settingsAccountTestID))).toHaveTextContent(
        herAddress,
      );
    });

    it('opens the account rather than the sign in from the row once she is signed in', async () => {
      theCognitoSheReaches();
      await sheSignsIn();
      await fireEvent.press(screen.getByTestId(accountBackTestID));
      await screen.findByTestId(rowValueTestID(settingsAccountTestID));
      await fireEvent.press(screen.getByTestId(settingsAccountTestID));

      expect(await screen.findByTestId(accountScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(accountGateScreenTestID)).toBeNull();
    });

    it('is still signed in after the application starts again, read from the keychain', async () => {
      theCognitoSheReaches();
      await sheSignsIn();
      await screen.unmount();

      await sheStartsEmiOnPrivacy();

      expect(await screen.findByTestId(rowValueTestID(settingsAccountTestID))).toHaveTextContent(
        herAddress,
      );

      await fireEvent.press(screen.getByTestId(settingsAccountTestID));

      expect(textIn(await screen.findByTestId(accountEmailTestID))).toEqual([
        english['account.account.email'],
        herAddress,
      ]);
    });
  });

  describe('an address that already has an account', () => {
    it('is sent the sign in code, and the one line says to type the newest code', async () => {
      const cognito = theCognitoSheReaches();
      cognito.holdAnAccountForTheAddress();
      await sheOpensTheAccountRow();
      await sheAsksForACode();
      await screen.findByTestId(accountEmailCodeScreenTestID);
      await sheTypesTheCode(theRightCode);

      expect(await screen.findByText(english['account.code.anotherCodeIsOnItsWay'])).toBeTruthy();
      expect(screen.getByTestId(accountEmailCodeFieldTestID).props.maxLength).toBe(8);
      expect(theCalls(cognito.went)).toEqual(['SignUp', 'ConfirmSignUp', 'InitiateAuth']);

      await sheTypesTheCode(theRightSignInCode);

      expect(textIn(await screen.findByTestId(accountEmailTestID))).toEqual([
        english['account.account.email'],
        herAddress,
      ]);
    });
  });

  describe('a keychain item this version cannot read', () => {
    it('reads as no sign in, so the row opens the way in again', async () => {
      theCognitoSheReaches();
      await setItemAsync(theItemSheKeeps, 'something this phone kept');
      await sheStartsEmiOnPrivacy();
      await fireEvent.press(screen.getByTestId(settingsAccountTestID));

      expect(screen.queryByTestId(rowValueTestID(settingsAccountTestID))).toBeNull();
      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
    });
  });
});
