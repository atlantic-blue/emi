import * as localAuthentication from 'expo-local-authentication';

import { lockCopy } from './copy';

/**
 * The device lock, as the two questions Emi asks of it. Emi never learns which finger, which face
 * or which passcode: it asks whether this phone can hold somebody out, and then asks it to.
 */
export interface DeviceLock {
  /** Whether the phone has anything enrolled to ask for. */
  canAsk(): Promise<boolean>;
  ask(): Promise<LockAnswer>;
}

export type LockAnswer = 'unlocked' | 'refused';

/**
 * The enrolled level, and not whether a fingerprint reader exists. A phone with a passcode and no
 * reader can still hold a stranger out, and a phone with a reader nobody enrolled cannot. Asking
 * the wrong one of those two questions locks a woman out of her own history with no way back in.
 */
export function phoneLock(): DeviceLock {
  return {
    canAsk: async () =>
      (await localAuthentication.getEnrolledLevelAsync()) !==
      localAuthentication.SecurityLevel.NONE,
    ask: async () => {
      // The device fallback is left on, so several failed faces reach the passcode rather than a
      // locked out phone.
      const answer = await localAuthentication.authenticateAsync({
        promptMessage: lockCopy.prompt,
        cancelLabel: lockCopy.cancel,
        disableDeviceFallback: false,
      });

      return answer.success ? 'unlocked' : 'refused';
    },
  };
}
