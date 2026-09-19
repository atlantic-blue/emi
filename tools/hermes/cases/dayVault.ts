import { type DayRecord, type RandomSource, keyLength, nonceLength, recordJson } from '@emi/crypto';

import { dayVault } from '../../../apps/mobile/src/services/vault/dayVault';
import { check, isTrue, sameValue } from '../harness';

/**
 * The vault the application seals every day through. `expo-crypto` is a native module and cannot
 * load on a bare engine, so the source here is the deterministic one a test uses. What is being
 * proved is that the vault asks for a source at all: a vault that seals without one works on Node
 * and refuses on her phone, which is how a crash reached a woman who had just finished the first
 * run.
 */
export function collectDayVaultCases(): void {
  const key = new Uint8Array(keyLength).fill(0x5c);

  /** Counts up, so two seals in one test never draw the same nonce. */
  function countingRandom(): RandomSource {
    let drawn = 0;

    return (byteCount: number) => {
      drawn += 1;

      return new Uint8Array(byteCount).fill(drawn);
    };
  }

  const her: DayRecord = {
    day: '2026-03-14',
    flow: 'medium',
    energy: 3,
    note: 'the first day she logged',
    recordedAt: '2026-03-14T21:05:00.000Z',
  };

  check('seals her day and opens it back on this engine', () => {
    const vault = dayVault(key, countingRandom());
    const opened = vault.open(vault.seal(her));

    // The canonical text on both sides, because a record comes back with its keys sorted and the
    // order she wrote them in is not part of what she wrote.
    sameValue(recordJson(opened), recordJson(her), 'her day survives the round trip');
  });

  check('draws a new nonce for every day she writes', () => {
    const vault = dayVault(key, countingRandom());

    const first = vault.seal(her);
    const second = vault.seal({ ...her, note: 'the second day' });

    isTrue(
      first.slice(1, 1 + nonceLength).join(',') !== second.slice(1, 1 + nonceLength).join(','),
      'one key seals every day, and only a fresh nonce makes that safe',
    );
  });

  check('takes the nonce from the source it was handed and from nothing else', () => {
    const nonce = new Uint8Array(nonceLength).fill(0x77);
    const sealed = dayVault(key, () => nonce).seal(her);

    sameValue(
      Array.from(sealed.slice(1, 1 + nonceLength)).join(','),
      Array.from(nonce).join(','),
      'the source reaches the envelope',
    );
  });

  check('opens nothing that was sealed under another key', () => {
    const sealed = dayVault(key, countingRandom()).seal(her);
    let refused = '';

    try {
      dayVault(new Uint8Array(keyLength).fill(0x11), countingRandom()).open(sealed);
    } catch (thrown) {
      refused = (thrown as { refusal?: string }).refusal ?? '';
    }

    sameValue(refused, 'envelope-is-not-authentic', 'her key is the only key that opens her day');
  });
}
