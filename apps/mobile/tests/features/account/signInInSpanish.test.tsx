import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  accountEmailCodeFieldTestID,
  accountEmailCodeLineTestID,
  accountEmailCodeScreenTestID,
  accountEmailCodeSignInTestID,
  accountEmailCodeTitleTestID,
} from '../../../src/features/account/AccountEmailCode';
import {
  accountGateAppleTestID,
  accountGateEmailTestID,
  accountGateSendCodeTestID,
  accountGateTitleTestID,
} from '../../../src/features/account/AccountGate';
import { SignInFlow } from '../../../src/features/account/SignInFlow';
import { theAppSignIn } from '../../../src/services/signIn/theAppSignIn';
import { expoKeychain } from '../../../src/services/vault/keychain';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aWrongCode, theCognitoSheReaches } from '../../fixtures/theCognitoSheReaches';
import { OnAPhone } from '../../fixtures/theSafeArea';

jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'es-ES' }]) }));

const theWrongCodeSentence = 'Ese código no es correcto. Compruébalo y escríbelo otra vez.';

describe('the sign in, in Spanish', () => {
  beforeEach(() => {
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('asks in Spanish, and says a wrong code is wrong in Spanish in place of the one line', async () => {
    theCognitoSheReaches();

    await render(
      <OnAPhone>
        <SignInFlow
          keychain={expoKeychain()}
          onSignedIn={() => undefined}
          signIn={theAppSignIn}
          today={() => '2026-11-13'}
        />
      </OnAPhone>,
    );

    expect(screen.getByTestId(accountGateTitleTestID)).toHaveTextContent('Entra en Emi');
    expect(screen.getByTestId(accountGateAppleTestID)).toHaveTextContent('Entrar con Apple');
    expect(screen.getByTestId(accountGateSendCodeTestID)).toHaveTextContent('Enviar código');

    await fireEvent.changeText(screen.getByTestId(accountGateEmailTestID), 'julia@example.com');
    await fireEvent.press(screen.getByTestId(accountGateSendCodeTestID));
    await screen.findByTestId(accountEmailCodeScreenTestID);

    expect(screen.getByTestId(accountEmailCodeTitleTestID)).toHaveTextContent(
      'Enviamos un código a julia@example.com.',
    );
    expect(screen.getByTestId(accountEmailCodeLineTestID)).toHaveTextContent(
      'El código sirve durante 15 minutos.',
    );

    await fireEvent.changeText(screen.getByTestId(accountEmailCodeFieldTestID), aWrongCode);
    await fireEvent.press(screen.getByTestId(accountEmailCodeSignInTestID));

    expect(await screen.findByText(theWrongCodeSentence)).toBeTruthy();
    expect(screen.getByTestId(accountEmailCodeLineTestID)).toHaveTextContent(theWrongCodeSentence);
    expect(screen.queryByText('El código sirve durante 15 minutos.')).toBeNull();
  });
});
