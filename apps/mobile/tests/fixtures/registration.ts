import { base64Of } from '@emi/crypto';

import { makeRecovery, type Recovery } from '../../src/services/vault/wrapKey';

import { fixedRandom } from './secureStore';

/**
 * The registration body the phone writes: her public key, her vault key wrapped under her recovery
 * code, and the salt that code was derived with. Contract WIRE-1 asks for all three, so a test
 * that writes the body by hand is a test that drifts from the handler the day the body changes.
 *
 * The recovery is made once per key, because Argon2id costs about a tenth of a second by design
 * and a suite that registered forty times would spend four seconds deriving keys nobody reads.
 */
const made = new Map<string, Recovery>();

export function recoveryFor(publicKey: Uint8Array): Recovery {
  const at = base64Of(publicKey);
  const held = made.get(at);

  if (held !== undefined) {
    return held;
  }

  const recovery = makeRecovery(
    new Uint8Array(32).map((_, byte) => ((publicKey[0] ?? 1) + byte * 7) % 255 || 1),
    fixedRandom((publicKey[1] ?? 2) % 200),
  );
  made.set(at, recovery);

  return recovery;
}

export function registrationBodyFor(publicKey: Uint8Array): string {
  const recovery = recoveryFor(publicKey);

  return JSON.stringify({
    publicKey: base64Of(publicKey),
    wrappedVaultKey: base64Of(recovery.wrappedVaultKey),
    recoverySalt: base64Of(recovery.salt),
  });
}
