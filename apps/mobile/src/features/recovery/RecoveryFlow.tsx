import type { ReactNode } from 'react';
import { useState } from 'react';

import { ConfirmRecoveryCode } from './ConfirmRecoveryCode';
import { RecoveryScreen } from './RecoveryScreen';
import { ShowRecoveryCode } from './ShowRecoveryCode';
import { recoveryCopy } from './copy';

/**
 * The three screens in order: what the code is for, the code, and typing it back.
 *
 * The code is held for as long as she is on these screens and no longer. It is never written to
 * the database, never to the keychain and never to the server. What outlives this flow is the
 * instant she confirmed, and the wrapped key the server already holds.
 */
interface Props {
  readonly code: string;
  readonly opensTheVault: (typed: string) => boolean;
  readonly onConfirmed: () => void;
}

export function RecoveryFlow({ code, opensTheVault, onConfirmed }: Props): ReactNode {
  const [showing, setShowing] = useState<'before' | 'code' | 'confirm'>('before');

  if (showing === 'before') {
    return (
      <RecoveryScreen
        actionLabel={recoveryCopy.before.action}
        lines={recoveryCopy.before.lines}
        onAction={() => setShowing('code')}
        screen="before"
        title={recoveryCopy.before.title}
      />
    );
  }

  if (showing === 'code') {
    return <ShowRecoveryCode code={code} onContinue={() => setShowing('confirm')} />;
  }

  return <ConfirmRecoveryCode onConfirmed={onConfirmed} opensTheVault={opensTheVault} />;
}
