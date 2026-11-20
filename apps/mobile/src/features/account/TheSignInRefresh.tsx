import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { spendHerRefreshToken } from '../../services/signIn/theRefreshWhenSheOpens';
import { expoKeychain } from '../../services/vault/keychain';

/**
 * Draws nothing. It spends the refresh token when Emi opens and each time she comes back to it,
 * and the service it calls allows one refresh at a time, so the open and the first foreground
 * share one call.
 *
 * It is mounted above the screens rather than inside one, because a woman who never opens Settings
 * still has a token to spend, and the row she would read it on is the row that goes stale.
 */
export function TheSignInRefresh(): null {
  useEffect(() => {
    const refresh = (): void => {
      void spendHerRefreshToken(expoKeychain());
    };

    refresh();

    const onChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        refresh();
      }
    };

    const subscription = AppState.addEventListener('change', onChange);

    return () => subscription.remove();
  }, []);

  return null;
}
