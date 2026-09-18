import type { ReactNode } from 'react';

import type { SecureStore } from '../../services/vault/keychain';
import { writeRecoveryConfirmed } from '../../services/vault/recoveryConfirmed';
import { type Recovery, recoveryCodeOpens } from '../../services/vault/wrapKey';

import { RecoveryFlow } from './RecoveryFlow';

/**
 * The three screens bound to this phone: her recovery opens her vault, and the instant she
 * confirms reaches the keychain.
 *
 * The recovery arrives as a prop and is never made here. It is made once, when the account is
 * registered, because the server holds the wrapped key from that one moment. A screen that drew a
 * fresh code each time it opened would hand her a code the server cannot match, and the paper she
 * wrote the first one on would be worth nothing.
 */
interface Props {
  readonly recovery: Recovery;
  readonly store: SecureStore;
  readonly now: () => Date;
  readonly onDone: () => void;
}

export function RecoverySetup({ recovery, store, now, onDone }: Props): ReactNode {
  return (
    <RecoveryFlow
      code={recovery.code}
      onConfirmed={() => {
        void writeRecoveryConfirmed(store, now()).then(onDone);
      }}
      opensTheVault={(typed) => recoveryCodeOpens(typed, recovery)}
    />
  );
}
