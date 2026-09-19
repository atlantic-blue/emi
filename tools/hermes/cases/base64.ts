import { Base64Error, base64Of, bytesFromBase64 } from '@emi/crypto';

import { check, isTrue, sameBytes, sameValue } from '../harness';

/**
 * Base 64 is written in the package rather than taken from a platform, because Node has `Buffer`
 * and a phone has neither that nor `atob`. This tier is where the second half of that sentence is
 * actually tested.
 */
export function collectBase64Cases(): void {
  check('writes bytes as base 64 the way the vectors expect', () => {
    sameValue(base64Of(new Uint8Array([0x4d, 0x61, 0x6e])), 'TWFu', 'three bytes need no padding');
    sameValue(base64Of(new Uint8Array([0x4d, 0x61])), 'TWE=', 'two bytes take one pad');
    sameValue(base64Of(new Uint8Array([0x4d])), 'TQ==', 'one byte takes two pads');
    sameValue(base64Of(new Uint8Array(0)), '', 'no bytes are no text');
  });

  check('reads base 64 back to the bytes it was written from', () => {
    const bytes = new Uint8Array(256);

    for (let at = 0; at < bytes.length; at += 1) {
      bytes[at] = at;
    }

    sameBytes(bytesFromBase64(base64Of(bytes)), bytes, 'every byte value survives the round trip');
  });

  check('refuses text that base 64 does not use', () => {
    let refused = false;

    try {
      bytesFromBase64('TW!u');
    } catch (thrown) {
      refused = thrown instanceof Base64Error;
    }

    isTrue(refused, 'a character outside the alphabet is refused rather than skipped');
  });
}
