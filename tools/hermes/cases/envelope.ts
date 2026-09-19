import {
  type DayRecord,
  openRecord,
  recordJson,
  readEnvelope,
  sealRecord,
  sealVaultKey,
  openBytes,
  envelopeVersion,
  keyLength,
  nonceLength,
} from '@emi/crypto';

import { bytesFromHex, check, hexFromBytes, refusedWith, sameBytes, sameValue } from '../harness';
import vectors from '../../../packages/crypto/tests/vectors.json';

/**
 * The frozen vectors of section 7.2, opened on the engine the phone runs. They hold a key, a
 * nonce, a record and the bytes those three give, so a case here proves the phone writes what the
 * service reads rather than proving the code agrees with itself.
 */
export function collectEnvelopeCases(): void {
  for (const vector of vectors.vectors) {
    const key = bytesFromHex(vector.keyHex);
    const nonce = bytesFromHex(vector.nonceHex);
    const record = vector.record as DayRecord;

    check(`seals ${vector.name} to the frozen bytes`, () => {
      const sealed = sealRecord(record, key, { random: () => nonce });

      sameValue(hexFromBytes(sealed), vector.envelopeHex, 'the envelope is the frozen envelope');
    });

    check(`opens ${vector.name} back to the day it was sealed from`, () => {
      const opened = openRecord(bytesFromHex(vector.envelopeHex), key);

      // Held to the canonical text the vector froze, not to what the record happens to give now,
      // so a reader that quietly drops a field cannot agree with itself.
      sameValue(
        recordJson(opened),
        vector.canonicalJson,
        'every field comes back in the shape it went in',
      );
    });
  }

  check('shows the service the version and the nonce and nothing else', () => {
    const first = vectors.vectors[0]!;
    const parts = readEnvelope(bytesFromHex(first.envelopeHex));

    sameValue(parts.version, envelopeVersion, 'the version byte reads back');
    sameValue(parts.nonce.length, nonceLength, 'the nonce is the whole nonce');
    sameBytes(parts.nonce, bytesFromHex(first.nonceHex), 'and it is the nonce it was sealed with');
  });

  check('seals a vault key and opens it again', () => {
    const vaultKey = new Uint8Array(keyLength).fill(0x2a);
    const under = new Uint8Array(keyLength).fill(0x11);
    const nonce = new Uint8Array(nonceLength).fill(0x33);

    const sealed = sealVaultKey(vaultKey, under, () => nonce);

    sameBytes(openBytes(sealed, under), vaultKey, 'the key comes back byte for byte');
  });

  /**
   * The refusal that reached a woman's phone. Without a random source the seal falls back to
   * `globalThis.crypto`, which Node has and this engine does not, so on Node this case cannot
   * exist at all.
   */
  check('refuses to seal with no random source, because this engine has no crypto', () => {
    const first = vectors.vectors[0]!;

    refusedWith(
      () => sealRecord(first.record as DayRecord, bytesFromHex(first.keyHex)),
      'random-source-is-missing',
      'a seal with nothing handed in has nothing to fall back to here',
    );
  });

  check('refuses a nonce of nothing but zeroes', () => {
    const first = vectors.vectors[0]!;

    refusedWith(
      () =>
        sealRecord(first.record as DayRecord, bytesFromHex(first.keyHex), {
          random: () => new Uint8Array(nonceLength),
        }),
      'nonce-is-all-zero',
      'a source that is not running returns zeroes',
    );
  });

  check('refuses an envelope whose bytes were changed after it was sealed', () => {
    const first = vectors.vectors[0]!;
    const changed = bytesFromHex(first.envelopeHex);
    changed[changed.length - 1] = (changed[changed.length - 1]! ^ 0xff) & 0xff;

    refusedWith(
      () => openRecord(changed, bytesFromHex(first.keyHex)),
      'envelope-is-not-authentic',
      'one changed bit fails the tag',
    );
  });

  check('refuses a key of the wrong length', () => {
    const first = vectors.vectors[0]!;

    refusedWith(
      () => openRecord(bytesFromHex(first.envelopeHex), new Uint8Array(16)),
      'key-is-the-wrong-length',
      'the cipher takes one key length',
    );
  });
}
