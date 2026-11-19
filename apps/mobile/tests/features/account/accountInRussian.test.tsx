import { render, screen } from '@testing-library/react-native';

import {
  Account,
  accountSinceTestID,
  accountTitleTestID,
  accountWayTestID,
} from '../../../src/features/account/Account';
import { textIn } from '../../fixtures/renderedText';
import { OnAPhone } from '../../fixtures/theSafeArea';

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
});
