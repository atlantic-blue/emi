import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  Account,
  accountEmailTestID,
  accountSinceTestID,
  accountTitleTestID,
  accountWayTestID,
} from '../../../src/features/account/Account';
import {
  accountGateGoogleTestID,
  accountGateLineTestID,
} from '../../../src/features/account/AccountGate';
import { SignInFlow } from '../../../src/features/account/SignInFlow';
import { theAppSignIn } from '../../../src/services/signIn/theAppSignIn';
import { expoKeychain } from '../../../src/services/vault/keychain';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import {
  openAuthSessionAsync,
  resetExpoWebBrowser,
  theSessionEnds,
} from '../../fixtures/expoWebBrowser';
import { russian } from '../../../src/language/russian';
import { textIn } from '../../fixtures/renderedText';
import { theProviderSignInSheReaches } from '../../fixtures/theProviderSignInSheReaches';
import { OnAPhone } from '../../fixtures/theSafeArea';

jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'ru-RU' }]) }));

describe('the account, in Russian', () => {
  it('names the way, and writes the day the way Emi writes a date in Russian', async () => {
    await render(
      <OnAPhone>
        <Account
          onBack={() => undefined}
          signIn={{ way: 'email', address: 'julia@example.com', since: '2026-11-13' }}
        />
      </OnAPhone>,
    );

    expect(screen.getByTestId(accountTitleTestID)).toHaveTextContent('Emi на другом телефоне');
    expect(textIn(screen.getByTestId(accountWayTestID))).toEqual(['Вход через', 'Почта']);
    expect(textIn(screen.getByTestId(accountSinceTestID))).toEqual([
      'Дата входа',
      '13 ноября 2026',
    ]);
  });

  it('names Google, and shows the address Google gave', async () => {
    await render(
      <OnAPhone>
        <Account
          onBack={() => undefined}
          signIn={{ way: 'google', address: 'julia@example.com', since: '2026-11-13' }}
        />
      </OnAPhone>,
    );

    expect(textIn(screen.getByTestId(accountWayTestID))).toEqual([
      'Вход через',
      russian['account.way.google'],
    ]);
    expect(textIn(screen.getByTestId(accountEmailTestID))[1]).toBe('julia@example.com');
  });

  it('says in Russian that a sign in with Google did not finish', async () => {
    resetExpoSecureStore();
    resetExpoWebBrowser();
    const pool = theProviderSignInSheReaches();
    theSessionEnds((address) =>
      Promise.resolve({
        type: 'success',
        url: `emi://sign-in/returning?error=access_denied&state=${
          new URL(address).searchParams.get('state') ?? ''
        }`,
      }),
    );

    await render(
      <OnAPhone>
        <SignInFlow
          keychain={expoKeychain()}
          onSignedIn={() => undefined}
          openTheSession={openAuthSessionAsync}
          signIn={theAppSignIn}
          today={() => '2026-11-13'}
        />
      </OnAPhone>,
    );

    await fireEvent.press(screen.getByTestId(accountGateGoogleTestID));

    expect(await screen.findByTestId(accountGateLineTestID)).toHaveTextContent(
      'Этот вход не завершился. Нажмите «Войти через Google» и попробуйте снова.',
    );
    expect(pool.went).toEqual([]);
    jest.restoreAllMocks();
  });
});
