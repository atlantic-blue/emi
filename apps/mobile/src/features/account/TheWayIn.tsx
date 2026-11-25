import { openAuthSessionAsync } from 'expo-web-browser';
import { type ReactNode, useMemo } from 'react';

import { localDay } from '../onboarding/days';
import { theAppSignIn } from '../../services/signIn/theAppSignIn';
import { expoKeychain } from '../../services/vault/keychain';
import { SignInFlow } from './SignInFlow';

/**
 * The sign in, bound to this phone: the keychain it keeps her token in, the service it asks for a
 * code, and the browser session Apple, Google and Telegram answer in.
 *
 * Settings reaches it and so does the first run, and the two differ only in where she goes
 * afterwards. A second copy of this binding would let one of them sign her in against a different
 * keychain item.
 */
export function TheWayIn({ onSignedIn }: { readonly onSignedIn: () => void }): ReactNode {
  const keychain = useMemo(() => expoKeychain(), []);

  return (
    <SignInFlow
      keychain={keychain}
      onSignedIn={onSignedIn}
      openTheSession={openAuthSessionAsync}
      signIn={theAppSignIn}
      today={() => localDay(new Date())}
    />
  );
}
